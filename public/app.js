// ── Dugout AI — Frontend Logic (Phase 2-4: SSE + Live Cricket + Gemini) ───────
'use strict';

const AGENT = {
  meme: {
    label: 'MEME AGENT', version: 'v2.4',
    icon: 'sentiment_very_dissatisfied',
    accent: 'primary-container', accentHex: '#8bf108',
    borderClass: 'border-primary-container',
    labelClass: 'text-primary-container',
    tagBgClass: 'bg-primary-container text-on-primary-container',
  },
  hype: {
    label: 'HYPE AGENT', version: 'v1.0',
    icon: 'local_fire_department',
    accent: 'secondary', accentHex: '#74d6d6',
    borderClass: 'border-secondary',
    labelClass: 'text-secondary',
    tagBgClass: 'bg-secondary text-on-secondary',
  },
  stats: {
    label: 'STATS AGENT', version: 'ANALYTIC_UNIT_7',
    icon: 'analytics',
    accent: 'outline', accentHex: '#89957b',
    borderClass: 'border-outline-variant',
    labelClass: 'text-on-surface-variant',
    tagBgClass: 'bg-surface-container-highest text-on-surface',
  },
  prediction: {
    label: 'PREDICTION AGENT', version: 'QUANTUM_FLUX',
    icon: 'psychology',
    accent: 'tertiary-fixed-dim', accentHex: '#5ede95',
    borderClass: 'border-tertiary-fixed-dim',
    labelClass: 'text-tertiary-fixed-dim',
    tagBgClass: 'bg-tertiary-fixed-dim text-on-tertiary-container',
  }
};

// ── State ─────────────────────────────────────────────────────────────────────
let activeTab     = 'posted';
let prevTaskIds   = new Set();
let sseConnected  = false;
let eventFlashTimeout = null;

// ── Time helper ───────────────────────────────────────────────────────────────
function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return `${diff}s AGO`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m AGO`;
  return `${Math.floor(diff / 3600)}h AGO`;
}

// ── Card Renderers ─────────────────────────────────────────────────────────────
function renderPostedContent(task, cfg) {
  if (task.agent === 'prediction' && task.metadata?.probability != null) {
    const p    = task.metadata.probability;
    const team = task.metadata.team || 'KKR';
    const conf = task.metadata.confidence || 0.88;
    return `
      <div class="flex items-end gap-2 py-1">
        <span class="text-headline-lg font-bold leading-none ${cfg.labelClass}">${p}%</span>
        <p class="text-body-md text-on-surface pb-1">${team} Win Probability <span class="${cfg.labelClass}">shift detected</span>.</p>
      </div>
      <div class="h-1.5 w-full bg-surface-container-highest overflow-hidden">
        <div class="h-full transition-all duration-1000 ease-out" style="width:${p}%;background:${cfg.accentHex}"></div>
      </div>
      <p class="text-label-md text-on-surface-variant mt-1 italic">CONFIDENCE_INTERVAL: ${conf}</p>
      <p class="text-body-md text-on-surface mt-2">${task.content}</p>`;
  }
  if (task.agent === 'stats' && task.metadata?.stats) {
    const s = task.metadata.stats;
    return `
      <p class="text-body-md text-on-surface border-l-2 pl-3 py-1 bg-surface-container-low" style="border-color:${cfg.accentHex}">${task.content}</p>
      <div class="grid grid-cols-3 gap-1.5 mt-2">
        ${[['SR', s.sr],['AVG', s.avg],['6s', s.sixes]].map(([k,v]) => `
        <div class="border border-outline-variant p-1 text-center">
          <div class="text-label-md text-on-surface-variant">${k}</div>
          <div class="text-label-lg font-bold ${cfg.labelClass}">${v}</div>
        </div>`).join('')}
      </div>`;
  }
  if (task.agent === 'hype') {
    return `<p class="text-headline-sm uppercase italic text-on-surface tracking-tighter">${task.content} <span class="inline-block animate-bounce">🔥</span></p>`;
  }
  // meme default
  return `<p class="text-body-lg text-on-surface leading-snug">"${task.content}"</p>`;
}

function renderTags(task, cfg) {
  const m = task.metadata;
  const aiTag = m?.aiGenerated
    ? `<span class="bg-tertiary-fixed-dim/20 border border-tertiary-fixed-dim text-tertiary-fixed-dim px-2 py-px text-label-md">✦ GEMINI</span>`
    : '';

  if (task.agent === 'meme')
    return `<span class="${cfg.tagBgClass} px-2 py-px text-label-md">${m.tone || 'ROAST'}</span>
            <span class="border border-outline-variant text-on-surface-variant px-2 py-px text-label-md uppercase">VIRAL_POTENTIAL: ${m.viralPotential || 'HIGH'}</span>${aiTag}`;
  if (task.agent === 'hype')
    return `<span class="${cfg.tagBgClass} px-2 py-px text-label-md">${m.tone || 'MAX ENERGY'}</span>
            <span class="border border-outline-variant text-on-surface-variant px-2 py-px text-label-md uppercase">ENGAGEMENT_SPIKE: ${m.engagementSpike || '300%'}</span>${aiTag}`;
  if (task.agent === 'stats')
    return `<span class="${cfg.tagBgClass} px-2 py-px text-label-md">ANALYTICS</span>
            <span class="border border-outline-variant text-on-surface-variant px-2 py-px text-label-md uppercase">SOURCE: LIVE_FEED</span>${aiTag}`;
  if (task.agent === 'prediction')
    return `<span class="${cfg.tagBgClass} px-2 py-px text-label-md">WIN_PROB</span>
            <span class="border border-outline-variant text-on-surface-variant px-2 py-px text-label-md uppercase">MODEL: QUANTUM_FLUX</span>${aiTag}`;
  return '';
}

function buildCard(task) {
  const cfg    = AGENT[task.agent] || AGENT.meme;
  const isNew  = !prevTaskIds.has(task.id);
  const enterClass = isNew ? 'card-enter' : '';

  if (task.status === 'todo') {
    return `
    <div class="task-card ${enterClass} bg-surface-container ${cfg.borderClass} border p-4 relative overflow-hidden" data-id="${task.id}">
      <div class="flex justify-between items-center mb-2">
        <span class="text-label-md ${cfg.labelClass} uppercase">${cfg.label} // ${cfg.version}</span>
        <span class="text-label-md text-on-surface-variant uppercase">${timeAgo(task.createdAt)}</span>
      </div>
      <div class="w-full h-px bg-outline-variant mb-2"></div>
      <div class="flex items-center gap-2 py-2">
        <span class="material-symbols-outlined text-on-surface-variant text-base">hourglass_empty</span>
        <span class="text-label-lg text-on-surface-variant uppercase">QUEUED FOR PROCESSING</span>
      </div>
      <div class="bg-surface-container-low border border-outline-variant px-3 py-1 mt-1">
        <span class="text-label-md text-on-surface-variant uppercase">TRIGGER: </span>
        <span class="text-label-md text-on-surface uppercase">${task.eventDetail}</span>
      </div>
    </div>`;
  }

  if (task.status === 'processing') {
    return `
    <div class="task-card ${enterClass} bg-surface-container ${cfg.borderClass} border p-4 relative overflow-hidden" data-id="${task.id}">
      <div class="flex justify-between items-center mb-2">
        <span class="text-label-md ${cfg.labelClass} uppercase">${cfg.label} // ${cfg.version}</span>
        <div class="flex items-center gap-1.5">
          <div class="w-1.5 h-1.5 rounded-full bg-tertiary-fixed-dim pulse-dot"></div>
          <span class="text-label-md text-tertiary-fixed-dim uppercase">GENERATING</span>
        </div>
      </div>
      <div class="w-full h-px bg-outline-variant mb-3"></div>
      <div class="processing-shimmer h-4 rounded mb-2"></div>
      <div class="processing-shimmer h-4 rounded mb-2 w-3/4"></div>
      <div class="processing-shimmer h-4 rounded w-1/2"></div>
      <div class="bg-surface-container-low border border-outline-variant px-3 py-1 mt-3">
        <span class="text-label-md text-on-surface-variant uppercase">EVENT: </span>
        <span class="text-label-md text-on-surface uppercase">${task.eventDetail}</span>
      </div>
    </div>`;
  }

  // posted
  return `
  <div class="task-card ${enterClass} bg-surface-container ${cfg.borderClass} border p-4 relative overflow-hidden group" data-id="${task.id}">
    <div class="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
      <span class="material-symbols-outlined text-4xl">${cfg.icon}</span>
    </div>
    <div class="flex flex-col gap-1 relative z-10">
      <div class="flex justify-between items-center">
        <span class="text-label-md ${cfg.labelClass} uppercase">${cfg.label} // ${cfg.version}</span>
        <span class="text-label-md text-on-surface-variant uppercase">${timeAgo(task.updatedAt)}</span>
      </div>
      <div class="w-full h-px bg-outline-variant my-1"></div>
      ${renderPostedContent(task, cfg)}
      <div class="mt-2 flex flex-wrap gap-1.5">
        ${renderTags(task, cfg)}
      </div>
    </div>
    <div class="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-700" style="background:${cfg.accentHex}"></div>
  </div>`;
}

// ── NEW EVENT Flash banner ────────────────────────────────────────────────────
function flashNewEvent(evt) {
  const banner = document.getElementById('new-event-flash');
  const text   = document.getElementById('new-event-text');
  if (!banner || !text) return;

  text.textContent = `⚡ ${evt.type.toUpperCase()} — ${evt.detail}`;
  banner.classList.remove('hidden', 'opacity-0');
  banner.classList.add('flex', 'opacity-100');

  if (eventFlashTimeout) clearTimeout(eventFlashTimeout);
  eventFlashTimeout = setTimeout(() => {
    banner.classList.add('opacity-0');
    setTimeout(() => {
      banner.classList.remove('flex');
      banner.classList.add('hidden');
    }, 600);
  }, 4000);
}

// ── Live connection indicator ─────────────────────────────────────────────────
function setLiveStatus(connected, isRealData) {
  const dot  = document.getElementById('live-dot');
  const text = document.getElementById('live-text');
  if (!dot || !text) return;

  if (isRealData) {
    dot.style.background  = '#8bf108';
    text.textContent      = 'LIVE CRICKET API';
    text.style.color      = '#8bf108';
  } else if (connected) {
    dot.style.background  = '#74d6d6';
    text.textContent      = 'CONNECTED — NO LIVE MATCH';
    text.style.color      = '#74d6d6';
  } else {
    dot.style.background  = '#89957b';
    text.textContent      = 'CONNECTING...';
    text.style.color      = '#89957b';
  }
}

// ── Render ────────────────────────────────────────────────────────────────────
function render(data) {
  const { match, tasks, telemetry, systemStatus, liveConnected } = data;

  // Match header
  if (match) {
    document.getElementById('match-score').innerHTML =
      `${match.team1} ${match.score} <span class="text-on-surface-variant px-1">VS</span> ${match.team2}`;
    if (match.lastEvent) {
      const b = document.getElementById('event-banner');
      document.getElementById('event-banner-text').textContent = match.lastEvent;
      b.classList.remove('hidden');
      b.classList.add('flex');
    }
  }

  // Live status
  setLiveStatus(sseConnected, liveConnected);

  // System status
  if (systemStatus) {
    document.getElementById('status-ops').textContent     = systemStatus.ops || 'NOMINAL';
    document.getElementById('status-latency').textContent = systemStatus.latency || '--MS';
    const clientEl = document.getElementById('status-clients');
    if (clientEl) clientEl.textContent = systemStatus.clients ?? '--';
  }
  document.getElementById('status-tasks').textContent = tasks.length;

  // Counts
  const byStatus = { todo: [], processing: [], posted: [] };
  tasks.forEach(t => { if (byStatus[t.status]) byStatus[t.status].push(t); });

  document.getElementById('count-todo').textContent       = byStatus.todo.length;
  document.getElementById('count-processing').textContent = byStatus.processing.length;
  document.getElementById('count-posted').textContent     = byStatus.posted.length;

  // Cards
  ['todo', 'processing', 'posted'].forEach(status => {
    const container = document.getElementById(`cards-${status}`);
    const html = byStatus[status].map(buildCard).join('');
    container.innerHTML = html || `<div class="text-label-md text-on-surface-variant text-center py-8 uppercase opacity-50">NO ${status.toUpperCase()} TASKS</div>`;
  });

  // Telemetry
  if (telemetry?.length) {
    document.getElementById('telemetry-rows').innerHTML = telemetry.map(row => `
      <div class="grid grid-cols-4 px-4 py-2.5 border-b border-outline-variant hover:bg-primary-container/10 transition-colors cursor-crosshair text-label-md">
        <span class="opacity-70">${row.timestamp}</span>
        <span class="${AGENT[row.agentId.split('_')[0].toLowerCase()]?.labelClass || 'text-primary'}">${row.agentId}</span>
        <span>${row.protocol}</span>
        <span class="text-primary-container">${row.status}</span>
      </div>`).join('');
  }

  // Update seen IDs
  prevTaskIds = new Set(tasks.map(t => t.id));
}

// ── SSE connection ────────────────────────────────────────────────────────────
function connectSSE() {
  setLiveStatus(false, false);
  const es = new EventSource('/api/events');

  es.addEventListener('init', e => {
    sseConnected = true;
    const data = JSON.parse(e.data);
    // init doesn't have telemetry — fetch full state once
    fetch('/api/state').then(r => r.json()).then(render).catch(() => {});
    setLiveStatus(true, data.liveConnected);
  });

  es.addEventListener('taskUpdate', e => {
    const data = JSON.parse(e.data);
    fetch('/api/state').then(r => r.json()).then(render).catch(() => {});
  });

  es.addEventListener('matchUpdate', e => {
    const data = JSON.parse(e.data);
    if (data.match) {
      document.getElementById('match-score').innerHTML =
        `${data.match.team1} ${data.match.score} <span class="text-on-surface-variant px-1">VS</span> ${data.match.team2}`;
    }
  });

  es.addEventListener('newEvent', e => {
    const data = JSON.parse(e.data);
    if (data.event) flashNewEvent(data.event);
    if (data.match?.lastEvent) {
      const b = document.getElementById('event-banner');
      document.getElementById('event-banner-text').textContent = data.match.lastEvent;
      b.classList.remove('hidden');
      b.classList.add('flex');
    }
  });

  es.onerror = () => {
    sseConnected = false;
    setLiveStatus(false, false);
    es.close();
    // Reconnect after 5s
    setTimeout(connectSSE, 5000);
  };
}

// ── Tab switching (mobile) ────────────────────────────────────────────────────
function setTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.mob-col').forEach(el => el.classList.remove('active'));
  const col = document.getElementById(`col-${tab}`);
  if (col) col.classList.add('active');

  document.querySelectorAll('.tab-btn').forEach(btn => {
    const active = btn.dataset.tab === tab;
    btn.classList.toggle('bg-primary-container',      active);
    btn.classList.toggle('text-on-primary-container', active);
    btn.classList.toggle('border-t-2',                active);
    btn.classList.toggle('border-primary-fixed-dim',  active);
    btn.classList.toggle('text-on-surface-variant',  !active);
  });

  document.querySelectorAll('.nav-btn').forEach(btn => {
    const active = btn.dataset.tab === tab;
    btn.classList.toggle('bg-primary-container',      active);
    btn.classList.toggle('text-on-primary-container', active);
    btn.classList.toggle('border-t-2',                active);
    btn.classList.toggle('border-primary-fixed-dim',  active);
    btn.classList.toggle('text-on-surface-variant',  !active);
  });
}

// ── Trigger event ─────────────────────────────────────────────────────────────
async function triggerEvent() {
  const event  = document.getElementById('dev-event').value;
  const detail = document.getElementById('dev-detail').value || `${event.toUpperCase()} detected`;
  const status = document.getElementById('trigger-status');
  status.textContent = 'FIRING...';
  try {
    const res  = await fetch('/api/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, detail })
    });
    const data = await res.json();
    status.textContent = `✓ ${data.count} TASKS QUEUED — GEMINI RUNNING`;
    setTimeout(() => { status.textContent = ''; }, 5000);
  } catch (e) {
    status.textContent = 'ERROR';
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Tab buttons
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (tab === 'agents') return;
      setTab(tab);
    });
  });

  // Dev panel toggle
  document.getElementById('btn-dev-toggle').addEventListener('click', () => {
    const devPanel = document.getElementById('dev-panel');
    const apiPanel = document.getElementById('api-panel');
    apiPanel.classList.remove('expanded');
    apiPanel.classList.add('collapsed');
    devPanel.classList.toggle('collapsed');
    devPanel.classList.toggle('expanded');
  });

  // API config panel toggle
  document.getElementById('btn-api-toggle').addEventListener('click', () => {
    const apiPanel = document.getElementById('api-panel');
    const devPanel = document.getElementById('dev-panel');
    devPanel.classList.remove('expanded');
    devPanel.classList.add('collapsed');
    apiPanel.classList.toggle('collapsed');
    apiPanel.classList.toggle('expanded');
  });

  // Pre-fill from localStorage
  const savedKey     = localStorage.getItem('cricket_api_key');
  const savedMatchId = localStorage.getItem('cricket_match_id');
  if (savedKey)     document.getElementById('api-key-input').value   = savedKey;
  if (savedMatchId) document.getElementById('match-id-input').value  = savedMatchId;

  // Apply API key
  document.getElementById('btn-apply-api').addEventListener('click', async () => {
    const key     = document.getElementById('api-key-input').value.trim();
    const matchId = document.getElementById('match-id-input').value.trim();
    const status  = document.getElementById('api-status');

    if (!key) { status.textContent = '⚠ KEY REQUIRED'; return; }

    status.textContent = 'APPLYING...';
    status.style.color = '#74d6d6';

    try {
      const res  = await fetch('/api/config', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ cricketApiKey: key, matchId: matchId || undefined })
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('cricket_api_key',   key);
        if (matchId) localStorage.setItem('cricket_match_id', matchId);
        status.textContent = '✓ APPLIED — POLLER RESTARTED';
        status.style.color = '#8bf108';
        // Close panel after 2s
        setTimeout(() => {
          document.getElementById('api-panel').classList.replace('expanded', 'collapsed');
          status.textContent = '';
        }, 2000);
      } else {
        status.textContent = `ERROR: ${data.error || 'unknown'}`;
        status.style.color = '#ffb4ab';
      }
    } catch (e) {
      status.textContent = 'NETWORK ERROR';
      status.style.color = '#ffb4ab';
    }
  });

  // Trigger button
  document.getElementById('btn-trigger').addEventListener('click', triggerEvent);

  // Telemetry row click flash
  document.addEventListener('click', e => {
    const row = e.target.closest('.cursor-crosshair');
    if (row) {
      row.style.background = 'rgba(139,241,8,0.1)';
      setTimeout(() => { row.style.background = ''; }, 200);
    }
  });

  // Initial fetch + SSE
  fetch('/api/state').then(r => r.json()).then(render).catch(() => {});
  connectSSE();
  setTab('posted');
});
