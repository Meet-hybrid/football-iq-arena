import { motion, AnimatePresence } from "framer-motion";
import { Avatar, Btn, Glass } from "../components/ui";
import type { GameState } from "../types";
import type { Dispatch } from "react";
import { play } from "../audio/sound";
import { hostLine } from "../ai/aiHost";

export function ScoreboardScreen({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: Dispatch<{ type: "NEXT_TURN" } | { type: "END_GAME" }>;
}) {
  const teamMode = Object.values(state.players).some((p) => p.isTeam);
  const entries = Object.values(state.players)
    .filter((p) => p.isTeam === teamMode)
    .sort((a, b) => b.score - a.score);
  const leader = entries[0];
  const max = Math.max(...entries.map((e) => e.score));
  const leaderChanged = state.lastOutcome !== "none";
  const tournament = state.config.mode === "tournament";

  return (
    <div className="pitch-bg min-h-full px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 text-center font-display text-2xl text-gold-300"
        >
          {state.gameEnding ? "🏁 Final Standings" : "📊 Scoreboard"}
        </motion.h2>

        {tournament && state.bracket && (
          <div className="mb-6">
            <p className="mb-2 text-center text-xs uppercase tracking-widest text-white/40">
              Tournament · {state.bracket.length} match{state.bracket.length > 1 ? "es" : ""} in this round
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {state.bracket.map((m, i) => {
                const p1 = state.players[m.p1Id];
                const p2 = m.p2Id ? state.players[m.p2Id] : null;
                const active = i === state.matchIndex && !m.winnerId;
                return (
                  <div
                    key={m.id}
                    className={`glass rounded-xl px-3 py-2 text-center text-sm ${active ? "ring-2 ring-gold-400" : m.winnerId ? "opacity-70" : "opacity-40"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{p1?.avatar}</span>
                      <span className={m.winnerId === m.p1Id ? "font-bold text-gold-300" : "text-white/80"}>{p1?.name}</span>
                      <span className="font-score text-lg text-white/60">{m.scores[m.p1Id] ?? 0}</span>
                    </div>
                    {p2 && m.p2Id && (
                      <div className="mt-1 flex items-center gap-2">
                        <span>{p2.avatar}</span>
                        <span className={m.winnerId === m.p2Id ? "font-bold text-gold-300" : "text-white/80"}>{p2.name}</span>
                        <span className="font-score text-lg text-white/60">{m.scores[m.p2Id] ?? 0}</span>
                      </div>
                    )}
                    {m.winnerId && <div className="mt-1 text-[10px] font-bold text-emerald-400">🏆 ADVANCES</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Glass className="overflow-hidden p-2">
          {entries.map((p, i) => (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.12 }}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 ${i === 0 ? "bg-gold-400/10" : ""}`}
            >
              <span className={`font-score w-8 text-2xl ${i === 0 ? "text-gold-300" : "text-white/40"}`}>{i + 1}</span>
              <Avatar emoji={p.avatar} size={40} ring={i} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">
                  {p.name}
                  {p.isTeam && (
                    <span className="ml-1 text-[10px] font-normal text-white/40">({p.members?.length} players)</span>
                  )}
                </div>
                {p.streak >= 2 && <div className="text-[10px] text-orange-300">🔥 {p.streak} in a row</div>}
              </div>
              <AnimatePresence>
                {(state.delta[p.id] ?? 0) > 0 && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.5, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="font-score text-2xl text-emerald-400"
                  >
                    +{state.delta[p.id]}
                  </motion.span>
                )}
              </AnimatePresence>
              <div className={`font-score w-14 text-right text-3xl ${i === 0 ? "text-gold-300" : "text-white"}`}>
                {p.score}
              </div>
            </motion.div>
          ))}
        </Glass>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-5 text-center text-sm text-white/60"
        >
          {leader && (leaderChanged ? hostLine("lead", { name: leader.name }) : "")}
          {max > 0 && leader && entries.length > 1 && entries[0].score === entries[1].score
            ? hostLine("tie", {})
            : ""}
        </motion.p>

        <div className="mt-6 flex justify-center gap-3">
          {state.config.mode === "party" && !state.gameEnding && (
            <Btn variant="ghost" onClick={() => { play("fanfare"); dispatch({ type: "END_GAME" }); }}>
              🏁 End game now
            </Btn>
          )}
          <Btn size="lg" onClick={() => { play("whistle"); dispatch({ type: "NEXT_TURN" }); }}>
            {state.gameEnding ? "See Results 🏆" : "Continue →"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
