import type { CareerMap, CareerStats, DailyState, LogEntry, Player } from "../types";
import { ACHIEVEMENTS, type AchievementCtx } from "../data/achievements";

const CAREER_KEY = "fia-career-v1";
const DAILY_KEY = "fia-daily-v1";
const WEEKLY_KEY = "fia-weekly-v1";

export function emptyStats(): CareerStats {
  return {
    games: 0,
    wins: 0,
    points: 0,
    correct: 0,
    steals: 0,
    longestStreak: 0,
    hardSolved: 0,
    categories: {},
    achievements: [],
  };
}

export function loadCareer(): CareerMap {
  try {
    return JSON.parse(localStorage.getItem(CAREER_KEY) || "{}") as CareerMap;
  } catch {
    return {};
  }
}

export function saveCareer(map: CareerMap) {
  try {
    localStorage.setItem(CAREER_KEY, JSON.stringify(map));
  } catch {
    /* storage full / private mode */
  }
}

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function weekStr(): string {
  const now = new Date();
  const oneJan = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${week}`;
}

interface WeeklyEntry {
  name: string;
  points: number;
  week: string;
}

export function loadWeekly(): WeeklyEntry[] {
  try {
    const all = JSON.parse(localStorage.getItem(WEEKLY_KEY) || "[]") as WeeklyEntry[];
    const cur = weekStr();
    return all.filter((e) => e.week === cur);
  } catch {
    return [];
  }
}

export function addWeeklyPoints(name: string, points: number) {
  try {
    const all = JSON.parse(localStorage.getItem(WEEKLY_KEY) || "[]") as WeeklyEntry[];
    all.push({ name, points, week: weekStr() });
    localStorage.setItem(WEEKLY_KEY, JSON.stringify(all.slice(-2000)));
  } catch {
    /* noop */
  }
}

// --- Daily challenge --------------------------------------------------------

export function loadDaily(): DailyState | null {
  try {
    return JSON.parse(localStorage.getItem(DAILY_KEY) || "null") as DailyState | null;
  } catch {
    return null;
  }
}

export function saveDaily(d: DailyState) {
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(d));
  } catch {
    /* noop */
  }
}

// --- Game finalisation ------------------------------------------------------

export interface GameResult {
  players: Player[];
  mode: string;
  difficulty: string;
  sudden: boolean;
  winnerName: string;
  winnerId: string;
  maxScore: number;
  minScore: number;
  log: LogEntry[];
}

export function finalizeGame(
  players: Player[],
  result: GameResult,
  before: CareerMap
): { career: CareerMap; unlocked: string[] } {
  const career: CareerMap = { ...before };
  for (const p of players) {
    const key = p.name.trim().toLowerCase();
    if (!key) continue;
    const s: CareerStats = career[key] ? { ...career[key], categories: { ...career[key].categories } } : emptyStats();
    const isWinner = p.name === result.winnerName;
    s.games += 1;
    if (isWinner) s.wins += 1;
    s.points += p.score;
    s.correct += p.correct;
    s.steals += p.steals;
    s.longestStreak = Math.max(s.longestStreak, p.longestStreak);
    for (const c of p.categoriesCorrect) {
      s.categories[c] = (s.categories[c] ?? 0) + 1;
    }
    if (result.difficulty === "legendary") s.hardSolved += p.correct;
    career[key] = s;
    if (isWinner) addWeeklyPoints(p.name, p.score);
  }
  saveCareer(career);

  // Comeback detection: was the winner ever trailing the leader at any point?
  // Log entries are keyed by player id, so compare against the winner id.
  const running: Record<string, number> = {};
  let wasBehind = false;
  for (const e of result.log) {
    running[e.playerId] = (running[e.playerId] ?? 0) + e.delta;
    const max = Math.max(...Object.values(running), 0);
    if ((running[result.winnerId] ?? 0) < max) wasBehind = true;
  }
  const winner = players.find((p) => p.name === result.winnerName);
  const ctx: AchievementCtx = {
    winner: result.winnerName,
    maxScore: result.maxScore,
    minScore: result.minScore,
    wasBehind,
    accuracy: winner && winner.attempts > 0 ? winner.correct / winner.attempts : 0,
    steals: players.reduce((s, p) => s + p.steals, 0),
    categoriesHit: winner?.categoriesCorrect.length ?? 0,
    difficulty: result.difficulty,
    suddenDeath: result.sudden,
    games: career[result.winnerName.toLowerCase()]?.games ?? 1,
    wins: career[result.winnerName.toLowerCase()]?.wins ?? 1,
    points: career[result.winnerName.toLowerCase()]?.points ?? 0,
  };
  const winnerStats = career[result.winnerName.toLowerCase()];
  const unlocked = ACHIEVEMENTS.filter((a) => {
    if (winnerStats?.achievements.includes(a.id)) return false;
    return a.check(ctx);
  }).map((a) => a.id);
  if (winnerStats && unlocked.length) {
    winnerStats.achievements = [...new Set([...winnerStats.achievements, ...unlocked])];
    career[result.winnerName.toLowerCase()] = winnerStats;
    saveCareer(career);
  }
  return { career, unlocked };
}
