import type { Question } from "../types";

// ---------------------------------------------------------------------------
// "AI" answer verification — tolerant of spelling variations, nicknames and
// aliases. This is the local stand-in for a future OpenAI evaluation hook.
// ---------------------------------------------------------------------------

const stripAccents = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const norm = (s: string) =>
  stripAccents(s.toLowerCase().trim())
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export interface CheckResult {
  ok: boolean;
  matched: string | null;
  display: string;
  confidence: "exact" | "fuzzy" | "none";
  /** where the verdict came from — live AI or the local simulation */
  source?: "ai" | "local";
}

const tokens = (s: string) => (s ? s.split(" ").filter(Boolean) : []);

function tokenOverlap(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.length || !tb.length) return 0;
  let hits = 0;
  for (const t of ta) if (tb.includes(t)) hits++;
  return hits / Math.max(ta.length, tb.length);
}

export function canonicalFor(text: string, q: Question): string | null {
  const input = norm(text);
  const pairs: [string, string][] = [
    ...q.answer.map((a) => [norm(a), a] as [string, string]),
    ...(q.aliases ?? []).map((a) => [norm(a), a] as [string, string]),
  ];
  for (const [n, orig] of pairs) if (n === input) return orig;
  for (const [n, orig] of pairs) {
    if (n.length >= 4 && (input.includes(n) || n.includes(input))) return orig;
  }
  for (const [n, orig] of pairs) {
    if (tokenOverlap(input, n) >= 0.66) return orig;
  }
  return null;
}

export function checkAnswer(text: string, q: Question, said: string[] = []): CheckResult {
  const input = norm(text);
  if (!input) return { ok: false, matched: null, display: "Empty answer — try again.", confidence: "none" };

  // True / False — accept a range of phrasings
  if (q.type === "truefalse") {
    const truthy = q.answer.some((a) => /^(true|t|correct|yes|right)$/.test(norm(a)));
    const saidTrue = /^(true|t|correct|yes|right)$/.test(input);
    const saidFalse = /^(false|f|incorrect|no|wrong)$/.test(input);
    if ((saidTrue || saidFalse) && saidTrue === truthy) {
      return { ok: true, matched: truthy ? "True" : "False", display: truthy ? "Correct — it's TRUE!" : "Correct — it's FALSE!", confidence: "exact" };
    }
    if (saidTrue || saidFalse) {
      return { ok: false, matched: null, display: truthy ? "Nope — the answer is TRUE." : "Nope — the answer is FALSE.", confidence: "exact" };
    }
    return { ok: false, matched: null, display: "Say 'true' or 'false'.", confidence: "none" };
  }

  // Already-said guard for list / timed challenges
  const saidSet = new Set(said.map(norm));

  // For list-style questions, match any canonical answer not yet said
  if (q.type === "list" || q.type === "timed") {
    const all = [...q.answer.map((a) => [norm(a), a] as [string, string])];
    const aliases = (q.aliases ?? []).map((a) => [norm(a), a] as [string, string]);
    const pool = [...all, ...aliases];
    let best: [string, string] | null = null;
    let bestScore = 0;
    for (const [n, orig] of pool) {
      if (saidSet.has(n)) continue;
      if (n === input) { best = [n, orig]; bestScore = 1; break; }
      const score = Math.max(
        n.length >= 4 && (input.includes(n) || n.includes(input)) ? 0.9 : 0,
        tokenOverlap(input, n) >= 0.66 ? 0.7 : 0
      );
      if (score > bestScore) { best = [n, orig]; bestScore = score; }
    }
    if (best && bestScore > 0) {
      const canonical = best[1];
      return { ok: true, matched: canonical, display: `On the board! ${canonical} — nice.`, confidence: bestScore === 1 ? "exact" : "fuzzy" };
    }
    if (saidSet.has(norm(text))) {
      return { ok: false, matched: null, display: "Already counted! Give us a new name.", confidence: "exact" };
    }
    return { ok: false, matched: null, display: "Not on the list — but the host can overrule me.", confidence: "none" };
  }

  // Single answers (incl. guess-the-*, this-or-that)
  const matched = canonicalFor(text, q);
  if (matched) {
    return { ok: true, matched, display: `Correct — ${matched}!`, confidence: "exact" };
  }
  // This-or-That: tell them the correct side
  if (q.type === "thisorthat") {
    const correct = q.answer[0];
    const wrong = q.sub?.split("vs")[1]?.replace(/\s*\(.*?\)\s*/g, "").trim();
    return { ok: false, matched: null, display: `No — the answer is ${correct}.${wrong ? ` (Not ${wrong}.)` : ""}`, confidence: "none" };
  }
  return { ok: false, matched: null, display: "I don't think that's it — try again or let the host judge.", confidence: "none" };
}
