// ---------------------------------------------------------------------------
// Speech: the AI host reads questions aloud (Text-to-Speech) and accepts
// spoken answers (Speech Recognition) where the browser supports it.
// ---------------------------------------------------------------------------

let cachedVoices: SpeechSynthesisVoice[] = [];

function refreshVoices() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  cachedVoices = window.speechSynthesis.getVoices();
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  refreshVoices();
  window.speechSynthesis.onvoiceschanged = refreshVoices;
}

/**
 * Score a voice for clarity. Network voices (Google, Microsoft, neural) are
 * dramatically more intelligible than local espeak/festival ones — which sound
 * robotic and garbled, especially on Linux. We prefer en-GB for the presenter
 * vibe, then en-US, and heavily penalize the robotic engines.
 */
function scoreVoice(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase();
  const lang = v.lang.toLowerCase();
  let s = 0;
  if (lang.startsWith("en-gb")) s += 20;
  else if (lang.startsWith("en-us")) s += 16;
  else if (lang.startsWith("en")) s += 10;
  else return -1; // non-English — skip

  if (name.includes("google")) s += 30;
  if (name.includes("microsoft")) s += 24;
  if (name.includes("premium") || name.includes("neural") || name.includes("wavenet") || name.includes("natural")) s += 14;
  // Presenter-ish en-GB voices
  if (/daniel|george|ryan|arthur|alfred|oliver/i.test(name)) s += 8;

  // Robotic engines — never pick these if anything else exists.
  // NOTE: deliberately NOT matching com.apple.speech.synthesis — those are the
  // native macOS voices (Samantha, Daniel, Karen…), which are high quality.
  if (/espeak|festival|pico|robot|sam\b|flite|speech[\s-]?dispatcher/.test(name)) s -= 60;
  if (v.localService) s -= 4; // local voices are usually the worst quality

  return s;
}

function pickVoice(): SpeechSynthesisVoice | null {
  refreshVoices();
  if (!cachedVoices.length) return null;
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -Infinity;
  for (const v of cachedVoices) {
    const s = scoreVoice(v);
    if (s > bestScore) {
      best = v;
      bestScore = s;
    }
  }
  // If every voice scored negative (only robotic voices available), let the
  // browser use its default rather than forcing an unintelligible one.
  return bestScore >= 0 ? best : null;
}

export function ttsAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(
  text: string,
  opts: { rate?: number; pitch?: number; onEnd?: () => void } = {}
) {
  if (!ttsAvailable()) {
    opts.onEnd?.();
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? "en-GB";
  u.rate = opts.rate ?? 0.95;
  u.pitch = opts.pitch ?? 1.0;
  u.volume = 1;

  // Chrome pauses long utterances (~15s) unless the queue is kept alive, which
  // used to make the host trail off into silence mid-question. Resume on a
  // timer so the whole question always gets read. The interval self-clears
  // once nothing is queued, so it can never leak even if events never fire.
  const keepAlive = window.setInterval(() => {
    try {
      if (!synth.speaking && !synth.pending) {
        window.clearInterval(keepAlive);
        return;
      }
      if (synth.speaking && !synth.paused) synth.resume();
    } catch {
      window.clearInterval(keepAlive);
    }
  }, 8000);

  const done = () => {
    window.clearInterval(keepAlive);
    opts.onEnd?.();
  };
  u.onend = done;
  u.onerror = done;
  try {
    synth.speak(u);
    synth.resume();
  } catch {
    window.clearInterval(keepAlive);
  }
}

export function stopSpeaking() {
  if (ttsAvailable()) window.speechSynthesis.cancel();
}

export function sttAvailable(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

/** Starts listening for one spoken phrase. Returns a stop() function or null if unsupported. */
export function listen(
  onResult: (text: string) => void,
  onEnd?: () => void,
  onError?: () => void
): (() => void) | null {
  if (!sttAvailable()) return null;
  const w = window as unknown as Record<string, any>;
  const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
  const rec = new SR();
  rec.lang = "en-US";
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.onresult = (e: any) => {
    const text: string = e.results?.[0]?.[0]?.transcript ?? "";
    if (text) onResult(text);
  };
  rec.onend = () => onEnd?.();
  rec.onerror = () => onError?.();
  try {
    rec.start();
  } catch {
    return null;
  }
  return () => {
    try {
      rec.stop();
    } catch {
      /* noop */
    }
  };
}
