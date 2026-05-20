/**
 * cricket.js — CricketData.org live IPL poller
 * Polls every 20s. Emits normalized match state.
 */

const axios = require('axios');

const BASE = 'https://api.cricapi.com/v1';

// Read dynamically so /api/config hot-swap takes effect immediately
const getKey     = () => process.env.CRICKET_API_KEY;
const getMatchId = () => process.env.MATCH_ID || '5b1d59f9-51fd-449d-8cf1-9fc15ef15675';

let _prevState = null;
let _currState = null;
let _listeners = [];
let _timer     = null;

// ── Normalize raw API match into our state shape ──────────────────────────────
function normalize(match) {
  const t1    = match.teams?.[0] ?? match.t1 ?? 'TBD';
  const t2    = match.teams?.[1] ?? match.t2 ?? 'TBD';

  const score = (match.score ?? []).find(s => !s.inning?.toLowerCase().includes('2nd'))
             || match.score?.[0]
             || null;

  const scoreStr = score
    ? `${score.r ?? '?'}/${score.w ?? '?'}`
    : (match.t1s ?? '?');
  const overs    = score?.o ?? (match.matchStarted ? '?.?' : '0.0');

  return {
    matchId:   match.id,
    team1:     t1,
    team2:     t2,
    score:     scoreStr,
    overs:     String(overs),
    status:    match.matchStarted && !match.matchEnded ? 'LIVE' : (match.matchEnded ? 'ENDED' : 'UPCOMING'),
    venue:     match.venue ?? 'Unknown',
    lastEvent: null,
    raw:       match
  };
}

// ── Fetch specific match by ID via /match_info ────────────────────────────────
async function fetchMatchById(matchId) {
  try {
    const { data } = await axios.get(`${BASE}/match_info`, {
      params: { apikey: getKey(), id: matchId }
    });
    if (!data?.data) throw new Error('Empty match_info response');
    return normalize(data.data);
  } catch (err) {
    console.error('[Cricket] match_info error:', err.response?.data?.message ?? err.message);
    return null;
  }
}

// ── Find current IPL live match ───────────────────────────────────────────────
async function fetchLiveIPL() {
  const target = await fetchMatchById(getMatchId());
  if (target) {
    console.log(`[Cricket] ✅ ${target.team1} vs ${target.team2} | ${target.score} (${target.overs}) | ${target.status}`);
    return target;
  }

  try {
    console.warn('[Cricket] Target match unavailable — scanning currentMatches...');
    const { data } = await axios.get(`${BASE}/currentMatches`, {
      params: { apikey: getKey(), offset: 0 }
    });

    if (!data?.data) throw new Error('No data array');

    const live = data.data.find(m =>
      m.matchStarted && !m.matchEnded &&
      (m.matchType === 't20' || (m.name ?? '').toLowerCase().includes('ipl'))
    ) || data.data.find(m => m.matchStarted && !m.matchEnded);

    if (!live) return null;
    return normalize(live);
  } catch (err) {
    console.error('[Cricket] Fetch error:', err.message);
    return null;
  }
}

// ── Subscribe to state changes ────────────────────────────────────────────────
function onUpdate(fn) { _listeners.push(fn); }

function _emit(prev, curr) {
  _listeners.forEach(fn => {
    try { fn(prev, curr); } catch (e) { console.error('[Cricket] listener error:', e); }
  });
}

// ── Poll loop ─────────────────────────────────────────────────────────────────
async function _poll() {
  const next = await fetchLiveIPL();
  if (next) {
    const isFirstPoll = !_currState;
    _prevState = _currState;
    _currState = next;
    // Emit on first poll too (prev = null means initial connect)
    _emit(_prevState, _currState);
    if (isFirstPoll) {
      console.log('[Cricket] 🔌 Initial state locked — broadcasting to clients');
    }
  }
}

function start(intervalMs = 20000) {
  if (_timer) return;
  _poll(); // immediate first poll
  _timer = setInterval(_poll, intervalMs);
  console.log('[Cricket] Polling started, interval:', intervalMs + 'ms');
}

function stop() {
  if (_timer) { clearInterval(_timer); _timer = null; }
}

function getCurrentState() { return _currState; }
function getPrevState()    { return _prevState; }

// ── Hot-swap credentials (called by /api/config) ─────────────────────────────
function reset(newApiKey, newMatchId) {
  if (newApiKey) process.env.CRICKET_API_KEY = newApiKey;
  if (newMatchId) process.env.MATCH_ID = newMatchId;
  _prevState = null;
  _currState = null;
  console.log(`[Cricket] Credentials reset. Key: ${(newApiKey||'').slice(0,8)}... Match: ${newMatchId || 'auto'}`);
}

module.exports = { start, stop, onUpdate, getCurrentState, getPrevState, reset };
