import { useEffect, useMemo, useRef, useState } from "react";
import { motion, animate } from "framer-motion";
import { Btn, Avatar, Glass } from "../components/ui";
import { CATEGORIES } from "../data/categories";
import type { CategoryId, GameState } from "../types";
import type { Dispatch } from "react";
import { play } from "../audio/sound";
import { hostLine } from "../ai/aiHost";

const N = CATEGORIES.length;
const ANGLE = 360 / N;

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number) {
  const s = polar(cx, cy, r, start);
  const e = polar(cx, cy, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
}

export function CategoryWheelScreen({
  state,
  dispatch,
  autoRandom,
}: {
  state: GameState;
  dispatch: Dispatch<{ type: "PICK_CATEGORY"; id: CategoryId }>;
  autoRandom: boolean;
}) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [landed, setLanded] = useState<CategoryId | null>(null);
  const rotationRef = useRef(0);
  const startedRef = useRef(false);
  const player = state.players[state.turnPlayerId];

  const spinTo = (target: CategoryId) => {
    if (spinning) return;
    setSpinning(true);
    setLanded(null);
    const k = CATEGORIES.findIndex((c) => c.id === target);
    const targetMod = (360 - k * ANGLE - ANGLE / 2 + 360) % 360;
    const cur = ((rotationRef.current % 360) + 360) % 360;
    const delta = (targetMod - cur + 360) % 360;
    const goal = rotationRef.current + 5 * 360 + delta;
    play("spin");
    animate(rotationRef.current, goal, {
      duration: 3.4,
      ease: [0.12, 0.7, 0.18, 1],
      onUpdate: (v) => {
        rotationRef.current = v;
        setRotation(v);
      },
      onComplete: () => {
        setSpinning(false);
        setLanded(target);
        play("whistle");
      },
    });
  };

  // auto spin once (Random Mix mode or first load)
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (autoRandom) {
      const t = setTimeout(() => spinTo(CATEGORIES[Math.floor(Math.random() * N)].id), 600);
      return () => clearTimeout(t);
    }
  }, [autoRandom]);

  useEffect(() => {
    if (landed) {
      const t = setTimeout(() => dispatch({ type: "PICK_CATEGORY", id: landed }), 500);
      return () => clearTimeout(t);
    }
  }, [landed, dispatch]);

  const wheel = useMemo(() => {
    const cx = 170;
    const cy = 170;
    const r = 150;
    return CATEGORIES.map((c, i) => {
      const start = -90 + i * ANGLE;
      const end = start + ANGLE;
      const mid = start + ANGLE / 2;
      const labelPos = polar(cx, cy, 108, mid);
      return { c, path: arcPath(cx, cy, r, start, end), mid, labelPos };
    });
  }, []);

  return (
    <div className="pitch-bg min-h-full px-4 py-6">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6">
        <div className="flex items-center gap-3">
          <Avatar emoji={player?.avatar ?? "🙋"} size={48} ring={state.turnIndex} active />
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-white/50">
              {state.config.mode === "tournament" ? "Tournament match" : "Round " + Math.max(1, state.roundIndex + 1)} · {player?.name}'s turn
            </p>
            <p className="font-display text-lg text-gold-300">{hostLine("turn", { name: player?.name })}</p>
          </div>
        </div>

        <div className="relative">
          <motion.svg
            width={340}
            height={340}
            viewBox="0 0 340 340"
            className="drop-shadow-[0_0_40px_rgba(254,201,78,0.25)]"
          >
            <g transform={`rotate(${rotation} 170 170)`}>
              {wheel.map(({ c, path }) => (
                <path key={c.id} d={path} fill={c.hex} stroke="#04170d" strokeWidth={1.5} />
              ))}
              {wheel.map(({ c, labelPos }) => (
                <text
                  key={c.id}
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={26}
                >
                  {c.emoji}
                </text>
              ))}
            </g>
            <circle cx={170} cy={170} r={26} fill="#04170d" stroke="#fec94e" strokeWidth={3} />
            <text x={170} y={170} textAnchor="middle" dominantBaseline="central" fontSize={26}>
              ⚽
            </text>
          </motion.svg>
          {/* pointer */}
          <div className="absolute left-1/2 top-[-10px] -translate-x-1/2 text-3xl drop-shadow">▼</div>
        </div>

        {landed ? (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
            <span className={`font-display text-2xl text-gradient-gold`}>
              {CATEGORIES.find((c) => c.id === landed)?.emoji} {CATEGORIES.find((c) => c.id === landed)?.name}!
            </span>
          </motion.div>
        ) : (
          <Btn size="lg" disabled={spinning} onClick={() => spinTo(CATEGORIES[Math.floor(Math.random() * N)].id)}>
            {spinning ? "Spinning…" : "🎡 Spin the Wheel"}
          </Btn>
        )}

        {!autoRandom && (
          <Glass className="w-full p-4">
            <p className="mb-3 text-center text-xs uppercase tracking-widest text-white/50">
              …or pick a category directly
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => dispatch({ type: "PICK_CATEGORY", id: c.id })}
                  className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-2 transition hover:border-gold-400/60 hover:bg-white/10"
                >
                  <span className="text-xl">{c.emoji}</span>
                  <span className="text-[10px] font-semibold text-white/80">{c.name}</span>
                </button>
              ))}
            </div>
          </Glass>
        )}
      </div>
    </div>
  );
}
