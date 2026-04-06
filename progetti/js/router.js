let currentProjectId = null;
let currentTab = 'brief';

function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

function handleRoute() {
  const hash = window.location.hash || '#dashboard';
  if (hash.startsWith('#project/')) {
    const parts = hash.split('/');
    const id = parts[1];
    const tab = parts[2] || 'brief';
    showProjectView(id, tab);
  } else if (hash === '#settings') {
    showView('settings');
    updateSidebarActive('#settings');
    renderSettings();
  } else {
    showView('dashboard');
    renderDashboard();
    updateSidebarActive('#dashboard');
  }
}

function showView(viewName) {
  document.querySelectorAll('#progetti-module .pm-view').forEach(v => v.classList.remove('active'));
  const view = document.getElementById('view-' + viewName);
  if (view) view.classList.add('active');
}

function showProjectView(projectId, tab = 'brief') {
  const project = getProject(projectId);
  if (!project) { window.location.hash = '#dashboard'; return; }
  currentProjectId = projectId;
  currentTab = tab;
  showView('project');
  renderProjectHeader(project);
  setActiveTab(tab);
  renderTabContent(project, tab);
  updateSidebarActive(null);
}

/* ═══════════════════════
   PROJECT HEADER RENDER
═══════════════════════ */
function renderProjectHeader(project) {
  const acc = project.access || {};
  const s = project.brief?.scheda || {};
  const progress = getChecklistProgress(project);
  const statusLabel = { attivo:'Attivo', pausa:'In Pausa', consegnato:'Consegnato', archiviato:'Archiviato' };
  const domain = s.dominio || acc.url?.replace('/wp-admin','').replace('https://','').replace('http://','') || '';
  const fullUrl = domain ? (domain.startsWith('http') ? domain : 'https://' + domain) : '';

  // Logo / avatar
  const logoHtml = project.logo
    ? `<img src="${project.logo}" alt="logo">`
    : `<span class="ph-logo-initials">${getInitialsFor(project.name)}</span>`;

  // Deadline
  let deadlineHtml = '';
  if (project.deadline) {
    const days = Math.round((new Date(project.deadline) - new Date()) / 86400000);
    const cls = days < 0 ? 'over' : days <= 7 ? 'warn' : 'ok';
    const txt = days < 0 ? `Scaduta ${Math.abs(days)}gg fa` : `${days}gg rimasti`;
    deadlineHtml = `<span class="ph-deadline-badge ${cls}">${txt}</span>`;
  }

  // Checklist fasi mini-timeline
  const fasiHtml = PHASES.map(phase => {
    const pp = getPhaseProgress(project, phase.id);
    const complete = pp.pct === 100;
    const active = pp.pct > 0 && pp.pct < 100;
    return `
      <div class="ph-fase-item ${complete ? 'complete' : active ? 'active' : ''}" title="${escHtml(phase.title)}: ${pp.pct}%">
        <div class="ph-fase-dot">
          ${complete
            ? `<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 5l2.5 2.5L8 3"/></svg>`
            : `<span>${phase.id}</span>`}
        </div>
        <div class="ph-fase-label">${escHtml(phase.title)}</div>
        <div class="ph-fase-bar"><div class="ph-fase-bar-fill" style="width:${pp.pct}%"></div></div>
      </div>`;
  }).join('');

  // Meta info chips (dati dal brief)
  const metaChips = [
    s.tipoSito ? { icon: `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="2" width="10" height="8" rx="1.5"/><path d="M1 5h10"/></svg>`, val: s.tipoSito, color: 'blue' } : null,
    s.settore ? { icon: `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="4" width="10" height="7" rx="1"/><path d="M3.5 4V3a2.5 2.5 0 015 0v1"/></svg>`, val: s.settore, color: 'purple' } : null,
    s.cliente || project.client ? { icon: `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="6" cy="4" r="2"/><path d="M1.5 10c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4"/></svg>`, val: s.cliente || project.client, color: 'teal' } : null,
  ].filter(Boolean);

  document.getElementById('project-header').innerHTML = `
    <!-- ═══ SCHEDA PROGETTO ═══ -->
    <div class="ph-card">

      <!-- ROW 1: Identity + Actions -->
      <div class="ph-row-identity">

        <!-- BACK -->
        <a class="ph-back" href="#dashboard" title="Torna alla dashboard">
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 2L4 6l4 4"/></svg>
        </a>

        <!-- LOGO UPLOAD -->
        <label class="ph-logo" title="Carica logo cliente">
          ${logoHtml}
          <div class="ph-logo-overlay">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 3v8M3 7l4-4 4 4"/></svg>
          </div>
          <input type="file" accept="image/*" onchange="handleLogoUpload(event,'${escHtml(project.id)}')">
        </label>

        <!-- IDENTITY -->
        <div class="ph-identity">
          <div class="ph-name">${escHtml(project.name)}</div>
          <div class="ph-meta-row">
            ${fullUrl ? `<a class="ph-domain" href="${escHtml(fullUrl)}" target="_blank">
              <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="5" cy="5" r="4"/><path d="M1 5h8M5 1c-1.5 1.5-1.5 6.5 0 8M5 1c1.5 1.5 1.5 6.5 0 8"/></svg>
              ${escHtml(domain)}
            </a>` : '<span class="ph-domain-empty">Nessun dominio</span>'}
            ${metaChips.map(c => `
              <span class="ph-meta-chip ph-meta-chip--${c.color}">
                ${c.icon}${escHtml(c.val)}
              </span>`).join('')}
          </div>
        </div>

        <!-- STATUS -->
        <div class="ph-status-wrap">
          <div class="ph-status" data-status="${escHtml(project.status||'attivo')}" onclick="toggleStatusDropdown(event)">
            <span class="status-dot"></span>
            <span id="ph-status-label">${statusLabel[project.status||'attivo']}</span>
            <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 4l3 3 3-3"/></svg>
          </div>
          <div class="status-dropdown" id="status-dropdown">
            ${Object.entries(statusLabel).map(([val,label])=>`
              <div class="status-option" data-val="${val}" onclick="setProjectStatus('${escHtml(project.id)}','${val}',this)">
                <span class="status-dot"></span>${label}
              </div>`).join('')}
          </div>
        </div>

        <!-- DEADLINE -->
        <div class="ph-deadline-wrap">
          <label class="ph-deadline-label">Deadline</label>
          <input type="date" class="ph-deadline-input" id="ph-deadline-input"
            value="${escHtml(project.deadline || '')}"
            onchange="saveHeaderDeadline('${escHtml(project.id)}', this.value)">
          ${deadlineHtml}
        </div>

        <!-- ACTIONS -->
        <div class="ph-actions">
          <label class="ph-brief-btn ${project.brief ? 'has-brief' : ''}" title="${project.brief ? 'Brief caricato — clicca per ricaricare' : 'Carica brief .docx'}">
            <svg viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 2h6l3 3v7H2z"/><path d="M8 2v3h3M5 6h3M5 8.5h2"/></svg>
            ${project.brief ? 'Brief ✓' : 'Brief'}
            <input type="file" accept=".docx" style="display:none" onchange="handleBriefUpload(event,'${escHtml(project.id)}')">
          </label>
          <button class="ph-action-btn" onclick="openExportModal(currentProjectId)" title="Esporta progetto">
            <svg viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6.5 1v7M3.5 5.5l3 3 3-3M1 9.5v1.5a1 1 0 001 1h9a1 1 0 001-1V9.5"/></svg>
            Export
          </button>
          <label class="ph-action-btn" style="cursor:pointer;" title="Importa progetto">
            <svg viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6.5 9V2M3.5 4l3-3 3 3M1 9.5v1.5a1 1 0 001 1h9a1 1 0 001-1V9.5"/></svg>
            Import
            <input type="file" accept=".json" style="display:none" onchange="openImportModalFromFile(event)">
          </label>
        </div>
      </div>

      <!-- ROW 2: Access + Progress -->
      <div class="ph-row-access">

        <!-- WP ACCESS CHIPS -->
        <div class="ph-access-chips">
          ${acc.url ? `
            <a class="access-chip wp" href="${escHtml(acc.url)}" target="_blank">
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="6" cy="6" r="5"/><path d="M1 6h10M6 1.5a7 7 0 010 9M6 1.5a7 7 0 000 9"/></svg>
              WP Admin
            </a>` : `<span class="ph-no-access">Nessun accesso configurato — vai alla tab <strong>Accessi WP</strong></span>`}
          ${acc.username ? `
            <div class="access-chip cred" onclick="copyToClipboard('${escHtml(acc.username)}','Username copiato')" title="Copia username">
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="6" cy="4" r="2"/><path d="M2 10c0-2.2 1.8-4 4-4s4 1.8 4 4"/></svg>
              <span class="access-chip-label">User</span>${escHtml(acc.username)}
            </div>` : ''}
          ${acc.password ? `
            <div class="access-chip cred" onclick="copyToClipboard('${escHtml(acc.password)}','Password copiata')" title="Copia password">
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="5" width="8" height="6" rx="1"/><path d="M4 5V4a2 2 0 014 0v1"/></svg>
              <span class="access-chip-label">Pass</span>••••••••
            </div>` : ''}
        </div>

        <!-- PROGRESS GLOBALE -->
        <div class="ph-progress-wrap">
          <div class="ph-progress-header">
            <span class="ph-progress-title">Avanzamento Checklist</span>
            <span class="ph-progress-nums" id="hdr-prog-pct">${progress.done}/${progress.total} — ${progress.pct}%</span>
          </div>
          <div class="ph-progress-track">
            <div class="ph-progress-fill" id="hdr-prog-bar" style="width:${progress.pct}%"></div>
          </div>
        </div>
      </div>

      <!-- ROW 3: Fasi Timeline -->
      <div class="ph-row-fasi">
        ${fasiHtml}
      </div>

    </div>
  `;
}

function getInitialsFor(name) {
  if (!name) return '?';
  return name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
}

async function handleLogoUpload(event, projectId) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    await uploadProjectLogo(projectId, file);
    const project = getProject(projectId);
    renderProjectHeader(project);
    renderDashboard(); // refresh cards
    showToast('Logo aggiornato!', 'success');
  } catch(e) {
    showToast('Errore: ' + e, 'error');
  }
  event.target.value = '';
}

function toggleStatusDropdown(e) {
  e.stopPropagation();
  const dd = document.getElementById('status-dropdown');
  dd.classList.toggle('open');
}

function setProjectStatus(projectId, status, el) {
  updateProject(projectId, { status });
  const statusEl = document.querySelector('.ph-status');
  const labelEl = document.getElementById('ph-status-label');
  if (statusEl) statusEl.dataset.status = status;
  const labels = { attivo:'Attivo', pausa:'In Pausa', consegnato:'Consegnato', archiviato:'Archiviato' };
  if (labelEl) labelEl.textContent = labels[status];
  document.getElementById('status-dropdown')?.classList.remove('open');
  showToast(`Stato: ${labels[status]}`, 'success');
}

function saveHeaderDeadline(projectId, value) {
  updateProject(projectId, { deadline: value });
  const project = getProject(projectId);
  // Aggiorna badge deadline senza re-render completo
  const wrap = document.querySelector('.ph-deadline-wrap');
  if (!wrap) return;
  const old = wrap.querySelector('.ph-deadline-badge');
  if (old) old.remove();
  if (value) {
    const days = Math.round((new Date(value) - new Date()) / 86400000);
    const cls = days < 0 ? 'over' : days <= 7 ? 'warn' : 'ok';
    const txt = days < 0 ? `Scaduta ${Math.abs(days)}gg fa` : `${days}gg rimasti`;
    const badge = document.createElement('span');
    badge.className = `ph-deadline-badge ${cls}`;
    badge.textContent = txt;
    wrap.appendChild(badge);
  }
}

function refreshHeaderProgress(project) {
  const progress = getChecklistProgress(project);
  const bar = document.getElementById('hdr-prog-bar');
  const pct = document.getElementById('hdr-prog-pct');
  if (bar) bar.style.width = progress.pct + '%';
  if (pct) pct.textContent = `${progress.done}/${progress.total} — ${progress.pct}%`;
  // Aggiorna anche le fasi mini
  PHASES.forEach(phase => {
    const pp = getPhaseProgress(project, phase.id);
    const el = document.querySelector(`.ph-fase-item[data-phase="${phase.id}"]`);
    if (el) {
      el.classList.toggle('complete', pp.pct === 100);
      el.classList.toggle('active', pp.pct > 0 && pp.pct < 100);
      const fill = el.querySelector('.ph-fase-bar-fill');
      if (fill) fill.style.width = pp.pct + '%';
    }
  });
}

function setActiveTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
}

function renderTabContent(project, tab) {
  // Redirect panoramica legacy → brief
  if (tab === 'panoramica') {
    window.location.hash = `#project/${project.id}/brief`;
    return;
  }
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  const pane = document.getElementById('tab-' + tab);
  if (pane) pane.classList.add('active');
  switch (tab) {
    case 'brief': renderBrief(project); break;
    case 'checklist': renderChecklist(project); break;
    case 'access': renderAccess(project); break;
    case 'assets': renderAssets(project); break;
    case 'revisions': renderRevisions(project); break;
    default: renderBrief(project); break;
  }
}

function navigateToProject(projectId, tab = 'brief') {
  window.location.hash = `#project/${projectId}/${tab}`;
}

function switchTab(tab) {
  if (!currentProjectId) return;
  currentTab = tab;
  window.location.hash = `#project/${currentProjectId}/${tab}`;
}

function updateSidebarActive(hash) {
  document.querySelectorAll('.sidebar-nav a, .sidebar-footer a').forEach(a => {
    a.classList.remove('active');
    if (hash && a.getAttribute('href') === hash) a.classList.add('active');
  });
}

// Close dropdowns on outside click
document.addEventListener('click', () => {
  document.getElementById('status-dropdown')?.classList.remove('open');
});
