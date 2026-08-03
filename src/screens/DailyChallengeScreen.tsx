import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Avatar, Btn, Chip, Confetti, Glass, Icon, Typewriter } from "../components/ui";
import { CATEGORY_MAP, DIFFICULTY_MAP } from "../data/categories";
import { dailyQuestion } from "../data/questionBank";
import { aiVerify } from "../ai/openai";
import { hostLine, HOST_NAME } from "../ai/aiHost";
import { loadDaily, saveDaily, todayStr } from "../game/stats";
import { play } from "../audio/sound";
import { speak, ttsAvailable } from "../audio/speech";

export function DailyChallengeScreen({ onBack }: { onBack: () => void }) {
  const today = todayStr();
  const daily = useMemo(() => loadDaily(), []);
  const q = useMemo(() => dailyQuestion(today), [today]);
  const cat = CATEGORY_MAP[q.category];
  const solvedToday = daily?.date === today;

  const [input, setInput] = useState("");
  const [correct, setCorrect] = useState<boolean | null>(solvedToday ? (daily?.solved ?? false) : null);

  const streak = useMemo(() => {
    if (solvedToday) return daily?.streak ?? 0;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const ys = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
    return daily?.date === ys && daily.solved ? (daily.streak ?? 0) : 0;
  }, [daily, solvedToday, today]);

  const [streakState, setStreakState] = useState(streak);

  async function submit() {
    if (!input.trim() || correct !== null) return;
    const res = await aiVerify(input, q, []);
    if (res.ok) {
      setCorrect(true);
      play("correct");
      const newStreak = streak + 1;
      setStreakState(newStreak);
      saveDaily({ date: today, best: 1, streak: newStreak, solved: true });
      if (ttsAvailable()) speak(hostLine("aiGood", { name: "you" }) + " " + q.explanation);
    } else {
      play("wrong");
      setCorrect(false);
      saveDaily({ date: today, best: 0, streak, solved: false });
      if (ttsAvailable()) speak(hostLine("aiBad", { name: "you" }));
    }
  }

  return (
    <div className="pitch-bg min-h-full px-4 py-6">
      {correct === true && <Confetti count={50} />}
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center justify-between">
          <Btn variant="ghost" size="sm" onClick={onBack}>
            <Icon name="arrow-left" size={15} />
            Back
          </Btn>
          <h1 className="flex items-center gap-2 font-display text-xl text-white">
            <Icon name="calendar" size={20} className="text-gold-400" />
            Daily Challenge
          </h1>
          <div className="w-16" />
        </div>

        <div className="mb-4 flex items-center justify-center gap-3">
          <Chip className="bg-white/10 text-white/80">
            <Icon name="flame" size={12} className="text-orange-400" />
            {streakState} day streak
          </Chip>
          <Chip className={`bg-gradient-to-r ${cat.gradient} text-white`}>{cat.emoji} {cat.name}</Chip>
          <Chip className="bg-white/10 text-white/80">{DIFFICULTY_MAP[q.difficulty].name}</Chip>
        </div>

        <Glass className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Avatar icon="mic" size={28} ring={0} />
            <span className="text-xs font-bold text-gold-300">{HOST_NAME}</span>
          </div>
          <Typewriter text={hostLine("dailyIntro", {})} className="mb-4 text-sm text-white/80" />
          <h2 className="font-display text-lg leading-snug text-white sm:text-xl">{q.prompt}</h2>
          {q.sub && <p className="mt-2 font-score text-xl text-gold-300">{q.sub}</p>}
        </Glass>

        {correct === null ? (
          <div className="mt-5 space-y-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Type your answer…"
                className="min-w-0 flex-1 rounded-xl bg-white/8 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:bg-white/12"
              />
              <Btn onClick={submit}>
                <Icon name="sparkles" size={15} />
                Check
              </Btn>
            </div>
            <p className="text-center text-xs text-white/40">One question. One shot. No pressure… okay, a little.</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5 space-y-3">
            <div className={`glass rounded-2xl p-5 text-center ${correct ? "" : ""}`}>
              <div className={`flex items-center justify-center gap-2 font-display text-2xl ${correct ? "text-emerald-400" : "text-flame-500"}`}>
                <Icon name={correct ? "check" : "x"} size={26} />
                {correct ? "Correct! Brilliant!" : "Not this time!"}
              </div>
              {!correct && (
                <p className="mt-2 text-sm text-white/70">
                  Answer: <span className="font-bold text-gold-300">{q.answer[0]}</span>
                </p>
              )}
              <p className="mt-3 text-sm leading-relaxed text-white/75">
                <span className="font-bold text-gold-300">Did you know? </span>
                {q.explanation}
              </p>
              <p className="mt-4 text-xs text-white/50">Come back tomorrow for a new challenge.</p>
            </div>
            <Btn variant="ghost" className="w-full" onClick={onBack}>Done</Btn>
          </motion.div>
        )}
      </div>
    </div>
  );
}
