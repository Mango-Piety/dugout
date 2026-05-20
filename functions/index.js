/**
 * functions/index.js — Dugout AI Firebase Function
 * Wraps the full Express app (cricket poller + SSE + Gemini) as a 2nd-gen HTTPS function
 */

const { onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const express = require('express');
const cors    = require('cors');
const path    = require('path');

// Load env vars from functions/.env (bundled with the function for both local + prod)
require('dotenv').config({ path: path.join(__dirname, '.env') });

const cricket = require('./src/cricket');
const { detect } = require('./src/events');
const gemini  = require('./src/gemini');

// Keep 1 warm instance so the cricket poller never dies between requests
setGlobalOptions({ region: 'us-central1' });

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// ── SSE clients ───────────────────────────────────────────────────────────────
const sseClients = new Set();

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try { res.write(payload); } catch { sseClients.delete(res); }
  }
}

// ── In-memory state ───────────────────────────────────────────────────────────
const state = {
  match: {
    team1: 'KKR', team2: 'MI',
    score: '—', overs: '0.0',
    status: 'CONNECTING', venue: 'Eden Gardens',
    lastEvent: null
  },
  tasks: [],
  telemetry: [],
  liveConnected: false
};

// ── Fallback mock content ─────────────────────────────────────────────────────
const MOCK_CONTENT = {
  meme: {
    wicket:   'Aur ek gaya! 💀 Batting lineup toh Titanic ki tarah dub raha hai bhai!',
    six:      'PAANCH PAANCH CHHE! Stadium ka chahat udd gaya yaar 🚀',
    boundary: 'Rope se dosti kar li inhone 😭 Fielder toh statue ban gaya!',
    over:     'Ek aur over toh gaya — paise wapas nahi milenge 💸',
    momentum: 'Momentum? Kaun momentum? MI ne toh khud hi haath khade kar liye 🤌',
    innings:  'Innings khatam. Post-mortem kal subah 10 baje 🕙'
  },
  hype: {
    wicket:   'WICKET WICKET WICKET! 🔥 YE MATCH AB INTERESTING HO GAYA!',
    six:      'MAXIMUM MAXIMUM MAXIMUM!!! CROWD KA DEEWANA BANAYA!! 🔥🔥',
    boundary: 'FOUR! BOUNDARIES MEIN AUR BHI JAAN HAI!! 💥',
    over:     'OVER DOWN! GAME ON! PRESSURE IS ON!! 🏏',
    momentum: 'MOMENTUM SHIFT! ANYTHING CAN HAPPEN NOW!! 🌪️',
    innings:  'HALFTIME! DUGOUT AI WAR ROOM FULL ALERT! 🚨'
  },
  stats: {
    wicket:   '5th wicket in 10 overs. Team collapse rate up 15%. Partnership needed NOW.',
    six:      'Over mein 2nd six. Required rate 8.2 → 7.1. Batting on top.',
    boundary: 'Last 4 overs: 6 boundaries. Post-powerplay ka best patch.',
    over:     'Economy 8.75 last 4 overs. Bowlers under pressure.',
    momentum: 'NRR impact: +0.42 if chased. Crucial phase ahead.',
    innings:  'Final score analysis pending. Target feasibility loading...'
  },
  prediction: {
    wicket:   'Win probability: 58% → 44%. Middle overs decisive. Need 2 quick wickets.',
    six:      'Required rate comfortable. 73% win probability batting side.',
    boundary: 'Momentum batting side. 68% win probability.',
    over:     'Target achievable. Projected score 185–195. 65% win probability.',
    momentum: 'Momentum shift detected. Game in balance — 51/49 split.',
    innings:  'Target set. Chase probability calculated. Checking conditions...'
  }
};

function getMockContent(agent, event) {
  return MOCK_CONTENT[agent]?.[event] ?? 'Kya match hai yaar! Ekdum mast chal raha hai! 🏏';
}

function buildTelemetry() {
  return state.tasks
    .filter(t => t.status === 'posted')
    .slice(0, 8)
    .map((t, i) => ({
      timestamp: new Date(t.updatedAt).toLocaleTimeString('en-US', { hour12: false }) + `.${String(i * 13 + 44).padStart(2, '0')}`,
      agentId:   `${t.agent.toUpperCase()}_${t.id.split('-')[1] || '0'}`,
      protocol:  'HTTPS_POST',
      status:    'SUCCESS'
    }));
}

// ── Task pipeline ─────────────────────────────────────────────────────────────
async function runPipeline(newTasks, eventType, aiContent) {
  newTasks.forEach((task, i) => {
    const t = () => state.tasks.find(x => x.id === task.id);

    setTimeout(() => {
      const x = t();
      if (x) { x.status = 'processing'; x.updatedAt = new Date().toISOString(); }
      broadcast('taskUpdate', { tasks: state.tasks, match: state.match });
    }, 2000 + i * 400);

    setTimeout(() => {
      const x = t();
      if (!x) return;
      x.status    = 'posted';
      x.updatedAt = new Date().toISOString();
      const agentKey = task.agent;
      x.content = (aiContent && aiContent[agentKey]) ? aiContent[agentKey] : getMockContent(agentKey, eventType);

      if (task.agent === 'prediction') {
        x.metadata = { probability: Math.floor(Math.random() * 30 + 55), confidence: +(Math.random() * 0.2 + 0.78).toFixed(2), team: Math.random() > 0.5 ? 'MI' : 'KKR' };
      } else if (task.agent === 'stats') {
        x.metadata = { stats: { sr: (Math.random() * 60 + 180).toFixed(1), avg: (Math.random() * 20 + 30).toFixed(1), sixes: String(Math.floor(Math.random() * 10 + 12)) } };
      } else if (task.agent === 'meme') {
        x.metadata = { tone: 'CRITICAL ROAST', viralPotential: 'HIGH', aiGenerated: !!aiContent };
      } else {
        x.metadata = { tone: 'MAX ENERGY', engagementSpike: `${Math.floor(Math.random() * 300 + 200)}%`, aiGenerated: !!aiContent };
      }

      broadcast('taskUpdate', { tasks: state.tasks, match: state.match });
    }, 5000 + i * 800);
  });
}

// ── Cricket event handler ─────────────────────────────────────────────────────
async function handleCricketEvents(prevMatch, currMatch) {
  state.match = {
    team1:     currMatch.team1,
    team2:     currMatch.team2,
    score:     currMatch.score,
    overs:     currMatch.overs,
    status:    currMatch.status,
    venue:     currMatch.venue,
    lastEvent: state.match.lastEvent
  };
  state.liveConnected = true;

  if (!prevMatch) {
    console.log(`[Server] 🏏 Live match connected: ${currMatch.team1} vs ${currMatch.team2} | ${currMatch.score} (${currMatch.overs})`);
    broadcast('matchUpdate', { match: state.match, liveConnected: true });
    return;
  }

  const events = detect(prevMatch, currMatch);
  if (!events.length) {
    broadcast('matchUpdate', { match: state.match });
    return;
  }

  for (const evt of events) {
    state.match.lastEvent = `${evt.type.toUpperCase()} — ${evt.detail}`;
    console.log(`[Events] Detected: ${evt.type} | ${evt.detail}`);
    broadcast('newEvent', { event: evt, match: state.match });

    const now   = new Date().toISOString();
    const batch = Date.now();
    const agents = ['meme', 'hype', 'stats', 'prediction'];
    const newTasks = agents.map(agent => ({
      id: `task-${batch}-${agent}`,
      agent, event: evt.type,
      eventDetail: evt.detail,
      status: 'todo',
      content: null,
      createdAt: now,
      updatedAt: now,
      metadata: {}
    }));

    state.tasks.unshift(...newTasks);
    if (state.tasks.length > 40) state.tasks.length = 40;
    broadcast('taskUpdate', { tasks: state.tasks, match: state.match });

    const aiContent = await gemini.generate(evt, state.match);
    await runPipeline(newTasks, evt.type, aiContent);
  }
}

// ── Wire cricket poller ───────────────────────────────────────────────────────
cricket.onUpdate(handleCricketEvents);
cricket.start(20000);

// ── Routes ────────────────────────────────────────────────────────────────────

// SSE endpoint
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  res.write(`event: init\ndata: ${JSON.stringify({ tasks: state.tasks, match: state.match, liveConnected: state.liveConnected })}\n\n`);
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

// REST state snapshot
app.get('/api/state', (req, res) => {
  res.json({
    match:        state.match,
    tasks:        state.tasks,
    telemetry:    buildTelemetry(),
    liveConnected: state.liveConnected,
    systemStatus: {
      ops:     'NOMINAL',
      latency: `${Math.floor(Math.random() * 20 + 14)}MS`,
      clients: sseClients.size
    }
  });
});

// API config hot-swap
app.post('/api/config', (req, res) => {
  const { cricketApiKey, matchId } = req.body;
  if (!cricketApiKey) return res.status(400).json({ success: false, error: 'cricketApiKey required' });

  cricket.stop();
  process.env.CRICKET_API_KEY = cricketApiKey;
  if (matchId) process.env.MATCH_ID = matchId;
  cricket.reset(cricketApiKey, matchId);
  cricket.start(20000);

  console.log(`[Config] API key updated. Match: ${matchId || 'auto-detect'}`);
  res.json({ success: true });
});

// Manual trigger
app.post('/api/trigger', async (req, res) => {
  const { event = 'wicket', detail = 'Manual trigger' } = req.body;
  const now   = new Date().toISOString();
  const batch = Date.now();
  const agents = ['meme', 'hype', 'stats', 'prediction'];
  const newTasks = agents.map(agent => ({
    id: `task-${batch}-${agent}`,
    agent, event,
    eventDetail: detail,
    status: 'todo',
    content: null,
    createdAt: now,
    updatedAt: now,
    metadata: {}
  }));

  state.tasks.unshift(...newTasks);
  if (state.tasks.length > 40) state.tasks.length = 40;
  broadcast('newEvent', { event: { type: event, detail }, match: state.match });
  broadcast('taskUpdate', { tasks: state.tasks, match: state.match });
  res.json({ success: true, count: newTasks.length });

  const mockMatch = cricket.getCurrentState() ?? state.match;
  const aiContent = await gemini.generate({ type: event, detail }, mockMatch);
  await runPipeline(newTasks, event, aiContent);
});

// ── Export as Firebase Function ───────────────────────────────────────────────
exports.api = onRequest(
  { timeoutSeconds: 3600, memory: '512MiB', concurrency: 80 },
  app
);
