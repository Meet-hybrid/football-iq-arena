import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Avatar, Btn, Confetti, Glass, Icon, Stat, avatarRingFor } from "../components/ui";
import { winnersOf } from "../game/engine";
import { finalizeGame, loadCareer, loadWeekly } from "../game/stats";
import { ACHIEVEMENTS } from "../data/achievements";
import { hostLine } from "../ai/aiHost";
import { play } from "../audio/sound";
import type { GameState, Player } from "../types";

export function GameOverScreen({
  state,
  onHome,
  onReplay,
}: {
  state: GameState;
  onHome: () => void;
  onReplay: () => void;
}) {
  const finalized = useRef(false);
  const teamMode = Object.values(state.players).some((p) => p.isTeam);
  const entries: Player[] = Object.values(state.players)
    .filter((p) => p.isTeam === teamMode)
    .sort((a, b) => b.score - a.score);
  const winners = state.winnerId ? [state.winnerId] : winnersOf(state);
  const champId = winners[0] ?? entries[0]?.id;
  const champ = state.players[champId];

  const weekly = useMemo(() => loadWeekly().sort((a, b) => b.points - a.points).slice(0, 5), []);

  const { unlocked } = useMemo(() => {
    if (finalized.current) return { unlocked: [] as string[] };
    finalized.current = true;
    const career = loadCareer();
    const maxScore = Math.max(...entries.map((e) => e.score));
    const minScore = Math.min(...entries.map((e) => e.score));
    const res = finalizeGame(
      entries,
      {
        players: entries,
        mode: state.config.mode,
        difficulty: state.config.difficulty,
        sudden: state.config.mode === "sudden",
        winnerName: champ?.name ?? entries[0]?.name ?? "",
        winnerId: champId,
        maxScore,
        minScore,
        log: state.log,
      },
      career
    );
    return res;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    play("fanfare");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const podium = [entries[1], entries[0], entries[2]]; // 2nd, 1st, 3rd

  return (
    <div className="pitch-bg min-h-full px-4 py-8">
      <Confetti />
      <div className="mx-auto max-w-3xl">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-xs uppercase tracking-[0.3em] text-white/50"
        >
          {state.config.mode === "tournament" ? "Tournament complete" : "Full time"}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 16 }}
          className="mt-2 flex items-center justify-center gap-3 text-center font-display text-3xl text-gradient-gold sm:text-5xl"
        >
          <Icon name="trophy" size={40} className="text-gold-400" />
          {champ?.name} WINS!
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-3 text-center text-sm text-white/70 sm:text-base"
        >
          {hostLine("champion", { name: champ?.name })}
        </motion.p>

        {/* podium */}
        <div className="mt-8 flex items-end justify-center gap-3">
          {podium.map((p, i) => {
            if (!p) return <div key={i} className="w-24" />;
            const heights = ["h-24", "h-32", "h-16"];
            const medals = ["text-slate-300", "text-gold-400", "text-amber-700"];
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.18, type: "spring", stiffness: 180, damping: 18 }}
                className="flex w-24 flex-col items-center"
              >
                <Icon name="medal" size={26} className={`mb-1 ${medals[i]}`} />
                <Avatar name={p.name} size={44} ring={avatarRingFor(p.avatar, entries.indexOf(p))} />
                <div className="mt-1 w-full truncate text-center text-xs font-bold">{p.name}</div>
                <div
                  className={`mt-2 w-full rounded-t-xl bg-gradient-to-t from-gold-600/80 to-gold-400/50 ${heights[i]} flex items-start justify-center pt-2`}
                >
                  <span className="font-score text-2xl text-pitch-950">{p.score}</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* stats grid */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Correct" value={champ?.correct ?? 0} accent />
          <Stat label="Steals" value={champ?.steals ?? 0} />
          <Stat label="Best streak" value={champ?.longestStreak ?? 0} />
          <Stat label="Categories" value={champ?.categoriesCorrect.length ?? 0} />
        </div>

        {unlocked.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 flex items-center justify-center gap-1.5 text-center text-xs uppercase tracking-widest text-gold-300">
              <Icon name="medal" size={14} />
              Achievements unlocked
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {unlocked.map((id) => {
                const a = ACHIEVEMENTS.find((x) => x.id === id);
                if (!a) return null;
                return (
                  <motion.div
                    key={id}
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 14 }}
                    className="glass flex items-center gap-2 rounded-xl px-3 py-2"
                  >
                    <span className="text-xl">{a.emoji}</span>
                    <div>
                      <div className="text-xs font-bold text-gold-300">{a.name}</div>
                      <div className="text-[10px] text-white/50">{a.blurb}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {weekly.length > 0 && (
          <Glass className="mt-6 p-4">
            <p className="mb-2 flex items-center justify-center gap-1.5 text-center text-xs uppercase tracking-widest text-white/50">
              <Icon name="calendar" size={14} />
              This week's leaderboard
            </p>
            <div className="space-y-1.5">
              {weekly.map((w, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-white/80">{i + 1}. {w.name}</span>
                  <span className="font-score text-lg text-gold-300">{w.points}</span>
                </div>
              ))}
            </div>
          </Glass>
        )}

        <div className="mt-8 flex justify-center gap-3">
          <Btn variant="ghost" onClick={onHome}>
            <Icon name="home" size={16} />
            Home
          </Btn>
          <Btn size="lg" onClick={onReplay}>
            <Icon name="refresh" size={17} />
            Rematch
          </Btn>
        </div>
      </div>
    </div>
  );
}
