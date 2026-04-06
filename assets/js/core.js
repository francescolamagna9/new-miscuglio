/* ============================================================
   CORE.JS — Agency Hub v2.1
   Navigazione shell, sidebar, utils condivisi
   ============================================================ */

'use strict';

// ── SIDEBAR ───────────────────────────────────────────────
function sidebarToggle() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('open');
}
function sidebarClose() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}

// ── MODAL ─────────────────────────────────────────────────
function modalOpen(id)  {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}
function modalClose(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// ── TOAST ─────────────────────────────────────────────────
function toast(msg, type = 'ok', duration = 2800) {
  const colors = {
    ok:   { bg: 'rgba(16,185,129,0.13)',  border: 'rgba(16,185,129,0.28)',  icon: '✓' },
    err:  { bg: 'rgba(239,68,68,0.13)',   border: 'rgba(239,68,68,0.28)',   icon: '✕' },
    info: { bg: 'rgba(59,130,246,0.13)',  border: 'rgba(59,130,246,0.28)',  icon: 'ℹ' },
  };
  const c = colors[type] || colors.ok;
  const t = document.createElement('div');
  t.style.cssText = `
    position:fixed; bottom:80px; right:20px; z-index:9999;
    background:${c.bg}; border:1px solid ${c.border};
    backdrop-filter:blur(16px);
    color:#f1f5f9; font-size:13px; font-weight:500;
    padding:11px 16px; border-radius:10px;
    display:flex; align-items:center; gap:8px;
    box-shadow:0 6px 28px rgba(0,0,0,0.38);
    animation:toastIn .22s ease both;
    max-width:300px; line-height:1.4;
    font-family:'Inter',system-ui,sans-serif;
  `;
  t.innerHTML = '<span style="font-size:14px">' + c.icon + '</span>' + msg;
  if (!document.getElementById('toast-style')) {
    const s = document.createElement('style');
    s.id = 'toast-style';
    s.textContent = '@keyframes toastIn  { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:none } } @keyframes toastOut { from { opacity:1 } to { opacity:0; transform:translateY(6px) } }';
    document.head.appendChild(s);
  }
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'toastOut .22s ease forwards';
    setTimeout(() => t.remove(), 240);
  }, duration);
}

// ── COPY ──────────────────────────────────────────────────
function copyText(text, label) {
  label = label || '';
  navigator.clipboard.writeText(text).then(function() {
    toast((label ? label + ' ' : '') + 'copiato!', 'ok');
  }).catch(function() { toast('Copia fallita', 'err'); });
}

// ── ESC HTML ──────────────────────────────────────────────
function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── DOWNLOAD FILE ─────────────────────────────────────────
// FIX: revoca l'object URL dopo 60s per evitare memory leak
function downloadFile(filename, content, type) {
  type = type || 'text/plain';
  var url = URL.createObjectURL(new Blob([content], { type: type }));
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(function() { URL.revokeObjectURL(url); }, 60000);
}

// ── DEBOUNCE ──────────────────────────────────────────────
function debounce(fn, delay) {
  delay = delay || 250;
  var t;
  return function() {
    var args = arguments;
    clearTimeout(t);
    t = setTimeout(function() { fn.apply(null, args); }, delay);
  };
}

// ── LOCAL STORAGE HELPERS ─────────────────────────────────
var store = {
  get: function(k, def) {
    if (def === undefined) def = null;
    try { var v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : def; } catch(e) { return def; }
  },
  set: function(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) { console.warn('store.set failed:', k, e); }
  },
  remove: function(k) {
    try { localStorage.removeItem(k); } catch(e) {}
  },
};

// ── HUB STATS ─────────────────────────────────────────────
function hubStatIncrement(key) {
  var cur = store.get('hub_stats', {});
  cur[key] = (cur[key] || 0) + 1;
  store.set('hub_stats', cur);
}
function hubStatGet(key) {
  return store.get('hub_stats', {})[key] || 0;
}

// ── SYNC-AWARE SAVE ───────────────────────────────────────
async function syncSave(key, data) {
  store.set(key, data);
  if (typeof GitHubSync !== 'undefined' && GitHubSync.isConfigured()) {
    try {
      await GitHubSync.pushKey(key);
    } catch(e) {
      console.warn('Sync error (local save OK):', e.message);
    }
  }
}

// ── ACTIVITY LOG ──────────────────────────────────────────
function logActivity(icon, text) {
  var acts = store.get('hub_activity', []);
  acts.unshift({
    icon: icon,
    text: text,
    time: new Date().toLocaleTimeString('it', { hour: '2-digit', minute: '2-digit' })
  });
  store.set('hub_activity', acts.slice(0, 20));
}

// ── SIDEBAR BADGES (centralizzato) ────────────────────────
function updateSidebarBadges() {
  var progettiAttivi   = store.get('hub_progetti', []).filter(function(p) { return p.status !== 'completato'; }).length;
  var interventiAperti = store.get('hub_interventi', []).filter(function(i) { return i.status !== 'done'; }).length;
  var skills           = store.get('hub_skills', []).length;
  var archivio         = store.get('hub_archivio', []).length;

  function setEl(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
  setEl('sb-badge-progetti',   progettiAttivi);
  setEl('sb-badge-interventi', interventiAperti);
  setEl('sb-badge-skills',     skills);
  setEl('sb-badge-archivio',   archivio);

  var hasGroq = !!store.get('hub_groq_key', '');
  var dot = document.getElementById('sb-api-dot');
  var lbl = document.getElementById('sb-api-label');
  if (dot) dot.classList.toggle('off', !hasGroq);
  if (lbl) lbl.textContent = hasGroq ? 'Groq API configurata' : 'API Key non configurata';

  var ind = document.getElementById('sync-indicator');
  if (ind && typeof GitHubSync !== 'undefined' && GitHubSync.isConfigured()) {
    var last = GitHubSync.getLastSync();
    ind.className = 'sync-indicator sync-ok';
    ind.textContent = last === 'Mai sincronizzato' ? 'GitHub configurato' : 'Sync \u00b7 ' + last;
  }
}

// ── PHASE NAMES — unica source of truth per tutte le pagine ──
// Sincronizzato con le fasi di ROADMAP_TEMPLATE (8 fasi)
var PHASE_NAMES = [
  'Brief & Setup',
  'Ricerca Design',
  'Setup WordPress',
  'Sviluppo Pagine',
  'Copy & Contenuti',
  'Pagine Legali',
  'QA & Controllo',
  'Go Live',
];

// ── ROADMAP TEMPLATE (unico source of truth) ──────────────
// Ogni progetto riceve una copia indipendente tramite buildChecklistFromTemplate().
var ROADMAP_TEMPLATE = [
  {
    id: 'fase_1', num: 1, icon: '📋',
    label: 'Brief & Setup Progetto',
    desc: 'Raccolta materiali, arricchimento brief e definizione struttura del sito.',
    checks: [
      'Ricevuto logo dal cliente (vettoriale preferito)',
      'Raccolto screen/feed Instagram e riferimenti visivi',
      'Ricevuti testi, foto e materiali utili del cliente',
      'Compilato e arricchito il brief in modo completo e definitivo',
      'Definite le pagine necessarie per il sito',
      'Concordati tempi e obiettivi con il cliente',
    ]
  },
  {
    id: 'fase_2', num: 2, icon: '🎨',
    label: 'Ricerca Design & Template',
    desc: 'Selezione del template su Envato e importazione su WordPress.',
    checks: [
      'Trovate reference visive per il design (Dribbble, Behance\u2026)',
      'Scelto il template su Envato / ThemeForest',
      'Template scaricato da Envato',
      'Template caricato e attivato su WordPress',
      'Demo pages necessarie importate (child theme attivo)',
    ]
  },
  {
    id: 'fase_3', num: 3, icon: '⚙️',
    label: 'Setup Base WordPress',
    desc: 'Configurazione struttura pagine, navigazione, header, footer e impostazioni globali.',
    checks: [
      'Create tutte le pagine del sito (come da brief)',
      'Importato template Elementor per ogni singola pagina',
      'Importati Header e Footer da Elementor',
      'Creato e configurato il menu di navigazione',
      'Impostati colori globali in Elementor (palette del cliente)',
      'Impostati font globali in Elementor',
    ]
  },
  {
    id: 'fase_4', num: 4, icon: '🖥️',
    label: 'Sviluppo Pagine',
    desc: 'Modifica schematica di tutte le pagine: struttura, sezioni, template e foto.',
    checks: [
      'Header: logo, navigazione e CTA impostati correttamente',
      'Home \u2014 Hero: immagini, testi e CTA adattati al cliente',
      'Home \u2014 sezioni: struttura snellita, foto adatte caricate per ogni sezione',
      'Tutte le altre pagine adattate sezione per sezione',
      'Footer: struttura e link impostati',
      'Logo Evolve aggiunto nel footer',
    ]
  },
  {
    id: 'fase_5', num: 5, icon: '✍️',
    label: 'Copy & Contenuti',
    desc: 'Scrittura dei testi con AI+prompt, divisi per sezione e per pagina.',
    checks: [
      'Copy scritto per la Home (sezione per sezione con AI+prompt)',
      'Copy scritto per tutte le altre pagine del sito',
      'H1 keyword creato per ogni pagina (nascosto con classe CSS)',
      'Copy riletto e revisionato per coerenza e qualit\u00e0',
    ]
  },
  {
    id: 'fase_6', num: 6, icon: '🔒',
    label: 'Pagine Legali & Footer',
    desc: 'Generazione pagine legali con plugin e collegamento al footer.',
    checks: [
      'Privacy Policy generata e pubblicata (plugin)',
      'Cookie Policy generata e pubblicata (plugin)',
      'Pagina Copyright / Note Legali creata',
      'Footer: link legali collegati correttamente (privacy, cookie, copyright)',
      'Banner cookie configurato e funzionante',
    ]
  },
  {
    id: 'fase_7', num: 7, icon: '🔍',
    label: 'QA & Controllo Qualit\u00e0',
    desc: 'Verifica link, coerenza visiva, responsive e modulo di contatto.',
    checks: [
      'Tutti i link verificati (tel, email, mappe, pulsanti, social)',
      'Coerenza design controllata (icone, hover, animazioni, stile)',
      'Modulo di contatto (Contact Form 7) testato e funzionante',
      'Responsive desktop verificato',
      'Responsive tablet verificato',
      'Responsive mobile verificato',
      'Header mobile verificato e corretto',
    ]
  },
  {
    id: 'fase_8', num: 8, icon: '🚀',
    label: 'Impostazioni & Go Live',
    desc: 'Configurazione finale WordPress e pubblicazione del sito.',
    checks: [
      'Favicon caricata e impostata',
      'Impostazioni generali WordPress compilate (titolo, tagline, URL)',
      'Permalink impostati correttamente',
      'Impostazioni lettura: sito indicizzabile',
      'Immagini ottimizzate (WebP o compresse)',
      'Sito consegnato al cliente e link condiviso',
    ]
  },
];

// Crea una copia indipendente della checklist per un nuovo progetto
function buildChecklistFromTemplate() {
  return ROADMAP_TEMPLATE.map(function(fase) {
    return {
      id:         fase.id,
      num:        fase.num,
      label:      fase.label,
      icon:       fase.icon,
      desc:       fase.desc,
      checks:     fase.checks.slice(),
      doneChecks: [],
      done:       false,
    };
  });
}
