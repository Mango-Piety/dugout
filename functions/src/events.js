/**
 * events.js — Cricket event detection engine
 * Diffs prev vs current match state, returns detected events.
 */

// ── Parse "151/4" → { runs: 151, wickets: 4 } ────────────────────────────────
function parseScore(str) {
  if (!str || typeof str !== 'string') return { runs: 0, wickets: 0 };
  const [r, w] = str.split('/');
  return { runs: parseInt(r) || 0, wickets: parseInt(w) || 0 };
}

// ── Parse "16.3" → total balls ────────────────────────────────────────────────
function parseBalls(overs) {
  if (!overs) return 0;
  const [o, b = 0] = String(overs).split('.').map(Number);
  return o * 6 + b;
}

// ── Main diff function ────────────────────────────────────────────────────────
/**
 * detect(prev, curr)
 * Returns array of event objects: { type, detail, severity }
 * event types: wicket | six | boundary | over | innings | momentum
 */
function detect(prev, curr) {
  if (!prev || !curr) return [];

  const pScore = parseScore(prev.score);
  const cScore = parseScore(curr.score);
  const pBalls = parseBalls(prev.overs);
  const cBalls = parseBalls(curr.overs);

  const runDelta     = cScore.runs    - pScore.runs;
  const wicketDelta  = cScore.wickets - pScore.wickets;
  const ballDelta    = cBalls - pBalls;

  const events = [];

  // Innings change — detect score reset (runs dropped significantly)
  if (cScore.runs < pScore.runs - 5 && curr.status === 'LIVE') {
    events.push({
      type:   'innings',
      detail: `Innings complete. ${prev.team1} set ${pScore.runs}/${pScore.wickets}`,
      severity: 'HIGH'
    });
    return events; // don't diff further on innings reset
  }

  // Wicket
  if (wicketDelta > 0) {
    events.push({
      type:   'wicket',
      detail: `${wicketDelta} wicket${wicketDelta > 1 ? 's' : ''} fell! Score: ${curr.score} in ${curr.overs} overs`,
      severity: wicketDelta >= 2 ? 'CRITICAL' : 'HIGH'
    });
  }

  // Six (6 runs in one ball-ish window, no wicket)
  if (runDelta >= 6 && wicketDelta === 0 && ballDelta <= 1) {
    events.push({
      type:   'six',
      detail: `SIX! ${curr.score} in ${curr.overs} overs — ${runDelta} runs off ball`,
      severity: 'HIGH'
    });
  } else if (runDelta === 4 && wicketDelta === 0 && ballDelta <= 1) {
    // Boundary
    events.push({
      type:   'boundary',
      detail: `FOUR! ${curr.score} in ${curr.overs} overs`,
      severity: 'MEDIUM'
    });
  }

  // Over completed
  const prevOver = Math.floor(parseBalls(prev.overs) / 6);
  const currOver = Math.floor(parseBalls(curr.overs) / 6);
  if (currOver > prevOver) {
    events.push({
      type:   'over',
      detail: `Over ${currOver} complete. ${runDelta} runs, ${wicketDelta} wickets this over.`,
      severity: 'LOW'
    });
  }

  // Momentum shift: 3+ runs/ball rate OR multiple wickets in quick succession
  const rpo = ballDelta > 0 ? (runDelta / ballDelta) * 6 : 0;
  if (!events.length && rpo >= 18 && runDelta >= 3) {
    events.push({
      type:   'momentum',
      detail: `Momentum shift! ${curr.team1} vs ${curr.team2} — ${runDelta} runs in last delivery window`,
      severity: 'MEDIUM'
    });
  }

  return events;
}

module.exports = { detect };
