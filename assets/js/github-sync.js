/* ============================================================
   GITHUB-SYNC.JS — Agency Hub v2.1
   Motore di sincronizzazione con GitHub API

   Come funziona:
   - Tutti i dati vengono salvati come file JSON nella cartella
     /data/ della tua repository GitHub.
   - Ad ogni salvataggio (syncSave) il file viene aggiornato su
     GitHub tramite API REST (PUT /contents).
   - All'avvio di ogni pagina viene fatto un pullAll() che
     scarica i dati più recenti da GitHub e li scrive nel
     localStorage, così hai sempre i dati sincronizzati anche
     cambiando device o browser.
   - Il token GitHub viene salvato solo nel localStorage del
     tuo browser e non viene mai inviato a server terzi.
   ============================================================ */

var GitHubSync = (function() {

  // ── CONFIG ─────────────────────────────────────────────
  var API_BASE = 'https://api.github.com';

  function getConfig() {
    return store.get('hub_github', {});
  }

  function isConfigured() {
    var cfg = getConfig();
    return !!(cfg.token && cfg.repo);
  }

  function getHeaders() {
    var cfg = getConfig();
    return {
      'Authorization': 'token ' + cfg.token,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };
  }

  function getBranch() {
    return getConfig().branch || 'main';
  }

  // ── BASE64 UTF-8 SAFE ──────────────────────────────────
  // FIX: unescape() è deprecato — usiamo TextEncoder per UTF-8 corretto
  function toBase64(str) {
    var bytes = new TextEncoder().encode(str);
    var binary = '';
    for (var i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function fromBase64(b64) {
    var binary = atob(b64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }

  // ── STATUS UI ──────────────────────────────────────────
  function setSyncStatus(type, msg) {
    // type: 'syncing' | 'ok' | 'err' | 'idle'
    var indicators = document.querySelectorAll('.sync-indicator');
    indicators.forEach(function(el) {
      el.className = 'sync-indicator sync-' + type;
      el.title = msg || '';
    });
    var ghLbl = document.getElementById('sb-gh-status');
    if (ghLbl) ghLbl.textContent = msg || '';

    if (type === 'ok') {
      store.set('hub_last_sync', new Date().toISOString());
    }
  }

  function getLastSync() {
    var t = store.get('hub_last_sync', null);
    if (!t) return 'Mai sincronizzato';
    var d = new Date(t);
    return d.toLocaleTimeString('it', { hour: '2-digit', minute: '2-digit' }) +
           ' \u00b7 ' + d.toLocaleDateString('it', { day: '2-digit', month: '2-digit' });
  }

  // ── GET FILE (with SHA) ────────────────────────────────
  async function getFile(path) {
    var cfg = getConfig();
    var url = API_BASE + '/repos/' + cfg.repo + '/contents/' + path + '?ref=' + getBranch();
    var res = await fetch(url, { headers: getHeaders() });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('GitHub GET ' + path + ': ' + res.status);
    return await res.json(); // { sha, content, encoding, ... }
  }

  // ── PUT FILE ───────────────────────────────────────────
  async function putFile(path, content, message, sha) {
    var cfg = getConfig();
    var url = API_BASE + '/repos/' + cfg.repo + '/contents/' + path;

    var body = {
      message: message || ('Agency Hub: update ' + path),
      content: toBase64(content),
      branch:  getBranch(),
    };
    if (sha) body.sha = sha;

    var res = await fetch(url, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      var err = await res.json().catch(function() { return {}; });
      throw new Error(err.message || ('GitHub PUT ' + path + ': ' + res.status));
    }
    return await res.json();
  }

  // ── WRITE JSON DATA ────────────────────────────────────
  async function writeData(key, data) {
    if (!isConfigured()) return;

    var path    = 'data/' + key + '.json';
    var content = JSON.stringify(data, null, 2);

    try {
      var existing = await getFile(path);
      var sha = existing ? existing.sha : null;
      await putFile(path, content, 'Hub: save ' + key, sha);
    } catch(e) {
      console.error('GitHubSync.writeData(' + key + '):', e.message);
      throw e;
    }
  }

  // ── READ JSON DATA ─────────────────────────────────────
  async function readData(key) {
    if (!isConfigured()) return null;

    var path = 'data/' + key + '.json';
    try {
      var file = await getFile(path);
      if (!file) return null;
      // GitHub restituisce il contenuto in base64 con a capo ogni 60 chars
      var decoded = fromBase64(file.content.replace(/\n/g, ''));
      return JSON.parse(decoded);
    } catch(e) {
      console.error('GitHubSync.readData(' + key + '):', e.message);
      return null;
    }
  }

  // ── UPLOAD BINARY/TEXT FILE ────────────────────────────
  // Per i file delle skill: li carica in /data/files/
  async function uploadFile(filename, content, isBase64) {
    if (!isConfigured()) return null;

    // Limite GitHub API: 25MB per file
    var MAX_BYTES = 25 * 1024 * 1024;
    var estimatedSize = isBase64
      ? Math.ceil((content.length - (content.indexOf(',') + 1)) * 0.75)
      : new Blob([content]).size;

    if (estimatedSize > MAX_BYTES) {
      throw new Error('File troppo grande per GitHub (' + (estimatedSize/1024/1024).toFixed(1) + 'MB — limite 25MB)');
    }

    // Sanifica il nome file
    var safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    var path = 'data/files/' + safeName;

    try {
      var existing = await getFile(path);
      var sha = existing ? existing.sha : null;

      var cfg = getConfig();
      var url = API_BASE + '/repos/' + cfg.repo + '/contents/' + path;

      // Se già base64 (da FileReader.readAsDataURL), rimuovi il prefisso data:
      var b64content = isBase64
        ? (content.split(',')[1] || content)
        : toBase64(content);

      var body = {
        message: 'Hub: upload file ' + safeName,
        content: b64content,
        branch:  getBranch(),
      };
      if (sha) body.sha = sha;

      var res = await fetch(url, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        var err = await res.json().catch(function() { return {}; });
        throw new Error(err.message || ('Upload ' + path + ': ' + res.status));
      }

      var result = await res.json();
      return result.content.download_url;
    } catch(e) {
      console.error('GitHubSync.uploadFile(' + filename + '):', e.message);
      throw e;
    }
  }

  // ── GET FILE DOWNLOAD URL ──────────────────────────────
  function getFileUrl(filename) {
    var cfg = getConfig();
    if (!cfg.repo) return null;
    var safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    var branch = getBranch();
    return 'https://raw.githubusercontent.com/' + cfg.repo + '/' + branch + '/data/files/' + safeName;
  }

  // ── PULL ALL DATA (on startup) ─────────────────────────
  async function pullAll() {
    if (!isConfigured()) return false;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncStatus('idle', 'Offline — usando dati locali');
      return false;
    }

    setSyncStatus('syncing', 'Sincronizzazione in corso\u2026');

    var KEYS = ['hub_progetti','hub_interventi','hub_skills','hub_archivio','hub_roadmap','hub_stats','hub_activity'];

    var synced = 0;
    var errors = [];

    for (var i = 0; i < KEYS.length; i++) {
      var key = KEYS[i];
      try {
        var remoteData = await readData(key);
        if (remoteData !== null) {
          store.set(key, remoteData);
          synced++;
        }
      } catch(e) {
        errors.push(key);
      }
    }

    if (errors.length === 0) {
      setSyncStatus('ok', 'Sincronizzato \u00b7 ' + getLastSync());
      return true;
    } else {
      setSyncStatus('err', 'Errori su: ' + errors.join(', '));
      return false;
    }
  }

  // ── PUSH SINGLE KEY (on save) ──────────────────────────
  async function pushKey(key) {
    if (!isConfigured()) return false;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncStatus('idle', 'Offline — dati salvati in locale');
      return false;
    }

    setSyncStatus('syncing', 'Salvataggio in corso\u2026');

    try {
      var data = store.get(key, key.startsWith('hub_') ? [] : {});
      await writeData(key, data);
      setSyncStatus('ok', 'Salvato \u00b7 ' + getLastSync());
      return true;
    } catch(e) {
      setSyncStatus('err', 'Errore sync: ' + e.message);
      toast('Errore sincronizzazione GitHub: ' + e.message, 'err');
      return false;
    }
  }

  // ── PUSH ALL (manual full sync) ────────────────────────
  async function pushAll() {
    if (!isConfigured()) return false;

    setSyncStatus('syncing', 'Push completo\u2026');
    toast('Sincronizzazione completa in corso\u2026', 'info');

    var KEYS = ['hub_progetti','hub_interventi','hub_skills','hub_archivio','hub_roadmap','hub_stats','hub_activity'];
    var errors = [];

    for (var i = 0; i < KEYS.length; i++) {
      var key = KEYS[i];
      try {
        var data = store.get(key, []);
        if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
          await writeData(key, data);
        }
      } catch(e) {
        errors.push(key);
      }
    }

    if (errors.length === 0) {
      setSyncStatus('ok', 'Sync completo \u00b7 ' + getLastSync());
      toast('Sincronizzazione completata!', 'ok');
      return true;
    } else {
      setSyncStatus('err', 'Errori: ' + errors.join(', '));
      toast('Sync parziale — errori su: ' + errors.join(', '), 'err');
      return false;
    }
  }

  // ── TEST CONNECTION ────────────────────────────────────
  async function testConnection() {
    var cfg = getConfig();
    if (!cfg.token || !cfg.repo) {
      throw new Error('Token e repository non configurati');
    }

    var res = await fetch(API_BASE + '/repos/' + cfg.repo, {
      headers: getHeaders(),
    });

    if (!res.ok) {
      var err = await res.json().catch(function() { return {}; });
      throw new Error(err.message || ('Errore ' + res.status));
    }

    var data = await res.json();
    return {
      name:    data.full_name,
      private: data.private,
      branch:  getBranch(),
    };
  }

  // ── INIT DATA FOLDER ──────────────────────────────────
  // Crea data/.gitkeep se la cartella data/ non esiste ancora
  async function initDataFolder() {
    if (!isConfigured()) return;
    try {
      var existing = await getFile('data/.gitkeep');
      if (!existing) {
        await putFile('data/.gitkeep', '# Agency Hub data folder\n', 'Hub: init data folder');
      }
    } catch(e) {
      console.warn('Could not init data folder:', e.message);
    }
  }

  // ── PUBLIC API ─────────────────────────────────────────
  return {
    isConfigured:   isConfigured,
    pullAll:        pullAll,
    pushKey:        pushKey,
    pushAll:        pushAll,
    uploadFile:     uploadFile,
    getFileUrl:     getFileUrl,
    testConnection: testConnection,
    initDataFolder: initDataFolder,
    getLastSync:    getLastSync,
    setSyncStatus:  setSyncStatus,
  };

})();
