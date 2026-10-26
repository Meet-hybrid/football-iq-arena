import type { CategoryId, Difficulty } from "../types";

export interface CategoryMeta {
  id: CategoryId;
  name: string;
  emoji: string;
  blurb: string;
  /** tailwind-ish gradient classes for the wheel & chips */
  gradient: string;
  ring: string;
  /** hex for the SVG wheel */
  hex: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { id: "clubs", name: "Clubs", emoji: "⚽", blurb: "Club legends, nicknames & badge trivia", gradient: "from-emerald-500 to-teal-600", ring: "ring-emerald-400", hex: "#059669" },
  { id: "transfers", name: "Transfers", emoji: "🔁", blurb: "Big-money moves & famous switches", gradient: "from-sky-500 to-blue-600", ring: "ring-sky-400", hex: "#0284c7" },
  { id: "ballondor", name: "Ballon d'Or", emoji: "🏆", blurb: "The golden era of football's top prize", gradient: "from-amber-400 to-yellow-600", ring: "ring-amber-400", hex: "#d97706" },
  { id: "worldcup", name: "World Cup", emoji: "🌍", blurb: "Glory, hosts, heroes & history", gradient: "from-violet-500 to-purple-700", ring: "ring-violet-400", hex: "#7c3aed" },
  { id: "championsleague", name: "Champions League", emoji: "⭐", blurb: "European nights & continental kings", gradient: "from-indigo-500 to-blue-700", ring: "ring-indigo-400", hex: "#4f46e5" },
  { id: "premierleague", name: "Premier League", emoji: "🦁", blurb: "The world's most-watched league", gradient: "from-fuchsia-500 to-pink-600", ring: "ring-fuchsia-400", hex: "#c026d3" },
  { id: "nationalteams", name: "National Teams", emoji: "🏳️", blurb: "International heroes & world beaters", gradient: "from-cyan-500 to-teal-600", ring: "ring-cyan-400", hex: "#0891b2" },
  { id: "managers", name: "Managers", emoji: "🧠", blurb: "The masterminds in the dugout", gradient: "from-orange-500 to-red-500", ring: "ring-orange-400", hex: "#ea580c" },
  { id: "guesstheplayer", name: "Guess the Player", emoji: "🕵️", blurb: "Clues to the superstar", gradient: "from-lime-500 to-green-600", ring: "ring-lime-400", hex: "#65a30d" },
  { id: "guesstheclub", name: "Guess the Club", emoji: "🎯", blurb: "Can you name the badge?", gradient: "from-rose-500 to-red-600", ring: "ring-rose-400", hex: "#e11d48" },
  { id: "guessthestadium", name: "Guess the Stadium", emoji: "🏟️", blurb: "The cathedrals of football", gradient: "from-slate-500 to-slate-700", ring: "ring-slate-400", hex: "#475569" },
  { id: "careerpath", name: "Career Path", emoji: "🛤️", blurb: "Follow the journey, name the star", gradient: "from-amber-500 to-orange-600", ring: "ring-amber-400", hex: "#f59e0b" },
  { id: "jerseynumbers", name: "Jersey Numbers", emoji: "🔢", blurb: "Famous numbers on famous backs", gradient: "from-purple-500 to-fuchsia-600", ring: "ring-purple-400", hex: "#a21caf" },
  { id: "records", name: "Records", emoji: "📊", blurb: "The books & the breakers", gradient: "from-teal-500 to-cyan-600", ring: "ring-teal-400", hex: "#0d9488" },
  { id: "truefalse", name: "True or False", emoji: "✅", blurb: "Fact or fiction — fast decisions", gradient: "from-green-500 to-emerald-700", ring: "ring-green-400", hex: "#16a34a" },
  { id: "thisorthat", name: "This or That", emoji: "⚔️", blurb: "Head-to-head football battles", gradient: "from-red-500 to-rose-700", ring: "ring-red-400", hex: "#dc2626" },
  { id: "timed", name: "Timed Challenges", emoji: "⏱️", blurb: "How much can you name under pressure?", gradient: "from-yellow-400 to-amber-600", ring: "ring-yellow-400", hex: "#eab308" },
];

export const CATEGORY_MAP: Record<CategoryId, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
) as Record<CategoryId, CategoryMeta>;

export const DIFFICULTIES: { id: Difficulty; name: string; emoji: string; blurb: string; timer: number }[] = [
  { id: "easy", name: "Easy", emoji: "🟢", blurb: "Warm-up territory", timer: 45 },
  { id: "medium", name: "Medium", emoji: "🟡", blurb: "The bread & butter", timer: 30 },
  { id: "hard", name: "Hard", emoji: "🟠", blurb: "For the connoisseurs", timer: 20 },
  { id: "legendary", name: "Legendary", emoji: "🔴", blurb: "Ball-knowledge royalty", timer: 15 },
];

export const DIFFICULTY_MAP: Record<Difficulty, (typeof DIFFICULTIES)[number]> = Object.fromEntries(
  DIFFICULTIES.map((d) => [d.id, d])
) as Record<Difficulty, (typeof DIFFICULTIES)[number]>;

export const MODES: {
  id: import("../types").GameModeId;
  name: string;
  emoji: string;
  blurb: string;
  roundsDefault: number;
}[] = [
  { id: "solo", name: "Solo Knowledge", emoji: "🧠", blurb: "Play alone and review every answer", roundsDefault: 20 },
  { id: "classic", name: "Classic", emoji: "🎯", blurb: "Fixed rounds, highest score wins", roundsDefault: 3 },
  { id: "sudden", name: "Sudden Death", emoji: "💀", blurb: "One wrong answer and you're out", roundsDefault: 0 },
  { id: "timeattack", name: "Time Attack", emoji: "⏱️", blurb: "Beat the clock on every question", roundsDefault: 3 },
  { id: "tournament", name: "Tournament", emoji: "🏆", blurb: "1v1 knockout brackets, first to 6", roundsDefault: 0 },
  { id: "knockout", name: "Knockout", emoji: "🥊", blurb: "Lowest scorer each round is eliminated", roundsDefault: 4 },
  { id: "league", name: "League Table", emoji: "📊", blurb: "Round-robin, full standings", roundsDefault: 4 },
  { id: "randommix", name: "Random Mix", emoji: "🎲", blurb: "The wheel decides every category", roundsDefault: 3 },
  { id: "party", name: "Party Mode", emoji: "🎉", blurb: "No pressure, play until you're done", roundsDefault: 6 },
];
