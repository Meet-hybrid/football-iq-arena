// Core domain types for Football IQ Arena

export type GameModeId =
  | "solo"
  | "classic"
  | "sudden"
  | "timeattack"
  | "tournament"
  | "knockout"
  | "league"
  | "randommix"
  | "party";

export type Difficulty = "easy" | "medium" | "hard" | "legendary";

export type CategoryId =
  | "clubs"
  | "transfers"
  | "ballondor"
  | "worldcup"
  | "championsleague"
  | "premierleague"
  | "nationalteams"
  | "managers"
  | "guesstheplayer"
  | "guesstheclub"
  | "guessthestadium"
  | "careerpath"
  | "jerseynumbers"
  | "records"
  | "truefalse"
  | "thisorthat"
  | "timed";

export type QuestionType = "list" | "single" | "truefalse" | "thisorthat" | "timed";

export interface Question {
  id: string;
  category: CategoryId;
  difficulty: Difficulty;
  type: QuestionType;
  prompt: string;
  /** Secondary line — e.g. the two options for "This or That" */
  sub?: string;
  /** Canonical accepted answers (normalized matching is done in verify.ts) */
  answer: string[];
  /** Extra accepted spellings / aliases */
  aliases?: string[];
  /** Post-answer explanation / fun fact */
  explanation: string;
  hint?: string;
  /** Seconds for timed challenges (overrides difficulty timer) */
  timeLimit?: number;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  teamId?: string;
  /** team pseudo-player members */
  members?: string[];
  isTeam?: boolean;
  score: number;
  streak: number;
  longestStreak: number;
  correct: number;
  steals: number;
  attempts: number;
  categoriesCorrect: CategoryId[];
  eliminated: boolean;
}

export interface HouseRules {
  questionValue: number;
  stealValue: number;
  stealEnabled: boolean;
  maxSteals: number;
  /** 0 = use difficulty default */
  timerSeconds: number;
  timedPointValue: number;
  tournamentTarget: number;
}

export interface GameConfig {
  mode: GameModeId;
  difficulty: Difficulty;
  rounds: number;
  rules: HouseRules;
  /** ids in turn order (players or teams) */
  order: string[];
}

export interface ReviewEntry {
  questionId: string;
  category: CategoryId;
  prompt: string;
  sub?: string;
  playerAnswer: string;
  correctAnswers: string[];
  correct: boolean;
}

export type Phase =
  | "home"
  | "setup"
  | "category"
  | "number"
  | "question"
  | "scoreboard"
  | "gameover"
  | "stats"
  | "daily";

export type QStatus = "ask" | "steal" | "steal-ask" | "resolved";

export interface LogEntry {
  id: number;
  playerId: string;
  delta: number;
  text: string;
}

export interface BracketMatch {
  id: string;
  p1Id: string;
  /** null = bye / walkover */
  p2Id: string | null;
  scores: Record<string, number>;
  turnCount: number;
  winnerId?: string;
  label: string;
}

export type LastOutcome = "none" | "correct" | "wrong" | "steal" | "timeout" | "timed" | "eliminated";

export interface GameState {
  phase: Phase;
  config: GameConfig;
  players: Record<string, Player>;
  pools: Record<CategoryId, Question[]>;
  used: Record<CategoryId, number[]>;
  category: CategoryId | null;
  number: number | null;
  question: Question | null;
  /** completed full cycles of turn order */
  roundIndex: number;
  turnIndex: number;
  turnPlayerId: string;
  status: QStatus;
  stealerIds: string[];
  stealAttempts: number;
  hintUsed: boolean;
  delta: Record<string, number>;
  log: LogEntry[];
  review: ReviewEntry[];
  timedBank: string[];
  timedCorrectCount: number;
  bracket: BracketMatch[] | null;
  matchIndex: number;
  winnerId: string | null;
  eliminations: string[];
  logCounter: number;
  gameStartedAt: number;
  lastOutcome: LastOutcome;
  gameEnding: boolean;
}

export type Action =
  | { type: "START_GAME"; config: GameConfig; players: Player[]; pools: Record<CategoryId, Question[]> }
  | { type: "PICK_CATEGORY"; id: CategoryId }
  | { type: "PICK_NUMBER"; n: number }
  | { type: "RANDOM_NUMBER" }
  | { type: "MARK_ANSWER"; correct: boolean; answer?: string }
  | { type: "TIMEOUT" }
  | { type: "MARK_TIMED_ACCEPT"; name: string; canonical?: string }
  | { type: "TIMED_END" }
  | { type: "ADD_AI_QUESTION"; category: CategoryId; question: Question }
  | { type: "CHOOSE_STEALER"; id: string | null }
  | { type: "MARK_STEAL"; correct: boolean; answer?: string }
  | { type: "NEXT_TURN" }
  | { type: "END_GAME" }
  | { type: "RESET_GAME" };

export interface CareerStats {
  games: number;
  wins: number;
  points: number;
  correct: number;
  steals: number;
  longestStreak: number;
  hardSolved: number;
  categories: Partial<Record<CategoryId, number>>;
  achievements: string[];
}

export type CareerMap = Record<string, CareerStats>;

export interface DailyState {
  date: string;
  best: number;
  streak: number;
  solved: boolean;
}
