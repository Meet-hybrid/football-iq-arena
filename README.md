# ⚽ Football IQ Arena

The AI-powered, host-led football quiz game show. Gather 2–10 players, pick a
category, and let the AI host put your ball knowledge to the test — answer
verbally, steal points, and climb the leaderboard.

## Features

- **17 categories** — Clubs, Transfers, Ballon d'Or, World Cup, Champions League,
  Premier League, National Teams, Managers, Guess the Player/Club/Stadium,
  Career Path, Jersey Numbers, Records, True or False, This or That, Timed Challenges
- **8 game modes** — Classic, Sudden Death, Time Attack, Tournament (1v1 brackets),
  Knockout, League Table, Random Mix, Party Mode
- **4 difficulty levels** — Easy → Legendary, biasing the question mix
- **House rules** — question value, steal value, steal count, tournament target
- **Steal mechanic** — miss a question and opponents can steal it for +1
- **AI host** — simulated presenter personality with text-to-speech reading
  questions aloud (Web Speech API), speech-to-text for spoken answers, and fuzzy
  answer verification tolerant of spelling variations
- **Spin-the-wheel category selector**, live animated scoreboard, daily challenge
  with streaks, career stats, achievements and a weekly leaderboard
- **Stadium atmosphere** — fully synthesised sound effects (Web Audio), crowd
  ambience, confetti and game-show styling
- **Mobile-first** responsive UI with Framer Motion animations

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Framer Motion
- Web Speech API (TTS/STT) · Web Audio API (SFX)
- Zero backend — the "AI" is a local simulation module
  (`src/ai/`) designed to be swapped for real OpenAI calls later

## Getting started

```bash
npm install
npm run dev
```

```bash
npm run build   # typecheck + production build
```

## Live AI (real OpenAI)

The app ships with a full local simulation, but you can flip it to real OpenAI:

1. Get a key at [platform.openai.com](https://platform.openai.com) — add prepaid
   credit under **Settings → Billing** first, or calls return `429 quota exceeded`.
2. Copy the key into a local `.env` (already gitignored):
   ```
   OPENAI_API_KEY=sk-proj-...
   OPENAI_MODEL=gpt-5-mini
   ```
3. Run the proxy and the app:
   ```bash
   npm run build
   npm run serve        # http://localhost:8787 — serves dist + POST /api/ai
   # in a second terminal, for hot reload:
   npm run dev          # vite proxies /api to the proxy automatically
   ```
4. Toggle **🤖 Live AI** on the home screen.

The OpenAI key lives only in `server.js` (via `process.env`) — it never ships to
the browser. If the API is unreachable, quota-limited, or toggled off, the app
silently falls back to the local question bank and fuzzy matcher (each AI check
shows a `🤖 AI verified` / `💾 local check` badge).

The server is a single zero-dependency Node file (Node 22+); it also serves the
production build, so the whole app + AI proxy deploys as one unit.

## Roadmap (MVP → full spec)

- [x] Local question bank (170+ questions, all 17 categories)
- [x] Simulated AI host, answer verification, hints, explanations
- [x] Real OpenAI answer verification + question generation (server-side proxy)
- [x] 8 game modes, house rules, team mode, stats & achievements
- [ ] NestJS + PostgreSQL + Prisma backend, Socket.IO realtime multiplayer
- [ ] QR join codes, accounts (Clerk/Auth.js), seasonal question packs
- [ ] Voice answers with Whisper, offline question packs
