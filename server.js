// Football IQ Arena — tiny Node server.
//
//   - Serves the built frontend from /dist (production)
//   - POST /api/ai  -> proxies to the selected LLM with your server-side key
//
// The OpenAI key lives ONLY here (process.env.OPENAI_API_KEY), never in the
// browser. Run with:  npm run build && npm run serve
//
// Node 22+ is required (global fetch + --env-file support).

import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const DIST = join(__dirname, "dist");

// --- AI provider config ----------------------------------------------------
// AI_PROVIDER = claude (default) | openai | groq | gemini
//   openai: needs OPENAI_API_KEY  (pay-per-token)
//   groq:   needs GROQ_API_KEY    (free tier, no card — ~14.4k requests/day)
//   gemini: needs GEMINI_API_KEY  (free tier, no card — ~1.5k requests/day)
const PROVIDER = (process.env.AI_PROVIDER || "claude").toLowerCase();
const API_KEY =
  process.env[
    PROVIDER === "claude"
      ? "ANTHROPIC_API_KEY"
      : PROVIDER === "groq"
        ? "GROQ_API_KEY"
        : PROVIDER === "gemini"
          ? "GEMINI_API_KEY"
          : "OPENAI_API_KEY"
  ] || "";
const DEFAULT_MODELS = {
  claude: "claude-sonnet-4-6",
  openai: "gpt-5-mini",
  groq: "llama-3.3-70b-versatile",
  gemini: "gemini-2.5-flash",
};
const MODEL = process.env.AI_MODEL || DEFAULT_MODELS[PROVIDER] || "gpt-5-mini";

// Temporary cross-device rooms. These are intentionally in-memory for the
// first multiplayer slice: no accounts, no stored camera footage, and rooms
// disappear after inactivity or a server restart.
const rooms = new Map();
const ROOM_TTL_MS = 2 * 60 * 60 * 1000;

function randomId(prefix = "p") {
  return `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

function newRoomCode() {
  let code;
  do code = String(Math.floor(100000 + Math.random() * 900000)); while (rooms.has(code));
  return code;
}

function publicRoom(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    players: [...room.players.values()].map(({ id, name, joinedAt }) => ({ id, name, joinedAt })),
    started: room.started,
    nextEvent: room.events.length ? room.events[room.events.length - 1].seq + 1 : 1,
  };
}

function getRoom(code) {
  const room = rooms.get(code);
  if (!room) return null;
  if (Date.now() - room.updatedAt > ROOM_TTL_MS) {
    rooms.delete(code);
    return null;
  }
  room.updatedAt = Date.now();
  return room;
}

setInterval(() => {
  const cutoff = Date.now() - ROOM_TTL_MS;
  for (const [code, room] of rooms) if (room.updatedAt < cutoff) rooms.delete(code);
}, 15 * 60 * 1000).unref();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
};

// ---------------------------------------------------------------------------
// LLM helpers — one abstraction across OpenAI / Groq / Gemini
// ---------------------------------------------------------------------------

async function openaiStyleComplete(endpoint, messages, { json, maxTokens, temperature }) {
  const body = {
    model: MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
    ...(json ? { response_format: { type: "json_object" } } : {}),
  };
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${PROVIDER} ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function geminiComplete(messages, { json, maxTokens, temperature }) {
  const system = messages.find((m) => m.role === "system")?.content ?? "";
  const user = messages.filter((m) => m.role === "user").map((m) => m.content).join("\n\n");
  const body = {
    system_instruction: system ? { parts: [{ text: system }] } : undefined,
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      ...(json ? { responseMimeType: "application/json" } : {}),
    },
  };
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(API_KEY)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`gemini ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
}

async function claudeComplete(messages, { maxTokens, temperature }) {
  const system = messages.find((m) => m.role === "system")?.content ?? "";
  const body = {
    model: MODEL,
    max_tokens: maxTokens,
    temperature,
    ...(system ? { system } : {}),
    messages: messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content })),
  };
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`claude ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.content?.filter((block) => block.type === "text").map((block) => block.text).join("") ?? "";
}

async function modelComplete(messages, { json = false, maxTokens = 700, temperature = 0.4 } = {}) {
  if (PROVIDER === "claude") return claudeComplete(messages, { maxTokens, temperature });
  if (PROVIDER === "groq") {
    return openaiStyleComplete("https://api.groq.com/openai/v1/chat/completions", messages, {
      json,
      maxTokens,
      temperature,
    });
  }
  if (PROVIDER === "gemini") {
    return geminiComplete(messages, { json, maxTokens, temperature });
  }
  return openaiStyleComplete("https://api.openai.com/v1/chat/completions", messages, {
    json,
    maxTokens,
    temperature,
  });
}

function parseJson(content) {
  try {
    return JSON.parse(content);
  } catch {
    // the model occasionally wraps JSON in ``` fences
    const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1]);
    throw new Error("Invalid JSON from model");
  }
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

async function handleVerify(payload) {
  const { text, question, said } = payload || {};
  if (!text || !question) throw Object.assign(new Error("Missing text/question"), { status: 400 });
  const answers = Array.isArray(question.answer) ? question.answer.join(", ") : String(question.answer ?? "");
  const saidList = Array.isArray(said) && said.length ? said.join(", ") : "(none yet)";
  const prompt = `You are the strict-but-fair answer judge for "Football IQ Arena", a host-led football trivia game show.
QUESTION: ${question.prompt ?? ""} ${question.sub ?? ""}
CORRECT ANSWERS: ${answers || "(host judges list answers)"}
ALREADY ACCEPTED NAMES: ${saidList}
PLAYER SAID: "${text}"

HARD RULES:
- Accept the answer ONLY if it clearly matches one of the CORRECT ANSWERS, or a common spelling/nickname/partial name of it (e.g. "CR7" for Cristiano Ronaldo, "Madird" for Madrid).
- NEVER accept an unrelated answer (a different club, player, country, or year).
- If the answer is a different but plausible-sounding entity, it is WRONG.
- If you are not confident, correct MUST be false.
- For list/timed questions, the answer only counts if it is a NEW valid entry not already accepted.
- For true/false questions, the player must say true/false (or equivalents like correct/wrong).

EXAMPLES:
QUESTION: Which club paid a record fee for Ronaldo in 2009? ANSWERS: Real Madrid
"Real Madird" -> {"correct": true}
"Barcelona" -> {"correct": false}
"Arsenal" -> {"correct": false}

Reply with ONLY JSON, no commentary:
{"correct": boolean, "display": "one short TV-host-style sentence", "matched": "the canonical answer matched, or null"}`;

  const content = await modelComplete(
    [
      { role: "system", content: "You judge football trivia answers. Output JSON only." },
      { role: "user", content: prompt },
    ],
    { json: true, maxTokens: 300, temperature: 0.2 }
  );
  const parsed = parseJson(content);
  return {
    correct: Boolean(parsed.correct),
    display: typeof parsed.display === "string" ? parsed.display : parsed.correct ? "Correct!" : "Incorrect.",
    matched: typeof parsed.matched === "string" ? parsed.matched : null,
  };
}

async function handleGenerate(payload) {
  const { category, difficulty } = payload || {};
  if (!category || !difficulty) throw Object.assign(new Error("Missing category/difficulty"), { status: 400 });
  const prompt = `You are the question writer for "Football IQ Arena", a football trivia game show.
Create ONE original, factually accurate football trivia question.
CATEGORY: ${category}
DIFFICULTY: ${difficulty} (easy, medium, hard or legendary)

Rules:
- Single, clear, unambiguous question (no lists, no "name 3 players").
- Factually accurate — never invent stats, transfers, winners or records.
- Prefer questions a real football fan could reasonably know.
- Include a short fun explanation and a useful hint.

Reply with ONLY JSON:
{"prompt": "the question text", "sub": "optional second line or null", "answer": ["one canonical answer"], "aliases": ["common alternate spellings/nicknames"], "explanation": "short fun fact", "hint": "optional clue or null"}`;

  const content = await modelComplete(
    [
      { role: "system", content: "You write accurate football trivia questions. Output JSON only." },
      { role: "user", content: prompt },
    ],
    { json: true, maxTokens: 700, temperature: 0.9 }
  );
  const p = parseJson(content);
  if (!p.prompt || !Array.isArray(p.answer) || !p.answer.length) {
    throw new Error("Malformed question from model");
  }
  return {
    prompt: String(p.prompt),
    sub: typeof p.sub === "string" ? p.sub : null,
    answer: p.answer.slice(0, 4).map(String),
    aliases: Array.isArray(p.aliases) ? p.aliases.slice(0, 6).map(String) : [],
    explanation: typeof p.explanation === "string" ? p.explanation : "An AI-generated question.",
    hint: typeof p.hint === "string" ? p.hint : null,
  };
}

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

async function readJson(req) {
  const raw = await readBody(req);
  try {
    return JSON.parse(raw || "{}");
  } catch {
    throw Object.assign(new Error("Invalid JSON"), { status: 400 });
  }
}

async function readBody(req, limit = 64 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error("Payload too large"), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

const server = createServer(async (req, res) => {
  // CORS (dev server runs on a different port)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  // --- temporary multiplayer rooms ---------------------------------------
  if (url.pathname === "/api/rooms" && req.method === "POST") {
    const body = await readJson(req);
    const code = newRoomCode();
    const hostId = randomId("host");
    const room = {
      code,
      hostId,
      players: new Map([[hostId, { id: hostId, name: String(body.name || "Host").slice(0, 24), joinedAt: Date.now() }]]),
      events: [],
      nextSeq: 1,
      started: false,
      state: null,
      chat: [],
      nextChatSeq: 1,
      updatedAt: Date.now(),
    };
    rooms.set(code, room);
    return sendJson(res, 201, { ...publicRoom(room), playerId: hostId, isHost: true });
  }

  const roomMatch = url.pathname.match(/^\/api\/rooms\/([0-9]{6})(?:\/(join|events|state|chat))?$/);
  if (roomMatch) {
    const code = roomMatch[1];
    const action = roomMatch[2];
    const room = getRoom(code);
    if (!room) return sendJson(res, 404, { error: "Room not found or expired" });

    if (action === "join" && req.method === "POST") {
      const body = await readJson(req);
      const playerId = randomId("p");
      room.players.set(playerId, { id: playerId, name: String(body.name || "Player").slice(0, 24), joinedAt: Date.now() });
      room.events.push({ seq: room.nextSeq++, type: "player_joined", player: room.players.get(playerId) });
      return sendJson(res, 201, { ...publicRoom(room), playerId, isHost: false });
    }

    if (action === "events" && req.method === "GET") {
      const since = Math.max(0, Number(url.searchParams.get("since") || 0));
      return sendJson(res, 200, { ...publicRoom(room), events: room.events.filter((event) => event.seq > since) });
    }

    if (action === "events" && req.method === "POST") {
      const body = await readJson(req);
      if (!room.players.has(body.playerId)) return sendJson(res, 403, { error: "Player is not in this room" });
      if (body.type === "start") {
        if (body.playerId !== room.hostId) return sendJson(res, 403, { error: "Only the host can start the match" });
        room.started = true;
      }
      room.events.push({ seq: room.nextSeq++, type: String(body.type || "event"), payload: body.payload ?? null, playerId: body.playerId });
      return sendJson(res, 200, publicRoom(room));
    }

    if (action === "state" && req.method === "GET") {
      const since = Math.max(0, Number(url.searchParams.get("since") || 0));
      return sendJson(res, 200, { ...publicRoom(room), state: room.state, events: room.events.filter((event) => event.seq > since) });
    }

    if (action === "state" && req.method === "POST") {
      const body = await readJson(req);
      if (body.playerId !== room.hostId) return sendJson(res, 403, { error: "Only the host can publish game state" });
      room.state = body.state ?? null;
      room.updatedAt = Date.now();
      return sendJson(res, 200, { ok: true });
    }

    if (action === "chat" && req.method === "GET") {
      const since = Math.max(0, Number(url.searchParams.get("since") || 0));
      return sendJson(res, 200, { messages: room.chat.filter((message) => message.seq > since) });
    }

    if (action === "chat" && req.method === "POST") {
      const body = await readJson(req);
      if (!room.players.has(body.playerId)) return sendJson(res, 403, { error: "Player is not in this room" });
      const text = String(body.text || "").trim().slice(0, 500);
      if (!text) return sendJson(res, 400, { error: "Message cannot be empty" });
      const message = { seq: room.nextChatSeq++, playerId: body.playerId, name: room.players.get(body.playerId).name, text, scope: body.scope === "team" ? "team" : "room", sentAt: Date.now() };
      room.chat.push(message);
      if (room.chat.length > 200) room.chat.shift();
      return sendJson(res, 201, message);
    }

    if (!action && req.method === "GET") return sendJson(res, 200, publicRoom(room));
  }

  if (url.pathname === "/api/health") {
    return sendJson(res, 200, { ok: true, provider: PROVIDER, ai: Boolean(API_KEY), model: MODEL });
  }

  if (url.pathname === "/api/ai" && req.method === "POST") {
    if (!API_KEY) {
      return sendJson(res, 503, {
        error: `No API key for provider '${PROVIDER}' — set ${PROVIDER === "claude" ? "ANTHROPIC_API_KEY" : PROVIDER === "groq" ? "GROQ_API_KEY" : PROVIDER === "gemini" ? "GEMINI_API_KEY" : "OPENAI_API_KEY"} in .env`,
      });
    }
    let payload;
    try {
      payload = JSON.parse(await readBody(req));
    } catch (e) {
      return sendJson(res, e.status || 400, { error: e.message || "Bad request" });
    }
    try {
      const data = payload.action === "generate" ? await handleGenerate(payload) : await handleVerify(payload);
      return sendJson(res, 200, data);
    } catch (e) {
      console.error("[api/ai]", e.message);
      return sendJson(res, e.status || 502, { error: e.message || "AI upstream error" });
    }
  }

  // --- static files from dist ---
  try {
    let filePath = join(DIST, url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname));
    // prevent path traversal
    if (!filePath.startsWith(DIST)) {
      res.writeHead(403);
      return res.end("Forbidden");
    }
    let st;
    try {
      st = await stat(filePath);
    } catch {
      // SPA fallback
      filePath = join(DIST, "index.html");
      st = await stat(filePath);
    }
    if (st.isDirectory()) filePath = join(filePath, "index.html");
    const body = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[extname(filePath)] || "application/octet-stream",
      "Cache-Control": filePath.endsWith("index.html") ? "no-cache" : "public, max-age=31536000, immutable",
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n❌ Port ${PORT} is already in use.`);
    console.error(`   Is another instance running? Stop it first:`);
    console.error(`     pkill -f server.js`);
    console.error(`   Or run on a different port:`);
    console.error(`     PORT=8899 npm run serve\n`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, () => {
  console.log(`⚽ Football IQ Arena serving on http://localhost:${PORT}`);
  console.log(`   AI provider: ${PROVIDER} · model: ${MODEL} · ${API_KEY ? "enabled" : `DISABLED — set ${PROVIDER === "claude" ? "ANTHROPIC_API_KEY" : PROVIDER === "groq" ? "GROQ_API_KEY" : PROVIDER === "gemini" ? "GEMINI_API_KEY" : "OPENAI_API_KEY"} in .env`}`);
});
