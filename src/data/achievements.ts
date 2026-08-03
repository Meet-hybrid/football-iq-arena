export interface Achievement {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  check: (ctx: AchievementCtx) => boolean;
}

export interface AchievementCtx {
  winner: string;
  maxScore: number;
  minScore: number;
  wasBehind: boolean; // winner trailed by >= 4 points at some point
  accuracy: number; // 0..1 winner accuracy
  steals: number; // total steals in game
  categoriesHit: number; // distinct categories answered correctly
  difficulty: string;
  suddenDeath: boolean;
  games: number; // career games
  wins: number; // career wins
  points: number; // career points
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-blood",
    name: "First Blood",
    emoji: "🩸",
    blurb: "Answer your first question correctly",
    check: () => true,
  },
  {
    id: "steal-artist",
    name: "Steal Artist",
    emoji: "🕶️",
    blurb: "Pull off 3 steals in one game",
    check: (c) => c.steals >= 3,
  },
  {
    id: "comeback-king",
    name: "Comeback King",
    emoji: "👑",
    blurb: "Win after trailing by 4+ points",
    check: (c) => c.wasBehind,
  },
  {
    id: "flawless",
    name: "Flawless",
    emoji: "💎",
    blurb: "Win with 100% accuracy (min 3 correct)",
    check: (c) => c.accuracy === 1 && c.maxScore >= 6,
  },
  {
    id: "legendary",
    name: "Legendary",
    emoji: "🔴",
    blurb: "Win on Legendary difficulty",
    check: (c) => c.difficulty === "legendary",
  },
  {
    id: "hat-trick",
    name: "Hat-Trick Hero",
    emoji: "🧢",
    blurb: "Win 3 career games",
    check: (c) => c.wins >= 3,
  },
  {
    id: "centurion",
    name: "Centurion",
    emoji: "💯",
    blurb: "Score 100+ career points",
    check: (c) => c.points >= 100,
  },
  {
    id: "headmaster",
    name: "Headmaster",
    emoji: "🎓",
    blurb: "Get answers right in 6 different categories in one game",
    check: (c) => c.categoriesHit >= 6,
  },
  {
    id: "survivor",
    name: "The Survivor",
    emoji: "🛡️",
    blurb: "Win a Sudden Death game",
    check: (c) => c.suddenDeath,
  },
];
