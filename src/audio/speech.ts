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
  const enGB = cachedVoices.find((v) => v.lang.startsWith("en-GB") && /male|daniel|george/i.test(v.name));
  const voice =
    enGB ||
    cachedVoices.find((v) => v.lang.startsWith("en-GB")) ||
    cachedVoices.find((v) => v.lang.startsWith("en")) ||
    null;
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? "en-GB";
  u.rate = opts.rate ?? 0.98;
  u.pitch = opts.pitch ?? 1.1;
  u.volume = 1;
  if (opts.onEnd) {
    u.onend = () => opts.onEnd?.();
    u.onerror = () => opts.onEnd?.();
  }
  synth.speak(u);
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
