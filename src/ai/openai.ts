import type { CategoryId, Difficulty, Question } from "../types";
import { checkAnswer, type CheckResult } from "./verify";

// ---------------------------------------------------------------------------
// Live AI — talks to our own server-side proxy (/api/ai), so the provider key
// never reaches the browser. Falls back to the local simulation whenever the
// proxy is unreachable, the key is missing, or the feature is toggled off.
// ---------------------------------------------------------------------------

let enabled = localStorage.getItem("fia-ai") !== "off";

export function aiEnabled() {
  return enabled;
}

export function setAIEnabled(v: boolean) {
  enabled = v;
  localStorage.setItem("fia-ai", v ? "on" : "off");
}

async function callAI(action: string, payload: Record<string, unknown>, timeoutMs = 10000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`proxy ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Live AI answer verification — falls back to the local fuzzy matcher. */
export async function aiVerify(
  text: string,
  question: Question,
  said: string[] = []
): Promise<CheckResult> {
  const local = () => checkAnswer(text, question, said);
  if (!enabled) return local();
  try {
    const data = await callAI("verify", {
      text,
      question: { prompt: question.prompt, sub: question.sub, answer: question.answer },
      said,
    });
    if (data && typeof data.correct === "boolean") {
      return {
        ok: data.correct,
        matched: typeof data.matched === "string" ? data.matched : null,
        display:
          typeof data.display === "string"
            ? data.display
            : data.correct
              ? "Correct!"
              : "That's not it.",
        confidence: "exact",
        source: "ai",
      };
    }
  } catch {
    /* fall through to local */
  }
  return { ...local(), source: "local" };
}

/** Live AI question generation — returns null when unavailable. */
export async function aiGenerateQuestion(
  category: CategoryId,
  difficulty: Difficulty
): Promise<Question | null> {
  if (!enabled) return null;
  try {
    const data = await callAI("generate", { category, difficulty }, 15000);
    if (data?.prompt && Array.isArray(data?.answer) && data.answer.length) {
      return {
        id: `ai-${Date.now()}`,
        category,
        difficulty,
        type: "single",
        prompt: String(data.prompt),
        sub: typeof data.sub === "string" ? data.sub : undefined,
        answer: data.answer.slice(0, 4).map(String),
        aliases: Array.isArray(data.aliases) ? data.aliases.slice(0, 6).map(String) : [],
        explanation: typeof data.explanation === "string" ? data.explanation : "An AI-generated question.",
        hint: typeof data.hint === "string" ? data.hint : undefined,
      };
    }
  } catch {
    /* unavailable */
  }
  return null;
}
