# Dugout AI — MVP Roadmap

## Phase 1: Foundation & Frontend Shell ✅ COMPLETE
- [x] Read PRD + design system
- [x] Node.js Express server scaffold
- [x] Serve dynamic SPA from `public/`
- [x] Desktop 3-column Kanban layout
- [x] Mobile tab-switching (bottom nav)
- [x] Dynamic card rendering per agent (Meme / Hype / Stats / Prediction)
- [x] Mock tasks pre-loaded in all 3 states (TODO / PROCESSING / POSTED)
- [x] Dev trigger panel (fire fake events to test UI)
- [x] Match score in header
- [x] Telemetry log table
- [x] Server at localhost:3000

---

## Phase 2: Cricket API + Event Detection ✅ COMPLETE
- [x] `.env` with `CRICKET_API_KEY`
- [x] `src/cricket.js` — poll CricketData.org every 20s
- [x] `src/events.js` — diff prev vs current state
- [x] Detect: wicket / boundary / six / over / innings / momentum
- [x] On event: create 4 tasks (one per agent) → push to TODO
- [x] Fallback: mock via dev trigger when no live match

---

## Phase 3: Gemini AI Integration ✅ COMPLETE
- [x] `.env` with `GEMINI_API_KEY`
- [x] `src/gemini.js` — single call → 4-agent JSON output
- [x] Hinglish prompts per agent persona
- [x] Task lifecycle: TODO → PROCESSING → POSTED (with real AI content)
- [x] Error handling + mock fallback on Gemini failure
- [x] Rate-limit guard (10s min interval, free-tier safe)

---

## Phase 4: Real-time Frontend Sync ✅ COMPLETE
- [x] SSE endpoint `GET /api/events` on backend
- [x] Frontend subscribes to SSE (replaced polling)
- [x] Cards animate into columns on state change
- [x] Telemetry updates live
- [x] Match score header updates from live data
- [x] "NEW EVENT" flash banner on event detect
- [x] Live connection status indicator (CONNECTING / LIVE CRICKET API / NO MATCH)

---

## Phase 5: Firebase Deploy
- [ ] Firebase project init
- [ ] Firestore schema: `tasks`, `events`, `matchState`
- [ ] Swap in-memory state → Firestore reads/writes
- [ ] Firebase Functions for backend (cricket poll + Gemini)
- [ ] Firebase Hosting for frontend
- [ ] Live URL working

---

## Pause Points
- After **Phase 1** → review UI + kanban flow ✅
- After **Phase 3** → review AI output quality + Hinglish tone ← YOU ARE HERE
- After **Phase 5** → final review before demo
