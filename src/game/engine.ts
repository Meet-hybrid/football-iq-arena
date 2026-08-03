import type {
  Action,
  BracketMatch,
  CategoryId,
  GameConfig,
  GameState,
  HouseRules,
  Player,
  Question,
} from "../types";
import { CATEGORIES } from "../data/categories";
import { poolFor } from "../data/questionBank";
import { checkAnswer } from "../ai/verify";

export const DEFAULT_RULES: HouseRules = {
  questionValue: 2,
  stealValue: 1,
  stealEnabled: true,
  maxSteals: 1,
  timerSeconds: 0,
  timedPointValue: 1,
  tournamentTarget: 6,
};

export function createPlayer(
  id: string,
  name: string,
  avatar: string,
  opts: { teamId?: string; members?: string[]; isTeam?: boolean } = {}
): Player {
  return {
    id,
    name,
    avatar,
    teamId: opts.teamId,
    members: opts.members,
    isTeam: opts.isTeam ?? false,
    score: 0,
    streak: 0,
    longestStreak: 0,
    correct: 0,
    steals: 0,
    attempts: 0,
    categoriesCorrect: [],
    eliminated: false,
  };
}

export function initialState(): GameState {
  const used = Object.fromEntries(CATEGORIES.map((c) => [c.id, [] as number[]])) as Record<
    CategoryId,
    number[]
  >;
  return {
    phase: "home",
    config: null as unknown as GameConfig,
    players: {},
    pools: {} as Record<CategoryId, Question[]>,
    used,
    category: null,
    number: null,
    question: null,
    roundIndex: 0,
    turnIndex: 0,
    turnPlayerId: "",
    status: "ask",
    stealerIds: [],
    stealAttempts: 0,
    hintUsed: false,
    delta: {},
    log: [],
    timedBank: [],
    timedCorrectCount: 0,
    bracket: null,
    matchIndex: 0,
    winnerId: null,
    eliminations: [],
    logCounter: 0,
    gameStartedAt: Date.now(),
    lastOutcome: "none",
    gameEnding: false,
  };
}

export function buildPools(difficulty: GameConfig["difficulty"]): Record<CategoryId, Question[]> {
  return Object.fromEntries(CATEGORIES.map((c) => [c.id, poolFor(c.id, difficulty)])) as Record<
    CategoryId,
    Question[]
  >;
}

// --- helpers ----------------------------------------------------------------

function pushLog(s: GameState, playerId: string, delta: number, text: string) {
  s.log = [...s.log, { id: ++s.logCounter, playerId, delta, text }].slice(-60);
}

function bump(p: Player, amount: number) {
  p.score += amount;
  p.correct += 1;
  p.attempts += 1;
  p.streak += 1;
  p.longestStreak = Math.max(p.longestStreak, p.streak);
}

function miss(p: Player) {
  p.attempts += 1;
  p.streak = 0;
}

function addCategory(s: GameState, p: Player) {
  if (s.question && !p.categoriesCorrect.includes(s.question.category)) {
    p.categoriesCorrect.push(s.question.category);
  }
}

function resetTurnFields(s: GameState) {
  s.category = null;
  s.number = null;
  s.question = null;
  s.status = "ask";
  s.stealerIds = [];
  s.stealAttempts = 0;
  s.hintUsed = false;
  s.delta = {};
  s.timedBank = [];
  s.timedCorrectCount = 0;
  s.lastOutcome = "none";
}

export function activeOrder(s: GameState): string[] {
  if (s.config.mode === "tournament" && s.bracket && s.bracket.length > 0) {
    const m = s.bracket[Math.min(s.matchIndex, s.bracket.length - 1)];
    if (m.winnerId) return [];
    return m.p2Id ? [m.p1Id, m.p2Id] : [m.p1Id];
  }
  return s.config.order.filter((id) => !s.players[id]?.eliminated);
}

function stealAvailable(s: GameState): boolean {
  const q = s.question;
  if (!q || q.type === "timed") return false;
  if (s.config.mode === "sudden") return false;
  if (!s.config.rules.stealEnabled) return false;
  if (s.stealAttempts >= s.config.rules.maxSteals) return false;
  const order = activeOrder(s);
  const candidates = order.filter(
    (id) => id !== s.turnPlayerId && !s.stealerIds.includes(id) && !s.players[id].eliminated
  );
  if (s.config.mode === "tournament") return candidates.length > 0;
  return candidates.length > 0;
}

function scoreboardStandings(s: GameState): string[] {
  const teamMode = Object.values(s.players).some((p) => p.isTeam);
  return Object.values(s.players)
    .filter((p) => p.isTeam === teamMode)
    .sort((a, b) => b.score - a.score)
    .map((p) => p.id);
}

/** In tournament mode, keep the current bracket match's score in sync. */
function syncMatchScore(s: GameState, pid: string, value: number) {
  if (s.config.mode !== "tournament" || !s.bracket) return;
  const m = s.bracket[Math.min(s.matchIndex, s.bracket.length - 1)];
  if (!m) return;
  m.scores[pid] = (m.scores[pid] ?? 0) + value;
  m.turnCount += 1;
}

// --- tournament bracket helpers ---------------------------------------------

function buildBracketRound(ids: string[]): BracketMatch[] {
  const matches: BracketMatch[] = [];
  for (let i = 0; i < ids.length; i += 2) {
    const p1 = ids[i];
    const p2 = ids[i + 1] ?? null;
    matches.push({
      id: `${Date.now()}-${i}`,
      p1Id: p1,
      p2Id: p2,
      scores: { [p1]: 0, ...(p2 ? { [p2]: 0 } : {}) },
      turnCount: 0,
      label: p2 ? `vs` : `bye`,
    });
  }
  return matches;
}

function buildInitialBracket(order: string[]): BracketMatch[] {
  return buildBracketRound(order);
}

// --- reducer ----------------------------------------------------------------

export function gameReducer(state: GameState, action: Action): GameState {
  const s: GameState = {
    ...state,
    players: { ...state.players },
    log: state.log ? [...state.log] : [],
    stealerIds: [...state.stealerIds],
    eliminations: [...state.eliminations],
    delta: { ...state.delta },
    used: Object.fromEntries(Object.entries(state.used).map(([k, v]) => [k, [...v]])) as Record<
      CategoryId,
      number[]
    >,
  };

  switch (action.type) {
    case "START_GAME": {
      const players: Record<string, Player> = {};
      for (const p of action.players) players[p.id] = { ...p };
      const used = Object.fromEntries(CATEGORIES.map((c) => [c.id, [] as number[]])) as Record<
        CategoryId,
        number[]
      >;
      const cfg = { ...action.config, order: [...action.config.order] };
      const start: GameState = {
        ...s,
        phase: "category",
        config: cfg,
        players,
        pools: action.pools,
        used,
        turnIndex: 0,
        roundIndex: 0,
        turnPlayerId: cfg.order[0],
        winnerId: null,
        eliminations: [],
        log: [],
        logCounter: 0,
        bracket: cfg.mode === "tournament" ? buildInitialBracket(cfg.order) : null,
        matchIndex: 0,
        gameStartedAt: Date.now(),
        gameEnding: false,
      };
      resetTurnFields(start);
      // auto-complete byes and skip to the first live match
      if (start.bracket) {
        const target = start.config.rules.tournamentTarget;
        while (start.matchIndex < start.bracket.length) {
          const nm = start.bracket[start.matchIndex];
          if (!nm.p2Id) {
            nm.winnerId = nm.p1Id;
            nm.scores[nm.p1Id] = target;
            start.matchIndex += 1;
            continue;
          }
          if (nm.winnerId) {
            start.matchIndex += 1;
            continue;
          }
          break;
        }
        if (start.matchIndex < start.bracket.length) {
          start.turnPlayerId = start.bracket[start.matchIndex].p1Id;
        }
      }
      return start;
    }

    case "PICK_CATEGORY": {
      if (s.phase !== "category") return s;
      return { ...s, category: action.id, phase: "number" };
    }

    case "PICK_NUMBER": {
      if (s.phase !== "number" || !s.category) return s;
      const pool = s.pools[s.category];
      const n = action.n;
      if (n < 1 || n > pool.length) return s;
      // When every question in the category has been used, reset the pool so
      // numbers become available again ("never repeat until all are used").
      let used = s.used[s.category];
      if (used.length >= pool.length) used = [];
      if (used.includes(n)) return s;
      used = [...used, n];
      const q = pool[n - 1];
      const next: GameState = {
        ...s,
        used: { ...s.used, [s.category]: used },
        number: n,
        question: q,
        phase: "question",
        status: "ask",
        hintUsed: false,
        timedBank: [],
        timedCorrectCount: 0,
        lastOutcome: "none",
      };
      return next;
    }

    case "RANDOM_NUMBER": {
      if (s.phase !== "number" || !s.category) return s;
      const cat = s.category;
      const pool = s.pools[cat];
      const used = s.used[cat].length >= pool.length ? [] : s.used[cat];
      let available = pool.map((_, i) => i + 1).filter((n) => !used.includes(n));
      if (available.length === 0) available = pool.map((_, i) => i + 1);
      const n = available[Math.floor(Math.random() * available.length)];
      return gameReducer(s, { type: "PICK_NUMBER", n });
    }

    case "MARK_ANSWER": {
      if (s.phase !== "question" || !s.question || s.status !== "ask") return s;
      const pid = s.turnPlayerId;
      const p = s.players[pid];
      const q = s.question;
      if (action.correct) {
        const value = s.config.rules.questionValue;
        bump(p, value);
        addCategory(s, p);
        syncMatchScore(s, pid, value);
        s.delta = { [pid]: value };
        s.lastOutcome = "correct";
        pushLog(s, pid, value, `Correct — ${q.category} (+${value})`);
      } else {
        miss(p);
        s.delta = {};
        if (s.config.mode === "sudden") {
          p.eliminated = true;
          s.eliminations = [...s.eliminations, pid];
          s.lastOutcome = "eliminated";
          pushLog(s, pid, 0, `Eliminated — wrong answer`);
        } else {
          s.lastOutcome = "wrong";
          pushLog(s, pid, 0, `Missed — ${q.category}`);
        }
      }
      if (action.correct || !stealAvailable(s)) {
        s.status = "resolved";
      } else {
        s.status = "steal";
      }
      return s;
    }

    case "TIMEOUT": {
      if (s.phase !== "question" || !s.question) return s;
      if (s.question.type === "timed") {
        return gameReducer(s, { type: "TIMED_END" });
      }
      s.lastOutcome = "timeout";
      return gameReducer(s, { type: "MARK_ANSWER", correct: false });
    }

    case "MARK_TIMED_ACCEPT": {
      if (s.phase !== "question" || !s.question || s.question.type !== "timed" || s.status !== "ask") return s;
      // The UI pre-verifies (possibly with live AI) and passes the canonical
      // answer; the reducer trusts it and only guards against duplicates.
      const name = action.canonical?.trim();
      if (name) {
        if (s.timedBank.some((n) => n.toLowerCase() === name.toLowerCase())) return s;
        s.timedBank = [...s.timedBank, name];
        s.timedCorrectCount += 1;
        s.delta = { [s.turnPlayerId]: s.timedCorrectCount * s.config.rules.timedPointValue };
        return s;
      }
      const res = checkAnswer(action.name, s.question, s.timedBank);
      if (res.ok && res.matched) {
        s.timedBank = [...s.timedBank, res.matched];
        s.timedCorrectCount += 1;
        s.delta = { [s.turnPlayerId]: s.timedCorrectCount * s.config.rules.timedPointValue };
      }
      return s;
    }

    case "ADD_AI_QUESTION": {
      if (s.phase !== "number" || !s.category) return s;
      if (action.category !== s.category) return s;
      const pool = s.pools[action.category];
      if (pool.some((q) => q.id === action.question.id)) return s;
      return {
        ...s,
        pools: { ...s.pools, [action.category]: [...pool, action.question] },
      };
    }

    case "TIMED_END": {
      if (s.phase !== "question" || !s.question || s.question.type !== "timed" || s.status !== "ask") {
        return s;
      }
      const pid = s.turnPlayerId;
      const p = s.players[pid];
      const count = s.timedCorrectCount;
      const value = count * s.config.rules.timedPointValue;
      p.score += value;
      p.correct += count;
      p.attempts += 1;
      syncMatchScore(s, pid, value);
      if (count > 0) {
        p.streak += 1;
        p.longestStreak = Math.max(p.longestStreak, p.streak);
        addCategory(s, p);
      }
      s.delta = { [pid]: value };
      s.lastOutcome = "timed";
      pushLog(s, pid, value, `Timed challenge — ${count} names (+${value})`);
      s.status = "resolved";
      return s;
    }

    case "CHOOSE_STEALER": {
      if (s.phase !== "question" || s.status !== "steal") return s;
      if (!action.id) {
        s.status = "resolved";
        s.lastOutcome = "none";
        pushLog(s, s.turnPlayerId, 0, "Nobody stole the question");
        return s;
      }
      s.stealerIds = [...s.stealerIds, action.id];
      s.stealAttempts += 1;
      s.status = "steal-ask";
      return s;
    }

    case "MARK_STEAL": {
      if (s.phase !== "question" || !s.question || s.status !== "steal-ask") return s;
      const sid = s.stealerIds[s.stealerIds.length - 1];
      const p = s.players[sid];
      if (!p) return s;
      if (action.correct) {
        const value = s.config.rules.stealValue;
        p.score += value;
        p.correct += 1;
        p.attempts += 1;
        p.steals += 1;
        p.streak += 1;
        p.longestStreak = Math.max(p.longestStreak, p.streak);
        addCategory(s, p);
        syncMatchScore(s, sid, value);
        s.delta = { [sid]: value };
        s.lastOutcome = "steal";
        pushLog(s, sid, value, `STOLEN! ${p.name} (+${value})`);
        s.status = "resolved";
      } else {
        miss(p);
        s.delta = {};
        s.lastOutcome = "wrong";
        pushLog(s, sid, 0, `Steal missed — ${p.name}`);
        if (stealAvailable(s)) s.status = "steal";
        else s.status = "resolved";
      }
      return s;
    }

    case "NEXT_TURN": {
      if (s.phase === "question" && s.status === "resolved") {
        s.phase = "scoreboard";
        return s;
      }
      if (s.phase !== "scoreboard") return s;

      // --- Tournament match progression ---
      if (s.config.mode === "tournament" && s.bracket) {
        const target = s.config.rules.tournamentTarget;
        const m = s.bracket[Math.min(s.matchIndex, s.bracket.length - 1)];
        if (m && !m.winnerId) {
          if (!m.p2Id) m.winnerId = m.p1Id;
          else if ((m.scores[m.p1Id] ?? 0) >= target) m.winnerId = m.p1Id;
          else if (m.p2Id && (m.scores[m.p2Id] ?? 0) >= target) m.winnerId = m.p2Id;
        }
        if (m?.winnerId) {
          s.matchIndex += 1;
          if (s.matchIndex >= s.bracket.length) {
            // this bracket round is complete — build the next one
            const winners = s.bracket.map((x) => x.winnerId!).filter(Boolean);
            if (winners.length <= 1) {
              s.winnerId = winners[0] ?? s.bracket[0].p1Id;
              s.phase = "gameover";
              return s;
            }
            s.bracket = buildBracketRound(winners);
            s.matchIndex = 0;
          }
          // skip auto-won byes to reach the next live match
          while (s.matchIndex < s.bracket.length) {
            const nm = s.bracket[s.matchIndex];
            if (!nm.p2Id) {
              nm.winnerId = nm.p1Id;
              nm.scores[nm.p1Id] = target;
              s.matchIndex += 1;
              continue;
            }
            if (nm.winnerId) {
              s.matchIndex += 1;
              continue;
            }
            break;
          }
          if (s.matchIndex >= s.bracket.length) {
            return gameReducer(s, { type: "NEXT_TURN" });
          }
          s.turnIndex = 0;
          s.turnPlayerId = s.bracket[s.matchIndex].p1Id;
          resetTurnFields(s);
          s.phase = "category";
          return s;
        }
        // match continues — alternate
        s.turnIndex = s.turnIndex === 0 ? 1 : 0;
        const order = activeOrder(s);
        s.turnPlayerId = order[s.turnIndex] ?? s.turnPlayerId;
        resetTurnFields(s);
        s.phase = "category";
        return s;
      }

      // --- Standard modes ---
      const order = activeOrder(s);
      let idx = s.turnIndex;
      let rounds = s.roundIndex;
      let advanced = false;
      for (let i = 0; i <= order.length; i++) {
        idx = (s.turnIndex + 1 + i) % Math.max(1, order.length);
        if (i === order.length) break;
        if (!s.players[order[idx]]?.eliminated) {
          advanced = true;
          break;
        }
      }
      if (idx === 0 && advanced) rounds += 1;
      s.turnIndex = idx;
      s.roundIndex = rounds;

      // elimination logic
      if (s.config.mode === "knockout" && advanced) {
        const alive = order.filter((id) => !s.players[id].eliminated);
        if (alive.length > 1) {
          const sorted = [...alive].sort((a, b) => {
            const pa = s.players[a];
            const pb = s.players[b];
            if (pa.score !== pb.score) return pa.score - pb.score;
            if (pa.correct !== pb.correct) return pa.correct - pb.correct;
            return Math.random() - 0.5;
          });
          const out = sorted[0];
          s.players[out].eliminated = true;
          s.eliminations = [...s.eliminations, out];
          pushLog(s, out, 0, `Eliminated — lowest score`);
        }
      }

      const remaining = activeOrder(s);
      // game over checks
      if (s.config.mode === "sudden" && remaining.length <= 1) {
        s.winnerId = remaining[0] ?? s.turnPlayerId;
        s.phase = "gameover";
        return s;
      }
      if (s.config.mode === "knockout" && remaining.length <= 1) {
        s.winnerId = remaining[0] ?? s.turnPlayerId;
        s.phase = "gameover";
        return s;
      }
      const capped = ["classic", "timeattack", "league", "randommix", "party"].includes(s.config.mode);
      if (capped && s.config.rounds > 0 && s.roundIndex >= s.config.rounds) {
        s.phase = "gameover";
        return s;
      }

      s.turnPlayerId = order[s.turnIndex] ?? s.turnPlayerId;
      resetTurnFields(s);
      s.phase = "category";
      return s;
    }

    case "END_GAME": {
      s.phase = "gameover";
      const standings = scoreboardStandings(s);
      s.winnerId = standings[0] ?? null;
      return s;
    }

    case "RESET_GAME":
      return initialState();

    default:
      return s;
  }
}

export function currentStealer(s: GameState): Player | null {
  if (!s.stealerIds.length) return null;
  const id = s.stealerIds[s.stealerIds.length - 1];
  return s.players[id] ?? null;
}

export function winnersOf(s: GameState): string[] {
  const max = Math.max(...Object.values(s.players).map((p) => p.score));
  return Object.values(s.players)
    .filter((p) => p.score === max && max > 0)
    .map((p) => p.id);
}
