import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Btn, Chip, Icon, Toggle, Wordmark } from "../components/ui";
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
  const [provider, setProvider] = useState("AI");
  useEffect(() => {
    fetch("/api/health")
      .then((response) => response.json())
      .then((data) => {
        if (typeof data.provider === "string") setProvider(`${data.provider.charAt(0).toUpperCase()}${data.provider.slice(1)} AI`);
      })
      .catch(() => undefined);
  }, []);
  return (
    <div className="pitch-bg relative min-h-full overflow-hidden">
      <div className="relative mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center gap-8 px-5 py-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
          <Wordmark />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-center"
        >
          <p className="mx-auto max-w-md text-sm leading-relaxed text-white/70 sm:text-base">
            The host-led football quiz game show. Gather 2–10 players, pick a category, and let{" "}
            <span className="font-semibold text-gold-300">{HOST_NAME}</span> put your ball knowledge to the
            test.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-2"
        >
          {["17 categories", "8 game modes", "2–10 players", "Steal points", "AI host reads aloud"].map((f) => (
            <Chip key={f} className="border border-white/10 bg-white/5 text-white/75">
              {f}
            </Chip>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="flex w-full max-w-sm flex-col gap-3"
        >
          <Btn size="lg" onClick={() => { play("whistle"); onNewGame(); }}>
            <Icon name="play" size={18} />
            Start New Game
          </Btn>
          <div className="grid grid-cols-2 gap-3">
            <Btn variant="ghost" onClick={() => { play("pop"); onDaily(); }}>
              <Icon name="calendar" size={16} />
              Daily Challenge
            </Btn>
            <Btn variant="ghost" onClick={() => { play("pop"); onStats(); }}>
              <Icon name="chart" size={16} />
              My Stats
            </Btn>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75 }}
          className="flex flex-wrap items-center justify-center gap-6 rounded-2xl border border-white/10 bg-white/4 px-5 py-3 text-sm text-white/70"
        >
          <span className="flex items-center gap-2">
            <Icon name={sound ? "volume" : "mute"} size={16} className="text-white/60" />
            Sound
            <Toggle on={sound} onChange={onToggleSound} />
          </span>
          <span className="flex items-center gap-2">
            <Icon name="sparkles" size={16} className="text-white/60" />
            {provider}
            <Toggle on={liveAi} onChange={(v) => { setLiveAi(v); setAIEnabled(v); }} />
          </span>
        </motion.div>

        <p className="text-[11px] uppercase tracking-[0.3em] text-white/30">v0.1 — MVP build</p>
      </div>
    </div>
  );
}
