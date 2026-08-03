// ---------------------------------------------------------------------------
// Stadium sound engine — all effects synthesised with the Web Audio API, so no
// audio files are needed. Whistles, crowd roar, correct/wrong jingles, timer.
// ---------------------------------------------------------------------------

let ctx: AudioContext | null = null;
let enabled = true;
let crowdNodes: { src: AudioBufferSourceNode; gain: GainNode } | null = null;

export function setSoundEnabled(v: boolean) {
  enabled = v;
  if (!v) stopCrowd();
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType = "sine",
  gain = 0.12,
  when = 0,
  slideTo?: number
) {
  const c = ac();
  if (!c || !enabled) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise(dur: number, gain: number, when = 0, filterFreq = 1200) {
  const c = ac();
  if (!c || !enabled) return;
  const t0 = c.currentTime + when;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(filterFreq, t0);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(c.destination);
  src.start(t0);
}

export type Sfx =
  | "whistle"
  | "correct"
  | "wrong"
  | "steal"
  | "tick"
  | "timeup"
  | "pop"
  | "fanfare"
  | "spin"
  | "coin"
  | "hint";

export function play(sfx: Sfx) {
  switch (sfx) {
    case "whistle":
      tone(2093, 0.12, "square", 0.08);
      tone(1568, 0.16, "square", 0.08, 0.18);
      noise(0.4, 0.06, 0, 900);
      break;
    case "correct":
      tone(523.25, 0.12, "triangle", 0.16);
      tone(659.25, 0.12, "triangle", 0.16, 0.09);
      tone(783.99, 0.12, "triangle", 0.16, 0.18);
      tone(1046.5, 0.3, "triangle", 0.18, 0.27);
      noise(0.5, 0.05, 0.05, 2500);
      break;
    case "wrong":
      tone(220, 0.25, "sawtooth", 0.1);
      tone(155.56, 0.35, "sawtooth", 0.1, 0.18);
      break;
    case "steal":
      tone(392, 0.1, "square", 0.1);
      tone(523.25, 0.1, "square", 0.1, 0.1);
      tone(659.25, 0.2, "square", 0.12, 0.2);
      noise(0.3, 0.04, 0.15, 1800);
      break;
    case "tick":
      tone(1200, 0.04, "square", 0.05);
      break;
    case "timeup":
      tone(392, 0.18, "square", 0.12);
      tone(311.13, 0.3, "square", 0.12, 0.2);
      break;
    case "pop":
      tone(880, 0.06, "sine", 0.08, 0, 1320);
      break;
    case "fanfare":
      tone(523.25, 0.14, "triangle", 0.16);
      tone(659.25, 0.14, "triangle", 0.16, 0.13);
      tone(783.99, 0.14, "triangle", 0.16, 0.26);
      tone(1046.5, 0.5, "triangle", 0.2, 0.39);
      tone(1318.5, 0.55, "triangle", 0.12, 0.52);
      noise(1.2, 0.08, 0.2, 1600);
      break;
    case "spin":
      tone(700 + Math.random() * 500, 0.03, "square", 0.04);
      break;
    case "coin":
      tone(987.77, 0.08, "sine", 0.12);
      tone(1318.5, 0.18, "sine", 0.12, 0.07);
      break;
    case "hint":
      tone(659.25, 0.1, "sine", 0.08);
      tone(880, 0.12, "sine", 0.08, 0.1);
      break;
  }
}

export function startCrowd() {
  const c = ac();
  if (!c || !enabled || crowdNodes) return;
  const len = c.sampleRate * 3;
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 700;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.045, c.currentTime + 1.5);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start();
  crowdNodes = { src, gain };
}

export function stopCrowd() {
  if (!crowdNodes) return;
  try {
    crowdNodes.gain.gain.exponentialRampToValueAtTime(0.0001, (ctx?.currentTime ?? 0) + 0.4);
    crowdNodes.src.stop((ctx?.currentTime ?? 0) + 0.5);
  } catch {
    /* noop */
  }
  crowdNodes = null;
}
