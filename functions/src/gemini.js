/**
 * gemini.js — Single Gemini call → 4-agent JSON output
 * Uses gemini-2.0-flash-lite (free-tier friendly, fast)
 */

const axios = require('axios');

const GEMINI_KEY   = process.env.GEMINI_API_KEY;
const MODEL        = 'gemini-2.0-flash-lite';
const API_BASE     = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// Rate limit guard — max 1 call per 10s
let _lastCallAt = 0;
const MIN_INTERVAL = 10000;

// ── Build prompt ──────────────────────────────────────────────────────────────
function buildPrompt(event, matchState) {
  return `You are an AI content generation system for IPL cricket social media.

Match Context:
- Teams: ${matchState.team1} vs ${matchState.team2}
- Score: ${matchState.score} in ${matchState.overs} overs
- Venue: ${matchState.venue}
- Event: ${event.type.toUpperCase()} — ${event.detail}

Generate content for 4 specialized cricket AI agents reacting to this event.
All content must feel authentic, natural, Hinglish (mix of Hindi + English), and platform-native.

Respond ONLY with valid JSON (no markdown, no explanation):

{
  "meme": "<funny, chaotic, savage Hinglish meme/banter tweet — max 140 chars — use emojis>",
  "hype": "<energetic stadium-style fan hype reaction — all caps, max 120 chars — use fire emojis>",
  "stats": "<smart analyst insight with actual match stats context — 1-2 sentences — English OK>",
  "prediction": "<dramatic win probability or momentum prediction — confident analyst tone — max 120 chars>"
}

Rules:
- meme: Twitter/Instagram banter energy, savage but fun, Hinglish mandatory
- hype: Stadium PA announcer energy, ALL CAPS sections OK, passionate
- stats: Smart, specific, reference the actual score/overs/event in stats
- prediction: Bold prediction, cite rough % probability, dramatic
- NO robotic AI language
- NO formal English
- Keep it real, keep it IPL`;
}

// ── Parse Gemini response ─────────────────────────────────────────────────────
function parseResponse(text) {
  try {
    // Strip potential markdown fences
    const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    return JSON.parse(clean);
  } catch {
    // Fallback: try to extract JSON object
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* fall through */ }
    }
    console.error('[Gemini] Parse failed, raw:', text.slice(0, 200));
    return null;
  }
}

// ── Main generate function ────────────────────────────────────────────────────
/**
 * generate(event, matchState)
 * Returns { meme, hype, stats, prediction } or null on failure
 */
async function generate(event, matchState) {
  const now = Date.now();
  if (now - _lastCallAt < MIN_INTERVAL) {
    console.warn('[Gemini] Rate limit guard — skipping call');
    return null;
  }
  _lastCallAt = now;

  const prompt = buildPrompt(event, matchState);

  try {
    const { data } = await axios.post(
      `${API_BASE}?key=${GEMINI_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature:     0.85,
          maxOutputTokens: 512,
          responseMimeType: 'application/json'
        }
      },
      { timeout: 15000 }
    );

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty Gemini response');

    const parsed = parseResponse(text);
    if (!parsed) throw new Error('Could not parse JSON from Gemini');

    console.log('[Gemini] Generated outputs for event:', event.type);
    return parsed;

  } catch (err) {
    console.error('[Gemini] API error:', err.response?.data?.error?.message ?? err.message);
    return null;
  }
}

module.exports = { generate };
