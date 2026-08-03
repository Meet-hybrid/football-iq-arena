// ---------------------------------------------------------------------------
// The AI Host — a simulated football TV presenter. Swap these canned lines for
// real OpenAI generations later by implementing the same HostLine interface.
// ---------------------------------------------------------------------------

export const HOST_NAME = "Big Match Tunde";

export type HostKey =
  | "welcome"
  | "turn"
  | "categoryPick"
  | "numberPick"
  | "correct"
  | "wrong"
  | "stealOffer"
  | "stealSuccess"
  | "stealFail"
  | "timeout"
  | "hint"
  | "explain"
  | "lead"
  | "champion"
  | "elimination"
  | "timedStart"
  | "timedAccept"
  | "timedEnd"
  | "aiGood"
  | "aiBad"
  | "dailyIntro"
  | "tie";

export interface HostCtx {
  name?: string;
  points?: number | string;
  category?: string;
  number?: number | string;
  hint?: string;
  explanation?: string;
  opponents?: string;
  count?: number;
  seconds?: number | string;
  difficulty?: string;
}

const LINES: Record<HostKey, string[]> = {
  welcome: [
    "Welcome, welcome, WELCOME to the Football IQ Arena! I'm your host, Big Match Tunde, and tonight {count} football brains are ready for battle. LET'S GO!",
    "A big football night is here! {count} players, one arena, endless ball knowledge. Welcome to the Football IQ Arena!",
  ],
  turn: [
    "It's {name}'s turn! Pick a category, {name} — make it count!",
    "Over to you, {name}! Choose your battlefield!",
  ],
  categoryPick: [
    "{category}?? Ooh, {name}, you're a brave one! Let's see what's in store.",
    "{category}! Excellent choice, {name}. The wheel has spoken!",
    "I like it! {category} — a category for true football lovers.",
  ],
  numberPick: [
    "Question number {number}... drum roll please!",
    "Number {number}! Let's see what fate has served up!",
    "{number}! Good luck with that one, {name}!",
  ],
  correct: [
    "FANTASTIC answer, {name}! Absolutely brilliant football knowledge! +{points} points!",
    "YESSS! {name} with a screamer of an answer! +{points} points!",
    "Take a bow, {name}! That's a world-class answer! +{points} points!",
  ],
  wrong: [
    "Oof. That's incorrect, {name}. I'm afraid that's a big no from me.",
    "Sorry, {name}, but that's off target — wide of the post!",
    "Not quite, {name}! The keeper's saved that one.",
  ],
  stealOffer: [
    "WAIT! {name} missed it! Anybody fancy a steal? {opponents} — come on now!",
    "It's up for grabs! Who wants to steal this one? {opponents}!",
  ],
  stealSuccess: [
    "WHAT A STEAL! {name} has nicked it! +{points} points out of nowhere!",
    "Thief in the night! {name} steals the points! +{points}!!",
  ],
  stealFail: [
    "Ohhh, so close! No points for the steal. The question dies with dignity.",
    "Unlucky! The steal is off target. On we go!",
  ],
  timeout: [
    "TIME'S UP! The clock beats you this time, {name}.",
    "That's the final whistle on this one — no time left, {name}!",
  ],
  hint: [
    "Here's a little help, {name}: {hint}",
    "I'll give you a nudge... {hint}",
  ],
  explain: [
    "Let's break it down — {explanation}",
    "Did you know? {explanation}",
  ],
  lead: [
    "And we have a NEW leader — {name} is on top of the table!",
    "{name} has taken the lead! The crowd is loving this!",
  ],
  champion: [
    "{name} IS YOUR FOOTBALL IQ ARENA CHAMPION! Give it up — what a performance!",
    "The winner! {name}! Absolute scenes in the arena!",
  ],
  elimination: [
    "{name} is OUT! Sorry, mate — thanks for playing!",
    "Eliminated! {name} has to leave the arena. Respect, though!",
  ],
  timedStart: [
    "You've got {seconds} seconds, {name}! Name as many as you can — GO GO GO!",
    "The clock is ticking, {name}! {seconds} seconds on the board — GO!",
  ],
  timedAccept: [
    "{name} on the board — that's {count} so far!",
    "Counted! {name} is flying — {count} names!",
  ],
  timedEnd: [
    "TIME! Final count for {name}: {count} names. That's {points} points!",
    "That's the whistle! {name} managed {count} — what a haul!",
  ],
  aiGood: [
    "My AI sensors say... CORRECT! {name} is cooking!",
    "The AI agrees — that's a fantastic answer, {name}!",
  ],
  aiBad: [
    "The AI says no on that one, {name}. The evidence is against you!",
    "Hmm, my AI brain doesn't recognise that one. Nice try, {name}!",
  ],
  dailyIntro: [
    "Welcome to the Daily Challenge! One question, one chance. Let's see what today holds!",
    "The Daily Challenge is here! Answer today's question — no pressure!",
  ],
  tie: [
    "It's ALL TIED UP! What a contest — the arena can barely breathe!",
    "Level at the top! This is going to the wire!",
  ],
};

const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

export function hostLine(key: HostKey, ctx: HostCtx = {}): string {
  const tpl = pick(LINES[key]);
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) => String(ctx[k as keyof HostCtx] ?? ""));
}

/** Full spoken version of a question prompt (plus its options for This-or-That). */
export function questionScript(q: { prompt: string; sub?: string }): string {
  return q.sub ? `${q.prompt} ${q.sub}` : q.prompt;
}
