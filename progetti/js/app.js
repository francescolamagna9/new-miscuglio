// ─── TOAST ───
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = {
    success: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 8l3 3 7-7"/></svg>`,
    error: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4l8 8M12 4l-8 8"/></svg>`,
    warn: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 2l6 12H2L8 2z"/><path d="M8 7v3M8 12v.5"/></svg>`,
    info: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 7v4M8 5.5V6"/></svg>`,
  };

  toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${escHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(12px)';
    toast.style.transition = 'all 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// ─── COPY TO CLIPBOARD ───
function copyToClipboard(text, successMsg = 'Copiato!') {
  navigator.clipboard.writeText(text).then(() => {
    showToast(successMsg, 'success');
  }).catch(() => {
    showToast('Impossibile copiare', 'error');
  });
}

// ─── GROQ API KEY ───
async function testGroqKey(key) {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say OK' }]
      })
    });
    const data = await res.json();
    return !data.error;
  } catch { return false; }
}

function updateApiStatus(valid) {
  const dots = document.querySelectorAll('.api-status');
  dots.forEach(d => {
    d.classList.toggle('ok', valid);
    d.classList.toggle('err', !valid && storageGetGroqKey().length > 0);
  });
}

// ─── SETUP SCREEN ───
async function handleSetupSubmit() {
  const input = document.getElementById('setup-key-input');
  const btn = document.getElementById('setup-test-btn');
  const key = input.value.trim();

  if (!key) { showToast('Inserisci la API key', 'warn'); return; }

  btn.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><span>Test in corso...</span></div>`;
  btn.disabled = true;

  const valid = await testGroqKey(key);
  btn.innerHTML = 'Testa Connessione';
  btn.disabled = false;

  if (valid) {
    storageSetGroqKey(key);
    updateApiStatus(true);
    document.getElementById('view-setup').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    initRouter();
    showToast('API Key valida! Benvenuto in Evolve PM 🎉', 'success');
  } else {
    showToast('API Key non valida. Ricontrolla.', 'error');
  }
}

// ─── SETTINGS ───
async function testCurrentKey() {
  const key = storageGetGroqKey();
  const btn = document.getElementById('settings-test-btn');
  if (!key) { showToast('Nessuna key salvata', 'warn'); return; }
  btn.disabled = true;
  btn.textContent = 'Testing...';
  const valid = await testGroqKey(key);
  btn.disabled = false;
  btn.textContent = 'Testa';
  updateApiStatus(valid);
  showToast(valid ? 'API Key funzionante ✓' : 'API Key non valida', valid ? 'success' : 'error');
}

function saveNewKey() {
  const input = document.getElementById('settings-key-input');
  const key = input.value.trim();
  if (!key) { showToast('Inserisci la nuova key', 'warn'); return; }
  storageSetGroqKey(key);
  showToast('API Key salvata', 'success');
}

function toggleKeyVisibility() {
  const input = document.getElementById('settings-key-input');
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
}

function renderSettings() {
  const key = storageGetGroqKey();
  const container = document.getElementById('view-settings');
  if (!container) return;
  container.innerHTML = `
    <h1>Impostazioni</h1>
    <p>Gestisci la tua API key Groq e le preferenze dell'app.</p>

    <div class="settings-section">
      <h3>API Key Groq</h3>
      <div class="form-group">
        <label class="form-label">Key attuale</label>
        <div style="display:flex;gap:8px;">
          <input class="form-input mono" id="settings-key-input" type="password" value="${escHtml(key)}" placeholder="gsk_...">
          <button class="btn btn-secondary btn-sm" onclick="toggleKeyVisibility()">Mostra</button>
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary btn-sm" onclick="saveNewKey()">Salva</button>
        <button class="btn btn-secondary btn-sm" id="settings-test-btn" onclick="testCurrentKey()">Testa</button>
      </div>
      <div style="margin-top:12px;font-size:12px;color:var(--text3);">
        Ottieni una key su <a href="https://console.groq.com/keys" target="_blank" style="color:var(--accent);">console.groq.com/keys</a>
      </div>
    </div>

    <div class="settings-section">
      <h3>Backup Completo</h3>
      <p style="font-size:13px;color:var(--text3);margin-bottom:16px;">Esporta tutti i progetti in un unico file JSON.</p>
      <button class="btn btn-secondary" onclick="exportAllProjects()">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 1v8M3 6l4 4 4-4M1 10v2a1 1 0 001 1h10a1 1 0 001-1v-2"/></svg>
        Esporta tutti i progetti
      </button>
    </div>

    <div class="settings-section">
      <h3>Importa Backup</h3>
      <p style="font-size:13px;color:var(--text3);margin-bottom:16px;">Importa un file di backup precedentemente esportato.</p>
      <label class="btn btn-secondary" style="cursor:pointer;">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 9V1M3 5l4-4 4 4M1 10v2a1 1 0 001 1h10a1 1 0 001-1v-2"/></svg>
        Importa backup JSON
        <input type="file" accept=".json" style="display:none" onchange="handleGlobalImport(event)">
      </label>
    </div>
  `;
}

async function handleGlobalImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const data = await readImportFile(file);
    if (data.type === 'full' && data.projects) {
      const existing = getAllProjects();
      const merged = [...existing];
      data.projects.forEach(p => {
        if (!merged.find(e => e.id === p.id)) merged.push(p);
        else Object.assign(merged.find(e => e.id === p.id), p);
      });
      saveAllProjects(merged);
      showToast(`${data.projects.length} progetti importati`, 'success');
    } else {
      showToast('Formato backup non riconosciuto. Usa l\'import dal progetto.', 'warn');
    }
  } catch (err) {
    showToast('Errore: ' + err.message, 'error');
  }
  event.target.value = '';
}

// ─── EXPORT/IMPORT PROJECT ───
// ─── EXPORT MODAL ───
function openExportModal(projectId) {
  if (!projectId) { showToast('Nessun progetto selezionato', 'warn'); return; }
  const project = getProject(projectId);
  if (!project) { showToast('Progetto non trovato', 'error'); return; }

  const modal = document.getElementById('modal-export');
  modal.classList.add('open');
  modal.dataset.projectId = projectId;

  // Mostra nome progetto nel modal
  const nameEl = document.getElementById('export-project-name');
  if (nameEl) nameEl.textContent = '📁 ' + project.name;

  // Tutte le checkbox selezionate di default
  modal.querySelectorAll('input[type="checkbox"]').forEach(c => { c.checked = true; });
}

function closeExportModal() {
  document.getElementById('modal-export').classList.remove('open');
}

function confirmExport() {
  const modal = document.getElementById('modal-export');
  const projectId = modal.dataset.projectId;
  if (!projectId) { showToast('ID progetto mancante', 'error'); return; }

  const sections = [];
  modal.querySelectorAll('input[type="checkbox"]:not(#export-all):checked')
    .forEach(c => sections.push(c.value));

  if (!sections.length) { showToast('Seleziona almeno una sezione', 'warn'); return; }

  try {
    exportSelective(projectId, sections);
    closeExportModal();
    showToast('Export completato! File scaricato.', 'success');
  } catch(e) {
    showToast('Errore export: ' + e.message, 'error');
  }
}

// ─── IMPORT MODAL ───
function openImportModal(projectId) {
  if (!projectId) { showToast('Nessun progetto selezionato', 'warn'); return; }
  const modal = document.getElementById('modal-import');
  modal.classList.add('open');
  modal.dataset.projectId = projectId;
  importResetFile();
}

function closeImportModal() {
  document.getElementById('modal-import').classList.remove('open');
  importResetFile();
}

function importResetFile() {
  window._importData = null;
  const preview = document.getElementById('import-preview');
  if (preview) preview.innerHTML = '';
  const loaded = document.getElementById('import-file-loaded');
  if (loaded) loaded.style.display = 'none';
  const dropZone = document.getElementById('import-drop-zone');
  if (dropZone) dropZone.style.display = '';
  const fileInput = document.getElementById('import-file-input');
  if (fileInput) fileInput.value = '';
  const confirmBtn = document.getElementById('btn-confirm-import');
  if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.style.opacity = '0.4'; }
}

function importHandleDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.remove('over');
  const file = event.dataTransfer.files[0];
  if (!file) return;
  if (!file.name.endsWith('.json')) { showToast('Carica un file .json', 'warn'); return; }
  processImportFile(file);
}

async function handleImportFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  await processImportFile(file);
  event.target.value = '';
}

async function processImportFile(file) {
  // Feedback visivo: mostra nome file
  const dropZone = document.getElementById('import-drop-zone');
  const loaded   = document.getElementById('import-file-loaded');
  const nameLbl  = document.getElementById('import-file-name');
  if (dropZone) dropZone.style.display = 'none';
  if (loaded)  { loaded.style.display = 'flex'; }
  if (nameLbl) nameLbl.textContent = file.name;

  try {
    const data = await readImportFile(file);
    window._importData = data;
    renderImportPreview(data);

    // Abilita il pulsante conferma
    const confirmBtn = document.getElementById('btn-confirm-import');
    if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.style.opacity = ''; }
  } catch(err) {
    showToast('Errore lettura file: ' + err.message, 'error');
    importResetFile();
  }
}

function renderImportPreview(data) {
  const preview = document.getElementById('import-preview');
  if (!preview) return;

  if (!data || !data.sections) {
    preview.innerHTML = `<div style="padding:12px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.18);border-radius:var(--r-md);font-size:13px;color:#fca5a5;">
      ✕ Formato non valido. Assicurati di usare un backup esportato da Agency Hub.
    </div>`;
    return;
  }

  const sectionNames = {
    brief: 'Brief', checklist: 'Checklist',
    access: 'Accessi WP', assets: 'Assets & Link', revisions: 'Revisioni'
  };

  let html = `<div style="padding:10px 12px;background:rgba(16,185,129,0.07);border:1px solid rgba(16,185,129,0.18);border-radius:var(--r-md);margin-bottom:12px;">
    <div style="font-size:12px;color:var(--text-35);margin-bottom:2px;">Backup di</div>
    <div style="font-size:14px;font-weight:700;color:var(--text-100);">${escHtml(data.projectName || 'Progetto sconosciuto')}</div>
    ${data.exportedAt ? `<div style="font-size:11px;color:var(--text-35);margin-top:3px;">Esportato il ${new Date(data.exportedAt).toLocaleString('it-IT')}</div>` : ''}
  </div>`;

  html += `<div style="font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--text-35);margin-bottom:8px;">Sezioni disponibili</div>`;
  html += `<div style="display:flex;flex-direction:column;gap:6px;">`;

  Object.keys(data.sections).forEach(key => {
    const sec  = data.sections[key];
    const date = sec.updatedAt ? new Date(sec.updatedAt).toLocaleString('it-IT') : null;
    html += `<label class="checkbox-wrap">
      <input type="checkbox" class="import-section-check" value="${escHtml(key)}" checked>
      <div class="checkbox-custom"></div>
      <div class="checkbox-label">
        ${escHtml(sectionNames[key] || key)}
        ${date ? `<span style="color:var(--text-35);font-size:11px;margin-left:6px;">${date}</span>` : ''}
      </div>
    </label>`;
  });

  html += `</div>`;
  preview.innerHTML = html;
}

function confirmImport() {
  const modal = document.getElementById('modal-import');
  const projectId = modal.dataset.projectId;

  if (!window._importData) { showToast('Carica prima un file', 'warn'); return; }
  if (!projectId) { showToast('ID progetto mancante', 'error'); return; }

  const sections = [];
  document.querySelectorAll('.import-section-check:checked')
    .forEach(c => sections.push(c.value));

  if (!sections.length) { showToast('Seleziona almeno una sezione', 'warn'); return; }

  try {
    importSelective(projectId, window._importData, sections);
    closeImportModal();
    const project = getProject(projectId);
    if (project) renderTabContent(project, currentTab);
    showToast(`Import completato: ${sections.length} sezioni ripristinate!`, 'success');
  } catch(e) {
    showToast('Errore import: ' + e.message, 'error');
  }
}

// ─── NEW PROJECT ───
// confirmNewProject è gestita dal bridge script in progetti/index.html
// (form ricco con logo, dominio, tipo, project bible)
// Qui lasciamo solo openNewProjectModal e closeNewProjectModal come fallback
function openNewProjectModalFallback() {
  document.getElementById('modal-new-project').classList.add('open');
}
function closeNewProjectModal() {
  document.getElementById('modal-new-project').classList.remove('open');
}

// ─── KEYBOARD SHORTCUTS ───
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});

// ─── INIT ───
document.addEventListener('DOMContentLoaded', () => {
  // Agency Hub: setup bypassato, Groq key gestita in Impostazioni
  const key = storageGetGroqKey();
  updateApiStatus(!!key);
  initRouter();

  // New project brief file
  const briefFileInput = document.getElementById('new-brief-file-input');
  if (briefFileInput) {
    briefFileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) {
        window._newBriefFile = file;
        const label = document.getElementById('new-brief-file-name');
        if (label) label.textContent = file.name;
      }
    });
  }

  // Settings link
  const settingsLinks = document.querySelectorAll('[href="#settings"]');
  settingsLinks.forEach(link => {
    link.addEventListener('click', () => renderSettings());
  });
});
