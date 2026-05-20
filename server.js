require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const cricket = require('./src/cricket');
const { detect } = require('./src/events');
const gemini  = require('./src/gemini');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
    team1: 'MI', team2: 'KKR',
    score: '151/4', overs: '16.3',
    status: 'LIVE', venue: 'Eden Gardens',
    lastEvent: 'SIX — Russell goes downtown!'
  },
  tasks: [
    {
      id: 'task-001', agent: 'meme', event: 'wicket',
      eventDetail: 'Kohli OUT! LBW b Bumrah',
      status: 'posted',
      content: 'MI ka middle order toh loading screen pe hi reh gaya 💀',
      createdAt: new Date(Date.now() - 134000).toISOString(),
      updatedAt: new Date(Date.now() - 130000).toISOString(),
      metadata: { tone: 'CRITICAL ROAST', viralPotential: 'HIGH' }
    },
    {
      id: 'task-002', agent: 'hype', event: 'six',
      eventDetail: 'Russell 6! Over mid-wicket!',
      status: 'posted',
      content: 'EDEN GARDENS PURE CHAOS MODE MEIN 🔥🔥🔥',
      createdAt: new Date(Date.now() - 285000).toISOString(),
      updatedAt: new Date(Date.now() - 280000).toISOString(),
      metadata: { tone: 'MAX ENERGY', engagementSpike: '400%' }
    },
    {
      id: 'task-003', agent: 'stats', event: 'boundary',
      eventDetail: 'Russell 4! Through covers',
      status: 'posted',
      content: 'Russell ka death overs strike rate iss season 220+ hai. MI needs wide yorkers.',
      createdAt: new Date(Date.now() - 492000).toISOString(),
      updatedAt: new Date(Date.now() - 488000).toISOString(),
      metadata: { stats: { sr: '224.1', avg: '42.5', sixes: '18' } }
    },
    {
      id: 'task-004', agent: 'prediction', event: 'momentum',
      eventDetail: 'Momentum shift detected after 3 wickets',
      status: 'posted',
      content: 'Agar next over mein wicket nahi gira toh KKR game pull kar lega.',
      createdAt: new Date(Date.now() - 750000).toISOString(),
      updatedAt: new Date(Date.now() - 745000).toISOString(),
      metadata: { probability: 72, confidence: 0.88, team: 'KKR' }
    },
    {
      id: 'task-005', agent: 'meme', event: 'over',
      eventDetail: 'Over 16 completed — 14 runs',
      status: 'processing', content: null,
      createdAt: new Date(Date.now() - 35000).toISOString(),
      updatedAt: new Date(Date.now() - 12000).toISOString(),
      metadata: {}
    },
    {
      id: 'task-006', agent: 'stats', event: 'over',
      eventDetail: 'Over 16 completed — 14 runs',
      status: 'processing', content: null,
      createdAt: new Date(Date.now() - 35000).toISOString(),
      updatedAt: new Date(Date.now() - 10000).toISOString(),
      metadata: {}
    },
    {
      id: 'task-007', agent: 'hype', event: 'six',
      eventDetail: 'Russell 6! Latest ball',
      status: 'todo', content: null,
      createdAt: new Date(Date.now() - 8000).toISOString(),
      updatedAt: new Date(Date.now() - 8000).toISOString(),
      metadata: {}
    },
    {
      id: 'task-008', agent: 'prediction', event: 'six',
      eventDetail: 'Russell 6! Latest ball',
      status: 'todo', content: null,
      createdAt: new Date(Date.now() - 8000).toISOString(),
      updatedAt: new Date(Date.now() - 8000).toISOString(),
      metadata: {}
    }
  ],
  telemetry: [],
  liveConnected: false  // true once cricket API has responded
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
      agentId:   `${t.agent.toUpperCase()}_${t.id.split('-')[1]}`,
      protocol:  'HTTPS_POST',
      status:    'SUCCESS'
    }));
}

// ── Task pipeline helper ──────────────────────────────────────────────────────
async function runPipeline(newTasks, eventType, aiContent) {
  const agents = ['meme', 'hype', 'stats', 'prediction'];
  newTasks.forEach((task, i) => {
    const t = () => state.tasks.find(x => x.id === task.id);

    // → PROCESSING
    setTimeout(() => {
      const x = t();
      if (x) { x.status = 'processing'; x.updatedAt = new Date().toISOString(); }
      broadcast('taskUpdate', { tasks: state.tasks, match: state.match });
    }, 2000 + i * 400);

    // → POSTED (with real AI content if available, else mock)
    setTimeout(() => {
      const x = t();
      if (!x) return;
      x.status  = 'posted';
      x.updatedAt = new Date().toISOString();

      // Use real AI output if Gemini succeeded
      const agentKey = task.agent;
      x.content = (aiContent && aiContent[agentKey]) ? aiContent[agentKey] : getMockContent(agentKey, eventType);

      // Metadata
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
  // Update match state in memory
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

  // First poll — no previous state to diff, just broadcast the live score
  if (!prevMatch) {
    console.log(`[Server] 🏏 Live match connected: ${currMatch.team1} vs ${currMatch.team2} | ${currMatch.score} (${currMatch.overs})`);
    broadcast('matchUpdate', { match: state.match, liveConnected: true });
    return;
  }

  const events = detect(prevMatch, currMatch);
  if (!events.length) {
    // Still broadcast updated score even if no event
    broadcast('matchUpdate', { match: state.match });
    return;
  }

  for (const evt of events) {
    state.match.lastEvent = `${evt.type.toUpperCase()} — ${evt.detail}`;
    console.log(`[Events] Detected: ${evt.type} | ${evt.detail}`);

    // Broadcast new event flash
    broadcast('newEvent', { event: evt, match: state.match });

    // Create 4 tasks
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

    // Call Gemini once for all 4 agents
    const aiContent = await gemini.generate(evt, state.match);

    // Run lifecycle pipeline
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

  // Send current state immediately
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

  // Restart poller with new credentials
  cricket.stop();
  process.env.CRICKET_API_KEY = cricketApiKey;
  if (matchId) process.env.MATCH_ID = matchId;
  cricket.reset(cricketApiKey, matchId);
  cricket.start(20000);

  console.log(`[Config] API key updated. Match: ${matchId || 'auto-detect'}`);
  res.json({ success: true });
});

// Manual trigger (dev panel + live fallback)
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

  // Gemini call
  const mockMatch = cricket.getCurrentState() ?? state.match;
  const aiContent = await gemini.generate({ type: event, detail }, mockMatch);
  await runPipeline(newTasks, event, aiContent);
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const matchId = process.env.MATCH_ID || '5b1d59f9-51fd-449d-8cf1-9fc15ef15675';
  console.log(`\n🏏 Dugout AI → http://localhost:${PORT}`);
  console.log(`   Cricket API: ${process.env.CRICKET_API_KEY ? '✅' : '❌ missing'}`);
  console.log(`   Gemini API:  ${process.env.GEMINI_API_KEY  ? '✅' : '❌ missing'}`);
  console.log(`   Match ID:    ${matchId} (KKR vs MI, Match 65)\n`);
});
