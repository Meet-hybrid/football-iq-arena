import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Btn, Glass, Avatar, AVATAR_EMOJIS } from "../components/ui";
import { DIFFICULTIES, MODES } from "../data/categories";
import { DEFAULT_RULES, createPlayer } from "../game/engine";
import type { Difficulty, GameConfig, GameModeId, HouseRules, Player } from "../types";
import { play } from "../audio/sound";

const MAX_PLAYERS = 10;
const MIN_PLAYERS = 2;

export function SetupScreen({
  onStart,
  onBack,
}: {
  onStart: (config: GameConfig, players: Player[]) => void;
  onBack: () => void;
}) {
  const [teamMode, setTeamMode] = useState(false);
  const [teamCount, setTeamCount] = useState(2);
  const [players, setPlayers] = useState<{ name: string; avatar: string; team: number }[]>([
    { name: "", avatar: AVATAR_EMOJIS[0], team: 0 },
    { name: "", avatar: AVATAR_EMOJIS[1], team: 1 },
  ]);
  const [mode, setMode] = useState<GameModeId>("classic");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [rounds, setRounds] = useState(3);
  const [rules, setRules] = useState<HouseRules>({ ...DEFAULT_RULES });
  const [showRules, setShowRules] = useState(false);

  const modeMeta = MODES.find((m) => m.id === mode)!;
  const cappedModes = ["classic", "timeattack", "league", "randommix", "party"].includes(mode);
  const knockoutish = mode === "knockout" || mode === "league";
  const roundsShown = mode === "tournament" ? false : cappedModes || knockoutish ? true : false;

  const setPlayer = (i: number, patch: Partial<{ name: string; avatar: string; team: number }>) =>
    setPlayers((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const addPlayer = () => {
    if (players.length >= MAX_PLAYERS) return;
    const idx = players.length;
    setPlayers((ps) => [
      ...ps,
      { name: "", avatar: AVATAR_EMOJIS[idx % AVATAR_EMOJIS.length], team: teamMode ? idx % teamCount : 0 },
    ]);
  };

  const validPlayers = useMemo(() => players.filter((p) => p.name.trim().length > 0), [players]);
  const teamValid = useMemo(() => {
    if (!teamMode) return true;
    for (let t = 0; t < teamCount; t++) if (!players.some((p) => p.team === t && p.name.trim())) return false;
    return true;
  }, [teamMode, teamCount, players]);

  const canStart =
    (teamMode ? teamCount >= 2 : validPlayers.length >= MIN_PLAYERS && validPlayers.length <= MAX_PLAYERS) &&
    teamValid;

  function start() {
    if (!canStart) return;
    let configPlayers: Player[];
    let order: string[];
    if (teamMode) {
      const individuals = players
        .filter((p) => p.name.trim())
        .map((p, i) => createPlayer(`p${i}`, p.name.trim(), p.avatar, { teamId: `team${p.team}` }));
      const teamPlayers: Player[] = Array.from({ length: teamCount }, (_, t) => {
        const members = individuals.filter((p) => p.teamId === `team${t}`);
        return createPlayer(`team${t}`, `Team ${t + 1}`, ["🟢", "🔵", "🟠", "🟣"][t], {
          members: members.map((m) => m.id),
          isTeam: true,
        });
      });
      configPlayers = [...teamPlayers, ...individuals];
      order = teamPlayers.map((t) => t.id);
    } else {
      configPlayers = validPlayers.map((p, i) => createPlayer(`p${i}`, p.name.trim(), p.avatar));
      order = configPlayers.map((p) => p.id);
    }
    const config: GameConfig = {
      mode,
      difficulty,
      rounds,
      rules,
      order,
    };
    onStart(config, configPlayers);
  }

  return (
    <div className="pitch-bg min-h-full px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <Btn variant="ghost" size="sm" onClick={() => { play("pop"); onBack(); }}>
            ← Back
          </Btn>
          <h1 className="font-display text-xl text-white sm:text-2xl">Game Setup</h1>
          <div className="w-16" />
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            {/* Players */}
            <Glass className="p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-sm uppercase tracking-widest text-gold-300">1 · Players</h2>
                <div className="flex rounded-xl bg-white/5 p-1">
                  {(["solo", "team"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        play("pop");
                        setTeamMode(t === "team");
                      }}
                      className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
                        (t === "team") === teamMode ? "bg-gold-500 text-pitch-950" : "text-white/70"
                      }`}
                    >
                      {t === "solo" ? "Individual" : "Team Mode"}
                    </button>
                  ))}
                </div>
              </div>

              {teamMode && (
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-sm text-white/70">Teams:</span>
                  {[2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => { play("pop"); setTeamCount(n); }}
                      className={`rounded-lg px-3 py-1 text-sm font-bold ${
                        teamCount === n ? "bg-gold-500 text-pitch-950" : "bg-white/8 text-white/70"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-2.5">
                <AnimatePresence initial={false}>
                  {players.map((p, i) => (
                    <motion.div
                      key={i}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center gap-2.5 rounded-xl bg-white/5 p-2"
                    >
                      <span className="w-5 text-center text-xs text-white/40">{i + 1}</span>
                      <div className="relative">
                        <Avatar emoji={p.avatar} size={40} ring={i} />
                        <button
                          onClick={() =>
                            setPlayer(i, {
                              avatar: AVATAR_EMOJIS[(AVATAR_EMOJIS.indexOf(p.avatar) + 1) % AVATAR_EMOJIS.length],
                            })
                          }
                          className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px] hover:bg-white/35"
                          title="Change avatar"
                        >
                          🔄
                        </button>
                      </div>
                      <input
                        value={p.name}
                        onChange={(e) => setPlayer(i, { name: e.target.value })}
                        placeholder={`Player ${i + 1}`}
                        maxLength={14}
                        className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1.5 text-sm text-white outline-none placeholder:text-white/30 focus:bg-white/5"
                      />
                      {teamMode && (
                        <div className="flex gap-1">
                          {Array.from({ length: teamCount }, (_, t) => (
                            <button
                              key={t}
                              onClick={() => setPlayer(i, { team: t })}
                              className={`h-6 w-6 rounded-full text-xs ${p.team === t ? "ring-2 ring-gold-400" : "opacity-40"}`}
                              style={{ background: ["#34d399", "#38bdf8", "#fb923c", "#c084fc"][t] }}
                            >
                              {p.team === t ? "✓" : ""}
                            </button>
                          ))}
                        </div>
                      )}
                      {players.length > MIN_PLAYERS && (
                        <button
                          onClick={() => setPlayers((ps) => ps.filter((_, j) => j !== i))}
                          className="px-2 text-white/40 hover:text-red-400"
                        >
                          ✕
                        </button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {players.length < MAX_PLAYERS && (
                <button
                  onClick={addPlayer}
                  className="mt-3 w-full rounded-xl border border-dashed border-white/20 py-2.5 text-sm text-white/60 hover:border-gold-400/50 hover:text-gold-300"
                >
                  + Add player ({players.length}/{MAX_PLAYERS})
                </button>
              )}
              {!canStart && (
                <p className="mt-2 text-xs text-flame-500">
                  {teamMode
                    ? "Give every team at least one named player."
                    : `Name at least ${MIN_PLAYERS} players to start.`}
                </p>
              )}
            </Glass>

            {/* Game mode */}
            <Glass className="p-5">
              <h2 className="mb-3 font-display text-sm uppercase tracking-widest text-gold-300">2 · Game Mode</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { play("pop"); setMode(m.id); }}
                    className={`rounded-xl border p-3 text-left transition ${
                      mode === m.id
                        ? "border-gold-400 bg-gold-400/15"
                        : "border-white/10 bg-white/5 hover:border-white/25"
                    }`}
                  >
                    <div className="text-2xl">{m.emoji}</div>
                    <div className="mt-1 text-sm font-bold">{m.name}</div>
                    <div className="mt-0.5 text-[11px] leading-tight text-white/50">{m.blurb}</div>
                  </button>
                ))}
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-2 text-xs uppercase tracking-widest text-white/50">Difficulty</div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {DIFFICULTIES.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => { play("pop"); setDifficulty(d.id); }}
                        className={`rounded-lg px-1 py-2 text-center transition ${
                          difficulty === d.id ? "bg-gold-500 text-pitch-950" : "bg-white/5 text-white/70"
                        }`}
                      >
                        <div className="text-base">{d.emoji}</div>
                        <div className="text-[10px] font-bold">{d.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
                {roundsShown && (
                  <div>
                    <div className="mb-2 text-xs uppercase tracking-widest text-white/50">
                      {mode === "knockout" || mode === "league" ? "Rounds (before eliminations/table)" : "Rounds per player"}
                    </div>
                    <div className="flex items-center gap-3">
                      <Btn size="sm" variant="ghost" onClick={() => setRounds((r) => Math.max(1, r - 1))}>−</Btn>
                      <span className="font-score w-10 text-center text-4xl text-gold-300">{rounds}</span>
                      <Btn size="sm" variant="ghost" onClick={() => setRounds((r) => Math.min(10, r + 1))}>+</Btn>
                    </div>
                  </div>
                )}
              </div>
            </Glass>
          </div>

          {/* House rules + start */}
          <div className="space-y-6 lg:col-span-2">
            <Glass className="p-5">
              <button
                onClick={() => { play("pop"); setShowRules(!showRules); }}
                className="flex w-full items-center justify-between"
              >
                <h2 className="font-display text-sm uppercase tracking-widest text-gold-300">House Rules</h2>
                <span className="text-white/50">{showRules ? "▲" : "▼"}</span>
              </button>
              <AnimatePresence>
                {showRules && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 space-y-3 text-sm">
                      {(
                        [
                          ["questionValue", "Points per correct answer", 1, 5],
                          ["stealValue", "Points per steal", 0, 3],
                          ["timedPointValue", "Points per timed name", 0, 3],
                          ["tournamentTarget", "Tournament target score", 2, 12],
                        ] as const
                      ).map(([key, label, min, max]) => (
                        <div key={key}>
                          <div className="mb-1 flex justify-between text-white/70">
                            <span>{label}</span>
                            <span className="font-bold text-gold-300">{rules[key]}</span>
                          </div>
                          <input
                            type="range"
                            min={min}
                            max={max}
                            value={rules[key]}
                            onChange={(e) => setRules({ ...rules, [key]: Number(e.target.value) })}
                            className="w-full accent-gold-500"
                          />
                        </div>
                      ))}
                      <label className="flex items-center justify-between text-white/70">
                        <span>Allow steals</span>
                        <input
                          type="checkbox"
                          checked={rules.stealEnabled}
                          onChange={(e) => setRules({ ...rules, stealEnabled: e.target.checked })}
                          className="h-5 w-5 accent-gold-500"
                        />
                      </label>
                      <div>
                        <div className="mb-1 text-white/70">Steal attempts per question: {rules.maxSteals}</div>
                        <input
                          type="range"
                          min={1}
                          max={3}
                          value={rules.maxSteals}
                          onChange={(e) => setRules({ ...rules, maxSteals: Number(e.target.value) })}
                          className="w-full accent-gold-500"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Glass>

            <Glass className="p-5">
              <h2 className="mb-3 font-display text-sm uppercase tracking-widest text-gold-300">Tonight's match-up</h2>
              <div className="space-y-2 text-sm text-white/75">
                <div className="flex justify-between">
                  <span>Mode</span>
                  <span className="font-bold text-gold-300">{modeMeta.emoji} {modeMeta.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Difficulty</span>
                  <span className="font-bold">{DIFFICULTIES.find((d) => d.id === difficulty)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>{teamMode ? "Teams" : "Players"}</span>
                  <span className="font-bold">{teamMode ? teamCount : validPlayers.length || players.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Question value</span>
                  <span className="font-bold text-gold-300">+{rules.questionValue} pts</span>
                </div>
                <div className="flex justify-between">
                  <span>Steal value</span>
                  <span className="font-bold text-gold-300">+{rules.stealValue} pt</span>
                </div>
              </div>
              <Btn className="mt-4 w-full" size="lg" disabled={!canStart} onClick={start}>
                🏟️ Kick Off!
              </Btn>
            </Glass>
          </div>
        </div>
      </div>
    </div>
  );
}
