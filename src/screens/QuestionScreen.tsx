import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, Btn, Chip, Typewriter } from "../components/ui";
import { CATEGORY_MAP, DIFFICULTY_MAP } from "../data/categories";
import { activeOrder, currentStealer } from "../game/engine";
import { type CheckResult } from "../ai/verify";
import { aiVerify } from "../ai/openai";
import { hostLine, HOST_NAME, HOST_AVATAR, questionScript } from "../ai/aiHost";
import { speak, stopSpeaking, listen, ttsAvailable, sttAvailable } from "../audio/speech";
import { play } from "../audio/sound";
import type { GameState } from "../types";
import type { Dispatch } from "react";

export function QuestionScreen({
  state,
  dispatch,
  sound,
  tts,
}: {
  state: GameState;
  dispatch: Dispatch<any>;
  sound: boolean;
  tts: boolean;
}) {
  const q = state.question;
  const turnPlayer = state.players[state.turnPlayerId];
  const [hostMsg, setHostMsg] = useState("");
  const [checkText, setCheckText] = useState("");
  const [verdict, setVerdict] = useState<CheckResult | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [total, setTotal] = useState(0);
  const [hintShown, setHintShown] = useState(false);
  const [checking, setChecking] = useState(false);
  const stopListenRef = useRef<(() => void) | null>(null);
  const timedOutRef = useRef(false);

  const timed = q?.type === "timed";
  const active = state.status === "ask" || state.status === "steal" || state.status === "steal-ask";

  const cat = q ? CATEGORY_MAP[q.category] : null;
  const stealer = currentStealer(state);
  const teamMode = Object.values(state.players).some((p) => p.isTeam);
  const opponents = useMemo(() => {
    const order = activeOrder(state);
    return order.filter((id) => id !== state.turnPlayerId && !state.stealerIds.includes(id) && !state.players[id].eliminated);
  }, [state]);

  // host intro on new question
  useEffect(() => {
    if (!q) return;
    const line = hostLine("numberPick", { name: turnPlayer?.name, number: state.number ?? "", category: cat?.name });
    setHostMsg(line);
    setVerdict(null);
    setAiNote(null);
    setCheckText("");
    if (tts) {
      const script = questionScript(q);
      speak(`${line} ${script}`);
    }
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q?.id]);

  // outcome lines
  useEffect(() => {
    if (state.status !== "resolved" || !q) return;
    let line = "";
    switch (state.lastOutcome) {
      case "correct":
        line = hostLine("correct", { name: turnPlayer?.name, points: state.config.rules.questionValue });
        break;
      case "steal":
        line = hostLine("stealSuccess", { name: stealer?.name, points: state.config.rules.stealValue });
        break;
      case "wrong":
        line = hostLine("wrong", { name: state.stealerIds.length ? stealer?.name : turnPlayer?.name });
        break;
      case "timeout":
        line = hostLine("timeout", { name: turnPlayer?.name });
        break;
      case "eliminated":
        line = hostLine("elimination", { name: turnPlayer?.name });
        break;
      case "timed":
        line = hostLine("timedEnd", { name: turnPlayer?.name, count: state.timedCorrectCount, points: state.delta[state.turnPlayerId] ?? 0 });
        break;
      default:
        line = "";
    }
    setHostMsg(line);
    if (tts && line) {
      speak(`${line} ${q.explanation ? `Here's the breakdown: ${q.explanation}` : ""}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  // outcome sounds
  useEffect(() => {
    if (!sound || state.lastOutcome === "none") return;
    if (state.lastOutcome === "correct" || state.lastOutcome === "timed") play("correct");
    if (state.lastOutcome === "steal") play("steal");
    if (state.lastOutcome === "wrong") play("wrong");
    if (state.lastOutcome === "timeout") play("timeup");
    if (state.lastOutcome === "eliminated") play("wrong");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lastOutcome]);

  // timer — runs continuously across ask/steal phases for one question
  const hasTimer = timed || state.config.mode === "timeattack";
  useEffect(() => {
    if (!q || !hasTimer || state.status === "resolved") {
      setTotal(0);
      setRemaining(0);
      return;
    }
    const secs = timed
      ? q.timeLimit ?? 60
      : state.config.rules.timerSeconds || DIFFICULTY_MAP[state.config.difficulty].timer;
    if (!secs) {
      setTotal(0);
      setRemaining(0);
      return;
    }
    timedOutRef.current = false;
    setTotal(secs);
    setRemaining(secs);
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q?.id, hasTimer, state.status === "resolved"]);

  // tick the final seconds, then fire the timeout exactly once at zero
  useEffect(() => {
    if (sound && remaining > 0 && remaining <= 6 && total > 0) play("tick");
    if (remaining > 0 || total === 0 || timedOutRef.current) return;
    timedOutRef.current = true;
    if (sound) play("timeup");
    if (state.status === "steal-ask") {
      dispatch({ type: "MARK_STEAL", correct: false });
    } else if (state.status === "steal") {
      dispatch({ type: "CHOOSE_STEALER", id: null });
    } else {
      dispatch({ type: "TIMEOUT" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, total]);

  // timed challenge start line
  useEffect(() => {
    if (timed && active && state.status === "ask") {
      const line = hostLine("timedStart", { name: turnPlayer?.name, seconds: q?.timeLimit ?? 60 });
      setHostMsg(line);
      if (tts) speak(line);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q?.id]);

  async function doCheck(raw?: string) {
    if (!q || state.status !== "ask" || checking) return;
    const text = (raw ?? checkText).trim();
    if (!text) return;
    setChecking(true);
    try {
      if (timed) {
        const res = await aiVerify(text, q, state.timedBank);
        setVerdict(res);
        if (res.ok && res.matched) {
          dispatch({ type: "MARK_TIMED_ACCEPT", name: text, canonical: res.matched });
          if (sound) play("coin");
        } else if (sound) {
          play("wrong");
        }
        setCheckText("");
        return;
      }
      const res = await aiVerify(text, q, []);
      setVerdict(res);
      setCheckText("");
      if (q.type === "single" || q.type === "truefalse" || q.type === "thisorthat") {
        setAiNote(res.display);
        if (sound) (res.ok ? play("correct") : play("wrong"));
        dispatch({ type: "MARK_ANSWER", correct: res.ok });
      } else {
        if (sound) (res.ok ? play("coin") : play("wrong"));
      }
    } finally {
      setChecking(false);
    }
  }

  function toggleMic() {
    if (listening) {
      stopListenRef.current?.();
      setListening(false);
      return;
    }
    const stop = listen(
      (text) => doCheck(text),
      () => setListening(false),
      () => setListening(false)
    );
    if (stop) {
      stopListenRef.current = stop;
      setListening(true);
    }
  }

  if (!q || !cat) return null;
  const pct = total > 0 ? (remaining / total) * 100 : 0;
  const showTimer = remaining > 0 && active;

  return (
    <div className="pitch-bg min-h-full px-4 py-5">
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          {/* top chips */}
          <div className="flex flex-wrap items-center gap-2">
            <Chip className={`bg-gradient-to-r ${cat.gradient} text-white`}>
              {cat.emoji} {cat.name}
            </Chip>
            <Chip className="bg-white/10 text-white/80">Q{state.number}</Chip>
            <Chip className="bg-white/10 text-white/80">
              {DIFFICULTY_MAP[q.difficulty].emoji} {DIFFICULTY_MAP[q.difficulty].name}
            </Chip>
            {timed && <Chip className="bg-yellow-400/20 text-yellow-300">⏱️ Timed · {q.timeLimit}s</Chip>}
            {showTimer && (
              <div className="ml-auto flex items-center gap-2">
                <div className="h-2 w-24 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full bg-gradient-to-r from-gold-300 to-flame-500"
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
                <span className={`font-score text-2xl ${remaining <= 6 ? "text-flame-500" : "text-gold-300"}`}>
                  {remaining}s
                </span>
              </div>
            )}
          </div>

          {/* AI host */}
          <div className="glass flex items-start gap-3 rounded-2xl p-4">
            <div className="shrink-0">
              <Avatar emoji={HOST_AVATAR} size={52} ring={0} />
              <div className="mt-1 text-center text-[10px] font-bold text-gold-300">{HOST_NAME}</div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="min-h-[44px]">
                <Typewriter key={state.question?.id + state.status} text={hostMsg} className="text-sm leading-relaxed text-white/90 sm:text-base" />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {ttsAvailable() && (
                  <button
                    onClick={() => speak(questionScript(q))}
                    className="rounded-lg bg-white/8 px-3 py-1 text-xs text-white/70 hover:bg-white/15"
                  >
                    🔊 Read question
                  </button>
                )}
                <button onClick={() => stopSpeaking()} className="rounded-lg bg-white/8 px-3 py-1 text-xs text-white/70 hover:bg-white/15">
                  ⏹ Stop
                </button>
                {!timed && state.status === "ask" && (
                  <button
                    onClick={() => {
                      if (hintShown) return;
                      const hint = q.hint ?? "Think about the category — the answer is hiding in plain sight.";
                      setHostMsg(hostLine("hint", { name: turnPlayer?.name, hint }));
                      if (tts) speak(hint);
                      if (sound) play("hint");
                      setHintShown(true);
                    }}
                    className="rounded-lg bg-white/8 px-3 py-1 text-xs text-white/70 hover:bg-white/15"
                  >
                    💡 Hint
                  </button>
                )}
                {sttAvailable() && state.status === "ask" && (
                  <button
                    onClick={toggleMic}
                    className={`rounded-lg px-3 py-1 text-xs ${listening ? "animate-pulse bg-flame-500 text-white" : "bg-white/8 text-white/70 hover:bg-white/15"}`}
                  >
                    🎤 {listening ? "Listening…" : "Voice answer"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* question card */}
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-strong rounded-2xl p-6 sm:p-8"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-widest text-white/40">
                {timed ? "Name as many as you can" : "Question"}
              </span>
              <span className="text-[11px] uppercase tracking-widest text-white/40">{turnPlayer?.name}</span>
            </div>
            <h2 className="font-display text-xl leading-snug text-white sm:text-2xl">{q.prompt}</h2>
            {q.sub && (
              <p className="mt-3 font-score text-2xl tracking-wide text-gold-300 sm:text-3xl">{q.sub}</p>
            )}
            {verdict && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-3 text-sm font-semibold ${verdict.ok ? "text-emerald-400" : "text-flame-500"}`}
              >
                {verdict.display}
                {verdict.source && (
                  <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/50">
                    {verdict.source === "ai" ? "🤖 AI verified" : "💾 local check"}
                  </span>
                )}
              </motion.p>
            )}
          </motion.div>

          {/* controls */}
          <AnimatePresence mode="wait">
            {state.status === "ask" && !timed && (
              <motion.div key="ask" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Btn variant="success" size="lg" onClick={() => dispatch({ type: "MARK_ANSWER", correct: true })}>
                    ✓ Correct
                  </Btn>
                  <Btn variant="danger" size="lg" onClick={() => dispatch({ type: "MARK_ANSWER", correct: false })}>
                    ✗ Wrong
                  </Btn>
                </div>
                <div className="glass rounded-xl p-3">
                  <div className="mb-1.5 text-[11px] uppercase tracking-widest text-white/40">
                    AI answer check — type what the player said
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={checkText}
                      onChange={(e) => setCheckText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && doCheck()}
                      placeholder='e.g. "Ronaldinho"'
                      className="min-w-0 flex-1 rounded-lg bg-white/8 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:bg-white/12"
                    />
                    <Btn size="sm" disabled={checking} onClick={() => doCheck()}>
                      {checking ? "🤖…" : "🤖 Check"}
                    </Btn>
                  </div>
                </div>
              </motion.div>
            )}

            {state.status === "ask" && timed && (
              <motion.div key="timed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <div className="glass rounded-xl p-3">
                  <div className="mb-1.5 flex items-center justify-between text-[11px] uppercase tracking-widest text-white/40">
                    <span>Type each name the player says</span>
                    <span className="text-gold-300">{state.timedCorrectCount} on the board</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={checkText}
                      onChange={(e) => setCheckText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && doCheck()}
                      placeholder="e.g. Messi"
                      className="min-w-0 flex-1 rounded-lg bg-white/8 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:bg-white/12"
                    />
                    <Btn size="sm" disabled={checking} onClick={() => doCheck()}>
                      {checking ? "🤖…" : "+ Add"}
                    </Btn>
                  </div>
                  {state.timedBank.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {state.timedBank.map((name) => (
                        <Chip key={name} className="bg-emerald-400/15 text-emerald-300">{name}</Chip>
                      ))}
                    </div>
                  )}
                </div>
                <Btn variant="outline" size="lg" className="w-full" onClick={() => dispatch({ type: "TIMED_END" })}>
                  ⏹ End turn early
                </Btn>
              </motion.div>
            )}

            {state.status === "steal" && (
              <motion.div key="steal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <p className="text-center font-display text-lg text-gold-300">
                  {hostLine("stealOffer", { name: turnPlayer?.name, opponents: opponents.map((o) => state.players[o]?.name).join(", ") })}
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {opponents.map((oid) => {
                    const p = state.players[oid];
                    return (
                      <Btn key={oid} variant="ghost" onClick={() => dispatch({ type: "CHOOSE_STEALER", id: oid })}>
                        <span className="mr-1">{p?.avatar}</span> {p?.name}
                      </Btn>
                    );
                  })}
                  <Btn variant="outline" onClick={() => dispatch({ type: "CHOOSE_STEALER", id: null })}>
                    Nobody steals
                  </Btn>
                </div>
              </motion.div>
            )}

            {state.status === "steal-ask" && stealer && (
              <motion.div key="stealask" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <p className="text-center font-display text-lg text-gold-300">
                  🕶️ Steal attempt — <span className="text-white">{stealer.name}</span>
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Btn variant="success" size="lg" onClick={() => dispatch({ type: "MARK_STEAL", correct: true })}>
                    ✓ {stealer.name} got it (+{state.config.rules.stealValue})
                  </Btn>
                  <Btn variant="danger" size="lg" onClick={() => dispatch({ type: "MARK_STEAL", correct: false })}>
                    ✗ Missed
                  </Btn>
                </div>
              </motion.div>
            )}

            {state.status === "resolved" && (
              <motion.div key="resolved" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="glass rounded-2xl p-5">
                  <div className="mb-2 text-[11px] uppercase tracking-widest text-white/40">Answer{state.delta && Object.keys(state.delta).length ? "" : "s"}</div>
                  {timed ? (
                    <p className="text-white/90">
                      <span className="font-score text-3xl text-gold-300">{state.timedCorrectCount}</span> names ·{" "}
                      <span className="font-bold text-emerald-400">+{state.delta[state.turnPlayerId] ?? 0} pts</span>
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {q.type === "truefalse" ? (
                        <Chip className="bg-white/10 text-white/90">{q.answer[0]}</Chip>
                      ) : (
                        q.answer.slice(0, 12).map((a) => (
                          <Chip key={a} className="bg-white/10 text-white/90">{a}</Chip>
                        ))
                      )}
                    </div>
                  )}
                  {aiNote && <p className="mt-2 text-xs text-gold-300">🤖 {aiNote}</p>}
                  <p className="mt-3 text-sm leading-relaxed text-white/75">
                    <span className="font-bold text-gold-300">Did you know? </span>
                    {q.explanation}
                  </p>
                </div>
                <Btn size="lg" className="w-full" onClick={() => dispatch({ type: "NEXT_TURN" })}>
                  Next →
                </Btn>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* live scoreboard */}
        <div className="space-y-3">
          <div className="glass rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-sm uppercase tracking-widest text-white/60">Live scores</h3>
              <span className="text-xs text-white/40">Round {Math.max(1, state.roundIndex + 1)}</span>
            </div>
            <div className="space-y-2">
              {Object.values(state.players)
                .filter((p) => p.isTeam === teamMode)
                .sort((a, b) => b.score - a.score)
                .map((p, i) => {
                  const isTurn = p.id === state.turnPlayerId || (state.stealerIds.includes(p.id) && state.status === "steal-ask");
                  const d = state.delta[p.id];
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition ${
                        isTurn ? "bg-gold-400/12 ring-1 ring-gold-400/50" : "bg-white/4"
                      } ${p.eliminated ? "opacity-35" : ""}`}
                    >
                      <span className="w-4 text-xs text-white/40">{i + 1}</span>
                      <Avatar emoji={p.avatar} size={30} ring={i} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">
                          {p.name}
                          {p.isTeam && <span className="ml-1 text-[10px] text-white/40">({p.members?.length} players)</span>}
                          {p.eliminated && <span className="ml-1 text-[10px] text-flame-500">OUT</span>}
                        </div>
                      </div>
                      <AnimatePresence>
                        {d !== undefined && d > 0 && (
                          <motion.span
                            key={p.id + d}
                            initial={{ opacity: 0, scale: 0.6, y: -6 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="font-score text-xl text-emerald-400"
                          >
                            +{d}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      <span className="font-score w-10 text-right text-2xl text-gold-300">{p.score}</span>
                    </div>
                  );
                })}
            </div>
            <p className="mt-3 text-center text-[10px] uppercase tracking-widest text-white/30">
              {state.config.mode === "tournament" ? `First to ${state.config.rules.tournamentTarget} wins the match` : `${state.config.rules.questionValue} pts per correct · ${state.config.rules.stealValue} pt steal`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
