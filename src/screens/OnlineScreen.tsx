import { useEffect, useRef, useState } from "react";
import { Btn, Chip, Glass, Icon, Wordmark } from "../components/ui";
import { assignRoomTeam, createRoom, joinRoom, getRoomState, publishRoomState, startRoom, type RoomSession } from "../multiplayer/rooms";
import { buildPools, createPlayer, DEFAULT_RULES, gameReducer, initialState } from "../game/engine";
import type { GameConfig, GameState } from "../types";
import { play } from "../audio/sound";

export function OnlineScreen({ onBack, onGameReady }: { onBack: () => void; onGameReady: (session: RoomSession, state: GameState) => void }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [session, setSession] = useState<RoomSession | null>(() => {
    try {
      const saved = localStorage.getItem("fia-room-session");
      return saved ? JSON.parse(saved) as RoomSession : null;
    } catch {
      return null;
    }
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const readySent = useRef(false);

  useEffect(() => {
    if (!session) return;
    localStorage.setItem("fia-room-session", JSON.stringify(session));
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const timer = window.setInterval(async () => {
      try {
        const room = await getRoomState(session.code);
        setSession((current) => current ? { ...current, ...room } : current);
        if (room.started && room.state && !readySent.current) {
          readySent.current = true;
          onGameReady(session, room.state);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Room connection lost.");
      }
    }, 2000);
    return () => window.clearInterval(timer);
  }, [session?.code, onGameReady]);

  async function enterRoom(action: () => Promise<RoomSession>) {
    const cleanName = name.trim();
    if (!cleanName) {
      setError("Enter your name first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setSession(await action());
      play("coin");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect to the room.");
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    if (!session) return;
    await navigator.clipboard?.writeText(session.code);
    setError("Room code copied.");
  }

  async function beginMatch() {
    if (!session || !session.isHost) return;
    try {
      const players = session.players.map((player, index) => createPlayer(player.id, player.name, String(index), { teamId: player.teamId }));
      const config: GameConfig = {
        mode: "classic",
        difficulty: "medium",
        rounds: 3,
        rules: { ...DEFAULT_RULES },
        order: players.map((player) => player.id),
      };
      const state = gameReducer(initialState(), { type: "START_GAME", config, players, pools: buildPools(config.difficulty) });
      await publishRoomState(session, state);
      const room = await startRoom(session);
      const nextSession = { ...session, ...room };
      readySent.current = true;
      setSession(nextSession);
      onGameReady(nextSession, state);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the room.");
    }
  }

  if (session) {
    return (
      <div className="pitch-bg min-h-full px-5 py-8">
        <div className="mx-auto max-w-xl space-y-5">
          <div className="flex items-center justify-between">
            <Btn variant="ghost" size="sm" onClick={onBack}><Icon name="arrow-left" size={15} /> Back</Btn>
            <Wordmark />
            <span className="w-16" />
          </div>
          <Glass className="p-6 text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">Room code</p>
            <button onClick={copyCode} className="mt-2 font-score text-6xl tracking-[0.2em] text-gold-300">{session.code}</button>
            <p className="mt-2 text-sm text-white/60">Share this code with players on their phones or computers.</p>
            <Chip className="mt-4 bg-emerald-400/15 text-emerald-300">Room connected</Chip>
          </Glass>
          <Glass className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-sm uppercase tracking-widest text-gold-300">Players in room</h2>
              <span className="text-xs text-white/45">{session.players.length}</span>
            </div>
            <div className="space-y-2">
              {session.players.map((player) => (
                <div key={player.id} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-400/15 text-gold-300">{player.name.slice(0, 1).toUpperCase()}</span>
                  <span className="font-semibold text-white">{player.name}</span>
                  <Chip className="ml-auto bg-white/8 text-white/65">Team {player.teamId.toUpperCase()}</Chip>
                  {player.id === session.hostId && <Chip className="bg-gold-400/15 text-gold-300">Host</Chip>}
                </div>
              ))}
            </div>
            {session.isHost && !session.started && session.players.length > 1 && (
              <div className="mt-4 rounded-xl bg-white/5 p-3 text-xs text-white/55">
                <p className="mb-2">Assign teams for 2v2 play:</p>
                <div className="space-y-2">
                  {session.players.map((player) => (
                    <div key={player.id} className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-white/80">{player.name}</span>
                      {(["a", "b"] as const).map((team) => (
                        <button key={team} onClick={async () => {
                          try {
                            const room = await assignRoomTeam(session, player.id, team);
                            setSession((current) => current ? { ...current, ...room } : current);
                          } catch (e) { setError(e instanceof Error ? e.message : "Could not assign team."); }
                        }} className={`rounded-lg px-2.5 py-1.5 ${player.teamId === team ? "bg-gold-400/25 text-gold-200" : "bg-white/8 text-white/60"}`}>Team {team.toUpperCase()}</button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {session.isHost ? (
              <Btn size="lg" className="mt-4 w-full" onClick={beginMatch} disabled={session.started}>
                <Icon name={session.started ? "check" : "play"} size={17} />
                {session.started ? "Match started" : "Start match"}
              </Btn>
            ) : (
              <p className="mt-4 text-center text-xs text-white/50">Waiting for the host to start the match…</p>
            )}
            {session.started && <p className="mt-3 text-center text-sm text-emerald-300">Everyone is connected. Live game sync is being connected next.</p>}
          </Glass>
          {error && <p className="text-center text-sm text-gold-300">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="pitch-bg min-h-full px-5 py-8">
      <div className="mx-auto max-w-xl space-y-5">
        <Btn variant="ghost" size="sm" onClick={onBack}><Icon name="arrow-left" size={15} /> Back</Btn>
        <div className="text-center"><Wordmark /><p className="mt-3 text-sm text-white/65">Play together across phones, tablets, and computers.</p></div>
        <Glass className="space-y-4 p-5">
          <label className="block text-xs uppercase tracking-widest text-white/50">Your name
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder="Enter your name" className="mt-2 w-full rounded-xl bg-white/8 px-3 py-3 text-white outline-none placeholder:text-white/30 focus:bg-white/12" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <Btn size="lg" disabled={busy} onClick={() => enterRoom(() => createRoom(name))}><Icon name="play" size={17} /> Create room</Btn>
            <div className="flex gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="Room code" className="min-w-0 flex-1 rounded-xl bg-white/8 px-3 text-center font-score text-xl tracking-widest text-white outline-none placeholder:text-white/30" />
              <Btn variant="outline" disabled={busy || code.length !== 6} onClick={() => enterRoom(() => joinRoom(code, name))}>Join</Btn>
            </div>
          </div>
          {error && <p className="text-center text-sm text-flame-400">{error}</p>}
        </Glass>
      </div>
    </div>
  );
}
