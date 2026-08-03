import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";

// --- Buttons ----------------------------------------------------------------

type BtnVariant = "gold" | "ghost" | "danger" | "success" | "outline";

export function Btn({
  children,
  onClick,
  variant = "gold",
  className = "",
  disabled,
  size = "md",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  className?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const styles: Record<BtnVariant, string> = {
    gold: "bg-gradient-to-b from-gold-300 to-gold-600 text-pitch-950 font-bold hover:brightness-110 active:scale-[0.97] shadow-[0_8px_30px_rgba(245,179,28,0.35)]",
    ghost: "bg-white/5 text-white hover:bg-white/12 border border-white/10 active:scale-[0.97]",
    danger: "bg-red-500/90 text-white font-bold hover:bg-red-500 active:scale-[0.97]",
    success: "bg-emerald-500/90 text-white font-bold hover:bg-emerald-500 active:scale-[0.97]",
    outline: "bg-transparent text-gold-300 border border-gold-400/50 hover:bg-gold-400/10 active:scale-[0.97]",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-5 py-2.5 text-sm rounded-xl",
    lg: "px-7 py-3.5 text-base rounded-2xl",
  };
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      disabled={disabled}
      className={`${styles[variant]} ${sizes[size]} transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none font-body ${className}`}
    >
      {children}
    </motion.button>
  );
}

export function Chip({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide uppercase ${className}`}
    >
      {children}
    </span>
  );
}

export function Glass({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`glass rounded-2xl ${className}`}>{children}</div>;
}

// --- Avatars ----------------------------------------------------------------

const AVATAR_RINGS = [
  "from-emerald-400 to-teal-600",
  "from-sky-400 to-blue-600",
  "from-amber-400 to-orange-600",
  "from-fuchsia-400 to-purple-600",
  "from-rose-400 to-red-600",
  "from-lime-400 to-green-600",
  "from-cyan-400 to-teal-600",
  "from-violet-400 to-indigo-600",
];

export function avatarRing(i: number) {
  return AVATAR_RINGS[i % AVATAR_RINGS.length];
}

export function Avatar({
  emoji,
  size = 44,
  ring = 0,
  active = false,
}: {
  emoji: string;
  size?: number;
  ring?: number;
  active?: boolean;
}) {
  return (
    <div
      className={`relative flex items-center justify-center rounded-full bg-gradient-to-br ${avatarRing(ring)} ${
        active ? "ring-2 ring-gold-400 ring-offset-2 ring-offset-pitch-950" : ""
      }`}
      style={{ width: size, height: size, fontSize: size * 0.52 }}
    >
      <span className="drop-shadow">{emoji}</span>
    </div>
  );
}

export const AVATAR_EMOJIS = ["🦁", "🐐", "⚡", "🐺", "🦅", "🐂", "🦓", "🐍", "🦈", "🐆", "🦍", "🦉"];

// --- Typewriter -------------------------------------------------------------

export function Typewriter({ text, speed = 22, className = "" }: { text: string; speed?: number; className?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const id = setInterval(() => {
      setN((v) => {
        if (v >= text.length) {
          clearInterval(id);
          return v;
        }
        return v + 1;
      });
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return (
    <p className={className}>
      {text.slice(0, n)}
      {n < text.length && <span className="opacity-60">▌</span>}
    </p>
  );
}

// --- Confetti ---------------------------------------------------------------

const CONFETTI_COLORS = ["#fec94e", "#34d399", "#38bdf8", "#fb7185", "#a78bfa", "#ffffff"];

export function Confetti({ count = 70 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 1.2,
        dur: 2.4 + Math.random() * 2.2,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rot: Math.random() * 360,
        size: 6 + Math.random() * 8,
        sway: Math.random() * 60 - 30,
      })),
    [count]
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ y: "-10vh", x: `${p.x}vw`, rotate: p.rot, opacity: 1 }}
          animate={{ y: "110vh", x: `calc(${p.x}vw + ${p.sway}px)`, rotate: p.rot + 360 }}
          transition={{ duration: p.dur, delay: p.delay, ease: "linear" }}
          className="absolute top-0 rounded-sm"
          style={{ width: p.size, height: p.size * 0.45, backgroundColor: p.color }}
        />
      ))}
    </div>
  );
}

// --- Toggle -----------------------------------------------------------------

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 rounded-full transition-colors ${on ? "bg-gold-500" : "bg-white/15"}`}
      aria-pressed={on}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-6" : "left-1"}`}
      />
    </button>
  );
}

// --- Stat -------------------------------------------------------------------

export function Stat({ label, value, accent = false }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className="glass rounded-2xl px-4 py-3 text-center">
      <div className={`font-score text-3xl leading-none ${accent ? "text-gold-400" : "text-white"}`}>{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-widest text-white/50">{label}</div>
    </div>
  );
}

// --- Wordmark ---------------------------------------------------------------

export function Wordmark({ size = "lg" }: { size?: "sm" | "lg" }) {
  return (
    <div className="select-none text-center">
      <div
        className={`font-display leading-none tracking-tight text-gradient-gold text-shadow-glow ${
          size === "lg" ? "text-4xl sm:text-6xl" : "text-2xl sm:text-3xl"
        }`}
      >
        FOOTBALL IQ
      </div>
      <div
        className={`font-display leading-none tracking-[0.42em] text-gradient-grass mt-1 ${
          size === "lg" ? "text-2xl sm:text-4xl" : "text-lg sm:text-2xl"
        }`}
      >
        ARENA
      </div>
    </div>
  );
}

// --- Score pop --------------------------------------------------------------

export function ScorePop({ value }: { value: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      if (ref.current) ref.current.style.opacity = "0";
    }, 900);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <div
      ref={ref}
      key={value}
      className="pointer-events-none fixed left-1/2 top-[38%] z-50 -translate-x-1/2 font-score text-6xl text-gold-300 text-shadow-glow transition-opacity duration-700"
    >
      +{value}
    </div>
  );
}
