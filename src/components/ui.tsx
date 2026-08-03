import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";

// --- Icons (inline SVG, lucide-style) --------------------------------------

export type IconName =
  | "play" | "calendar" | "chart" | "volume" | "mute" | "mic" | "sparkles"
  | "home" | "refresh" | "trophy" | "arrow-left" | "arrow-right" | "dice"
  | "bolt" | "target" | "shield" | "crown" | "medal" | "flame" | "check"
  | "x" | "lock" | "clock" | "flag" | "users" | "plus" | "minus" | "stop"
  | "lightbulb" | "disk" | "chevron-down" | "chevron-up";

const ICON_PATHS: Record<IconName, ReactNode> = {
  play: <polygon points="6 3 20 12 6 21 6 3" fill="currentColor" stroke="none" />,
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
  chart: (
    <>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </>
  ),
  volume: (
    <>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </>
  ),
  mute: (
    <>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </>
  ),
  mic: (
    <>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </>
  ),
  sparkles: (
    <path d="M12 3l1.9 5.8L20 11l-6.1 1.2L12 18l-1.9-5.8L4 11l6.1-2.2z" />
  ),
  home: (
    <>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </>
  ),
  refresh: (
    <>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </>
  ),
  trophy: (
    <>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
    </>
  ),
  "arrow-left": (
    <>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </>
  ),
  "arrow-right": (
    <>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </>
  ),
  dice: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  bolt: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  target: (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    </>
  ),
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  crown: <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />,
  medal: (
    <>
      <circle cx="12" cy="15" r="6" />
      <path d="M8.5 10.5 6 2l3.5 3L12 2l2.5 3L18 2l-2.5 8.5" />
    </>
  ),
  flame: (
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  ),
  check: <polyline points="20 6 9 17 4 12" />,
  x: (
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>
  ),
  lock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </>
  ),
  flag: (
    <>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </>
  ),
  users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  minus: <line x1="5" y1="12" x2="19" y2="12" />,
  stop: <rect x="5" y="5" width="14" height="14" rx="2" />,
  lightbulb: (
    <>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.3h6c0-.9.4-1.8 1-2.3A7 7 0 0 0 12 2z" />
    </>
  ),
  disk: (
    <>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </>
  ),
  "chevron-down": <polyline points="6 9 12 15 18 9" />,
  "chevron-up": <polyline points="18 15 12 9 6 15" />,
};

export function Icon({
  name,
  size = 18,
  className = "",
  strokeWidth = 2,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

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
    gold: "bg-gradient-to-b from-gold-400 to-gold-600 text-pitch-950 font-bold hover:brightness-110 active:scale-[0.97] shadow-[0_4px_18px_rgba(201,164,76,0.28)]",
    ghost: "bg-white/5 text-white hover:bg-white/12 border border-white/10 active:scale-[0.97]",
    danger: "bg-red-600/90 text-white font-bold hover:bg-red-500 active:scale-[0.97]",
    success: "bg-emerald-600/90 text-white font-bold hover:bg-emerald-500 active:scale-[0.97]",
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
      className={`${styles[variant]} ${sizes[size]} transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none font-body inline-flex items-center justify-center gap-2 ${className}`}
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

// --- Avatars (initial-based crests) ------------------------------------------

const AVATAR_COLORS = [
  "from-emerald-500 to-teal-700",
  "from-sky-500 to-blue-700",
  "from-amber-500 to-orange-700",
  "from-rose-500 to-red-700",
  "from-violet-500 to-indigo-700",
  "from-lime-500 to-green-700",
  "from-cyan-500 to-teal-700",
  "from-fuchsia-500 to-purple-700",
  "from-orange-500 to-amber-700",
  "from-teal-500 to-emerald-700",
];

/** Number of player colors (stored as string index in Player.avatar). */
export const AVATAR_COUNT = AVATAR_COLORS.length;

export function avatarRing(i: number) {
  return AVATAR_COLORS[((i % AVATAR_COLORS.length) + AVATAR_COLORS.length) % AVATAR_COLORS.length];
}

/** Resolve a player's stored avatar index to a ring, falling back to a rank-based index. */
export function avatarRingFor(avatar: string | undefined, fallback = 0): number {
  const n = Number(avatar);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Initials for a name — first letters of the first two words. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0].toUpperCase()).join("") || "?";
}

export function Avatar({
  name = "",
  icon,
  size = 44,
  ring = 0,
  active = false,
}: {
  name?: string;
  icon?: IconName;
  size?: number;
  ring?: number;
  active?: boolean;
}) {
  return (
    <div
      className={`relative flex items-center justify-center rounded-full bg-gradient-to-br ${avatarRing(ring)} ${
        active ? "ring-2 ring-gold-400 ring-offset-2 ring-offset-pitch-950" : ""
      }`}
      style={{ width: size, height: size }}
    >
      {icon ? (
        <Icon name={icon} size={size * 0.5} className="text-white" />
      ) : (
        <span className="font-score text-white" style={{ fontSize: size * 0.46, lineHeight: 1 }}>
          {initialsOf(name)}
        </span>
      )}
    </div>
  );
}

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

const CONFETTI_COLORS = ["#d9b96a", "#34d399", "#38bdf8", "#fb7185", "#a78bfa", "#ffffff"];

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
        className={`font-display leading-none tracking-tight text-gradient-gold ${
          size === "lg" ? "text-4xl sm:text-6xl" : "text-2xl sm:text-3xl"
        }`}
      >
        FOOTBALL IQ
      </div>
      <div
        className={`font-display leading-none tracking-[0.42em] text-white/70 mt-1 ${
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
