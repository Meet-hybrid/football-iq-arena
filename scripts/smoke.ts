import { gameReducer, initialState, createPlayer, buildPools, DEFAULT_RULES } from "../src/game/engine";
import type { GameConfig } from "../src/types";

const CATS = ["clubs", "transfers", "ballondor"];

function freshPlayers(n: number) {
  return Array.from({ length: n }, (_, i) => createPlayer(`p${i}`, `P${i}`, "🦁"));
}

function pickCategoryAndAnswer(s: ReturnType<typeof gameReducer>, correct: boolean) {
  const cat = CATS[Math.floor(Math.random() * CATS.length)] as any;
  s = gameReducer(s, { type: "PICK_CATEGORY", id: cat });
  const pool = s.pools[cat];
  const avail = pool.map((_, i) => i + 1).filter((n) => !s.used[cat].includes(n));
  const n = avail.length ? avail[0] : 1;
  s = gameReducer(s, { type: "PICK_NUMBER", n });
  s = gameReducer(s, { type: "MARK_ANSWER", correct });
  s = gameReducer(s, { type: "NEXT_TURN" }); // → scoreboard
  return gameReducer(s, { type: "NEXT_TURN" }); // → next phase
}

// --- Classic 2-player, 2 rounds, both always correct ------------------------
{
  const config: GameConfig = { mode: "classic", difficulty: "medium", rounds: 2, rules: { ...DEFAULT_RULES }, order: ["p0", "p1"] };
  let s = gameReducer(initialState(), { type: "START_GAME", config, players: freshPlayers(2), pools: buildPools("medium") });
  let steps = 0;
  while (s.phase !== "gameover" && steps < 40) {
    s = pickCategoryAndAnswer(s, true);
    steps++;
  }
  const p0 = s.players.p0.score;
  const p1 = s.players.p1.score;
  console.log("CLASSIC", s.phase, "rounds", s.roundIndex, "scores", p0, p1, "expected both 4 (2 turns each x 2pts)");
  if (s.phase !== "gameover" || p0 !== 4 || p1 !== 4) throw new Error("classic failed");
}

// --- Tournament 3 players (one bye), target 2 --------------------------------
{
  const config: GameConfig = { mode: "tournament", difficulty: "medium", rounds: 0, rules: { ...DEFAULT_RULES, tournamentTarget: 2 }, order: ["p0", "p1", "p2"] };
  let s = gameReducer(initialState(), { type: "START_GAME", config, players: freshPlayers(3), pools: buildPools("medium") });
  console.log("TOURN start", "match", s.matchIndex, "turn", s.turnPlayerId, "bracket", s.bracket?.map((m) => `${m.p1Id}v${m.p2Id}=${m.winnerId ?? "-"}`).join(" "));
  if (s.turnPlayerId === "p2") throw new Error("bye player p2 should be skipped at start");
  let steps = 0;
  while (s.phase !== "gameover" && steps < 60) {
    s = pickCategoryAndAnswer(s, true); // both players always correct → first to 2 wins each match
    steps++;
  }
  console.log("TOURN end", s.phase, "winner", s.winnerId, "steps", steps);
  if (s.phase !== "gameover" || !s.winnerId) throw new Error("tournament failed to finish");
}

// --- Sudden death, wrong answer eliminates -----------------------------------
{
  const config: GameConfig = { mode: "sudden", difficulty: "medium", rounds: 0, rules: { ...DEFAULT_RULES }, order: ["p0", "p1", "p2"] };
  let s = gameReducer(initialState(), { type: "START_GAME", config, players: freshPlayers(3), pools: buildPools("medium") });
  let steps = 0;
  while (s.phase !== "gameover" && steps < 40) {
    const wrong = s.turnPlayerId === "p1" || s.turnPlayerId === "p2";
    s = pickCategoryAndAnswer(s, !wrong);
    steps++;
  }
  const eliminated = Object.values(s.players).filter((p) => p.eliminated).length;
  console.log("SUDDEN", s.phase, "winner", s.winnerId, "eliminated", eliminated, "steps", steps);
  if (s.phase !== "gameover" || eliminated < 2) throw new Error("sudden death failed");
}

// --- Steal flow --------------------------------------------------------------
{
  const config: GameConfig = { mode: "classic", difficulty: "medium", rounds: 1, rules: { ...DEFAULT_RULES }, order: ["p0", "p1"] };
  let s = gameReducer(initialState(), { type: "START_GAME", config, players: freshPlayers(2), pools: buildPools("medium") });
  s = gameReducer(s, { type: "PICK_CATEGORY", id: "clubs" });
  s = gameReducer(s, { type: "PICK_NUMBER", n: 1 });
  s = gameReducer(s, { type: "MARK_ANSWER", correct: false }); // p0 wrong → steal window
  console.log("STEAL status", s.status);
  if (s.status !== "steal") throw new Error("steal window not opened");
  s = gameReducer(s, { type: "CHOOSE_STEALER", id: "p1" });
  console.log("STEAL ask", s.status);
  if (s.status !== "steal-ask") throw new Error("steal-ask not entered");
  s = gameReducer(s, { type: "MARK_STEAL", correct: true });
  console.log("STEAL resolved", s.status, "p1 score", s.players.p1.score);
  if (s.status !== "resolved" || s.players.p1.score !== 1) throw new Error("steal scoring failed");
}

// --- Timed challenge ----------------------------------------------------------
{
  const config: GameConfig = { mode: "classic", difficulty: "medium", rounds: 1, rules: { ...DEFAULT_RULES }, order: ["p0", "p1"] };
  let s = gameReducer(initialState(), { type: "START_GAME", config, players: freshPlayers(2), pools: buildPools("medium") });
  s = gameReducer(s, { type: "PICK_CATEGORY", id: "timed" });
  s = gameReducer(s, { type: "PICK_NUMBER", n: 1 });
  console.log("TIMED q", s.question?.type, s.question?.id);
  s = gameReducer(s, { type: "MARK_TIMED_ACCEPT", name: "Messi" });
  s = gameReducer(s, { type: "MARK_TIMED_ACCEPT", name: "Messi" }); // duplicate
  s = gameReducer(s, { type: "TIMED_END" });
  console.log("TIMED resolved", s.status, "count", s.timedCorrectCount, "delta", JSON.stringify(s.delta));
  if (s.status !== "resolved" || s.timedCorrectCount !== 1) throw new Error("timed failed");
}

console.log("\nALL SMOKE TESTS PASSED ✅");
