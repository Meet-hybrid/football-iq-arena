import { useState } from "react";
import { motion } from "framer-motion";
import { Avatar, Btn, Chip, Glass } from "../components/ui";
import { CATEGORY_MAP } from "../data/categories";
import { aiGenerateQuestion } from "../ai/openai";
import type { Action, GameState } from "../types";
import type { Dispatch } from "react";
import { play } from "../audio/sound";

export function NumberSelectScreen({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: Dispatch<Action>;
}) {
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState<string | null>(null);

  if (!state.category) return null;
  const cat = CATEGORY_MAP[state.category];

  async function generateAIQuestion() {
    if (!state.category || generating) return;
    setGenerating(true);
    setGenMsg(null);
    const q = await aiGenerateQuestion(state.category, state.config.difficulty);
    if (q) {
      dispatch({ type: "ADD_AI_QUESTION", category: state.category, question: q });
      setGenMsg(`✨ AI added question #${state.pools[state.category].length + 1} to the board!`);
      play("coin");
    } else {
      setGenMsg("🤖 Live AI unavailable right now — try again in a moment.");
      play("wrong");
    }
    setGenerating(false);
  }
  const pool = state.pools[state.category];
  const used = state.used[state.category];
  const player = state.players[state.turnPlayerId];
  const allUsed = used.length >= pool.length;
  const gridCols = pool.length > 12 ? 6 : pool.length > 8 ? 5 : 4;

  return (
    <div className="pitch-bg min-h-full px-4 py-6">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6">
        <div className="flex items-center gap-3">
          <Avatar emoji={player?.avatar ?? "🙋"} size={48} ring={state.turnIndex} active />
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-white/50">{player?.name}'s turn</p>
            <p className="font-display text-lg text-white">
              Pick a <span className="text-gold-300">question number</span>
            </p>
          </div>
        </div>

        <Chip className={`bg-gradient-to-r ${cat.gradient} text-white`}>
          {cat.emoji} {cat.name}
        </Chip>

        <Glass className="w-full p-5">
          {allUsed && (
            <p className="mb-3 text-center text-sm text-gold-300">
              🔄 All questions used — the board resets!
            </p>
          )}
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0,1fr))` }}>
            {pool.map((_, i) => {
              const n = i + 1;
              const isUsed = used.includes(n);
              return (
                <motion.button
                  key={n}
                  whileHover={isUsed ? undefined : { scale: 1.06 }}
                  whileTap={isUsed ? undefined : { scale: 0.94 }}
                  disabled={isUsed}
                  onClick={() => {
                    play("pop");
                    dispatch({ type: "PICK_NUMBER", n });
                  }}
                  className={`font-score relative aspect-square rounded-xl text-3xl transition ${
                    isUsed
                      ? "bg-white/5 text-white/15"
                      : "bg-gradient-to-br from-white/10 to-white/5 text-gold-300 ring-1 ring-white/15 hover:ring-gold-400/70"
                  }`}
                >
                  {n}
                  {isUsed && <span className="absolute inset-0 flex items-center justify-center text-lg opacity-40">✓</span>}
                </motion.button>
              );
            })}
          </div>
        </Glass>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Btn size="lg" onClick={() => { play("coin"); dispatch({ type: "RANDOM_NUMBER" }); }}>
            🎲 Generate Random Number
          </Btn>
          <Btn
            size="lg"
            variant="outline"
            disabled={generating}
            onClick={generateAIQuestion}
          >
            {generating ? "✨ Thinking…" : "✨ Generate AI Question"}
          </Btn>
        </div>
        {genMsg && <p className="text-center text-sm text-gold-300">{genMsg}</p>}

        <p className="text-center text-xs text-white/40">
          Questions never repeat until every number has been used.
        </p>
      </div>
    </div>
  );
}
