import { useState } from "react";
import { motion } from "framer-motion";
import { Btn, Chip, Toggle, Wordmark } from "../components/ui";
import { play } from "../audio/sound";
import { HOST_NAME } from "../ai/aiHost";
import { aiEnabled, setAIEnabled } from "../ai/openai";

export function HomeScreen({
  sound,
  onToggleSound,
  onNewGame,
  onDaily,
  onStats,
}: {
  sound: boolean;
  onToggleSound: (v: boolean) => void;
  onNewGame: () => void;
  onDaily: () => void;
  onStats: () => void;
}) {
  const [liveAi, setLiveAi] = useState(aiEnabled());
  return (
    <div className="pitch-bg relative min-h-full overflow-hidden">
      {/* floodlights */}
      <div className="floodlight pointer-events-none absolute -top-24 left-1/2 h-64 w-[120%] -translate-x-1/2 rotate-[-3deg]" />
      {/* floating balls */}
      <motion.div
        className="animate-floaty pointer-events-none absolute right-[8%] top-24 text-6xl opacity-30 sm:text-7xl"
        animate={{ rotate: [0, 14, 0] }}
        transition={{ repeat: Infinity, duration: 7 }}
      >
        ⚽
      </motion.div>
      <motion.div
        className="animate-floaty pointer-events-none absolute left-[6%] top-[58%] text-5xl opacity-25 sm:text-6xl"
        animate={{ rotate: [0, -12, 0] }}
        transition={{ repeat: Infinity, duration: 8, delay: 1 }}
      >
        🏆
      </motion.div>

      <div className="relative mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center gap-8 px-5 py-10">
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Wordmark />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <p className="mx-auto max-w-md text-sm text-white/70 sm:text-base">
            The AI-powered, host-led football quiz game show. Gather 2–10 players, pick your
            category, and let <span className="font-semibold text-gold-300">{HOST_NAME}</span> put
            your ball knowledge to the test.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="flex flex-wrap items-center justify-center gap-2"
        >
          {["17 categories", "8 game modes", "2–10 players", "Steal points", "AI host reads aloud"].map((f) => (
            <Chip key={f} className="bg-white/8 text-white/80">
              ✦ {f}
            </Chip>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex w-full max-w-sm flex-col gap-3"
        >
          <Btn size="lg" className="animate-pulse-glow" onClick={() => { play("whistle"); onNewGame(); }}>
            ⚽ Start New Game
          </Btn>
          <div className="grid grid-cols-2 gap-3">
            <Btn variant="ghost" onClick={() => { play("pop"); onDaily(); }}>
              📅 Daily Challenge
            </Btn>
            <Btn variant="ghost" onClick={() => { play("pop"); onStats(); }}>
              📊 My Stats
            </Btn>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex flex-wrap items-center justify-center gap-6 rounded-full bg-white/5 px-5 py-2.5 text-sm text-white/70"
        >
          <span className="flex items-center gap-2">
            🔊 Sound
            <Toggle on={sound} onChange={onToggleSound} />
          </span>
          <span className="flex items-center gap-2">
            🤖 Live AI
            <Toggle on={liveAi} onChange={(v) => { setLiveAi(v); setAIEnabled(v); }} />
          </span>
        </motion.div>

        <p className="text-[11px] uppercase tracking-[0.3em] text-white/30">v0.1 — MVP build</p>
      </div>
    </div>
  );
}
