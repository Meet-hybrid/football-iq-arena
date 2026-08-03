import { useMemo } from "react";
import { Btn, Glass, Stat } from "../components/ui";
import { loadCareer, loadWeekly, loadDaily } from "../game/stats";
import { ACHIEVEMENTS } from "../data/achievements";
import type { CareerStats } from "../types";

export function StatsScreen({ onBack }: { onBack: () => void }) {
  const career = useMemo(() => loadCareer(), []);
  const weekly = useMemo(() => loadWeekly().sort((a, b) => b.points - a.points).slice(0, 10), []);
  const daily = useMemo(() => loadDaily(), []);
  const entries = Object.entries(career).sort(([, a], [, b]) => b.points - a.points);

  const totals: CareerStats = entries.reduce(
    (acc, [, s]) => ({
      games: acc.games + s.games,
      wins: acc.wins + s.wins,
      points: acc.points + s.points,
      correct: acc.correct + s.correct,
      steals: acc.steals + s.steals,
      longestStreak: Math.max(acc.longestStreak, s.longestStreak),
      hardSolved: acc.hardSolved + s.hardSolved,
      categories: {},
      achievements: [...new Set([...acc.achievements, ...s.achievements])],
    }),
    {
      games: 0,
      wins: 0,
      points: 0,
      correct: 0,
      steals: 0,
      longestStreak: 0,
      hardSolved: 0,
      categories: {},
      achievements: [],
    } as CareerStats
  );

  return (
    <div className="pitch-bg min-h-full px-4 py-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Btn variant="ghost" size="sm" onClick={onBack}>← Back</Btn>
          <h1 className="font-display text-xl text-white">My Stats</h1>
          <div className="w-16" />
        </div>

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          <Stat label="Games" value={totals.games} />
          <Stat label="Wins" value={totals.wins} accent />
          <Stat label="Points" value={totals.points} accent />
          <Stat label="Correct" value={totals.correct} />
          <Stat label="Steals" value={totals.steals} />
          <Stat label="Best streak" value={totals.longestStreak} />
        </div>

        {daily && (
          <Glass className="mt-6 p-4">
            <p className="text-xs uppercase tracking-widest text-white/50">Daily challenge</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-score text-3xl text-gold-300">🔥 {daily.streak} day streak</span>
              <span className="text-sm text-white/70">{daily.solved ? "✅ Solved today" : "❌ Not yet today"}</span>
            </div>
          </Glass>
        )}

        <Glass className="mt-6 p-4">
          <p className="mb-3 text-xs uppercase tracking-widest text-white/50">Player careers</p>
          <div className="space-y-2">
            {entries.length === 0 && <p className="text-sm text-white/40">No games played yet — go play!</p>}
            {entries.map(([name, s]) => (
              <div key={name} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                <div>
                  <div className="text-sm font-bold capitalize">{name}</div>
                  <div className="text-[11px] text-white/50">
                    {s.games} games · {s.wins} wins · {s.correct} correct · {s.steals} steals
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-score text-2xl text-gold-300">{s.points}</div>
                  <div className="text-[10px] text-white/40">pts</div>
                </div>
              </div>
            ))}
          </div>
        </Glass>

        <Glass className="mt-6 p-4">
          <p className="mb-3 text-xs uppercase tracking-widest text-white/50">
            🎖️ Achievements · {totals.achievements.length}/{ACHIEVEMENTS.length}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ACHIEVEMENTS.map((a) => {
              const unlocked = totals.achievements.includes(a.id);
              return (
                <div
                  key={a.id}
                  className={`rounded-xl border p-3 ${unlocked ? "border-gold-400/50 bg-gold-400/10" : "border-white/8 bg-white/3 opacity-45"}`}
                >
                  <div className="text-2xl">{unlocked ? a.emoji : "🔒"}</div>
                  <div className="mt-1 text-xs font-bold">{a.name}</div>
                  <div className="text-[10px] leading-tight text-white/50">{a.blurb}</div>
                </div>
              );
            })}
          </div>
        </Glass>

        <Glass className="mt-6 p-4">
          <p className="mb-3 text-xs uppercase tracking-widest text-white/50">🗓️ Weekly leaderboard</p>
          <div className="space-y-1.5">
            {weekly.length === 0 && <p className="text-sm text-white/40">No points this week yet.</p>}
            {weekly.map((w, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-white/80">{i + 1}. {w.name}</span>
                <span className="font-score text-lg text-gold-300">{w.points}</span>
              </div>
            ))}
          </div>
        </Glass>
      </div>
    </div>
  );
}
