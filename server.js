// Football IQ Arena — tiny Node server.
//
//   - Serves the built frontend from /dist (production)
//   - POST /api/ai  -> proxies to OpenAI with your server-side key
//
// The OpenAI key lives ONLY here (process.env.OPENAI_API_KEY), never in the
// browser. Run with:  npm run build && npm run serve
//
// Node 22+ is required (global fetch + --env-file support).

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const DIST = join(__dirname, "dist");
const API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

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
// OpenAI helper
// ---------------------------------------------------------------------------

async function openaiComplete(messages, { json = false, maxTokens = 700, temperature = 0.4 } = {}) {
  const body = {
    model: MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
    ...(json ? { response_format: { type: "json_object" } } : {}),
  };
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
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

Decide if the answer is correct. Accept common spelling variations, nicknames, partial names and translations (e.g. "CR7" for Cristiano Ronaldo). For list/timed questions, the answer only counts if it is a NEW valid entry not already accepted. For true/false questions the player must say true/false (or equivalents).

Reply with ONLY JSON, no commentary:
{"correct": boolean, "display": "one short TV-host-style sentence", "matched": "the canonical answer matched, or null"}`;

  const content = await openaiComplete(
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

  const content = await openaiComplete(
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

  if (url.pathname === "/api/health") {
    return sendJson(res, 200, { ok: true, ai: Boolean(API_KEY), model: MODEL });
  }

  if (url.pathname === "/api/ai" && req.method === "POST") {
    if (!API_KEY) return sendJson(res, 503, { error: "OPENAI_API_KEY not set on the server" });
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
      return sendJson(res, 502, { error: e.message || "AI upstream error" });
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
  console.log(`   AI: ${API_KEY ? `enabled (model: ${MODEL})` : "DISABLED — set OPENAI_API_KEY in .env"}`);
});
