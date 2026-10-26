import { lazy, Suspense, useEffect, useReducer, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { gameReducer, initialState, buildPools } from "./game/engine";
import { setSoundEnabled } from "./audio/sound";
import type { GameConfig, Player } from "./types";
import type { RoomSession } from "./multiplayer/rooms";
import { getRoomState, publishRoomState } from "./multiplayer/rooms";

const HomeScreen = lazy(() => import("./screens/HomeScreen").then((m) => ({ default: m.HomeScreen })));
const SetupScreen = lazy(() => import("./screens/SetupScreen").then((m) => ({ default: m.SetupScreen })));
const CategoryWheelScreen = lazy(() => import("./screens/CategoryWheelScreen").then((m) => ({ default: m.CategoryWheelScreen })));
const NumberSelectScreen = lazy(() => import("./screens/NumberSelectScreen").then((m) => ({ default: m.NumberSelectScreen })));
const QuestionScreen = lazy(() => import("./screens/QuestionScreen").then((m) => ({ default: m.QuestionScreen })));
const ScoreboardScreen = lazy(() => import("./screens/ScoreboardScreen").then((m) => ({ default: m.ScoreboardScreen })));
const GameOverScreen = lazy(() => import("./screens/GameOverScreen").then((m) => ({ default: m.GameOverScreen })));
const StatsScreen = lazy(() => import("./screens/StatsScreen").then((m) => ({ default: m.StatsScreen })));
const DailyChallengeScreen = lazy(() => import("./screens/DailyChallengeScreen").then((m) => ({ default: m.DailyChallengeScreen })));
const OnlineScreen = lazy(() => import("./screens/OnlineScreen").then((m) => ({ default: m.OnlineScreen })));

type Ui = "home" | "setup" | "game" | "stats" | "daily" | "online";

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, initialState);
  const [ui, setUi] = useState<Ui>(() => localStorage.getItem("fia-room-session") ? "online" : "home");
  const [onlineSession, setOnlineSession] = useState<RoomSession | null>(null);
  const [sound, setSound] = useState(() => localStorage.getItem("fia-sound") !== "off");
  const [tts] = useState(() => localStorage.getItem("fia-tts") !== "off");

  useEffect(() => {
    setSoundEnabled(sound);
    localStorage.setItem("fia-sound", sound ? "on" : "off");
  }, [sound]);

  useEffect(() => {
    localStorage.setItem("fia-tts", tts ? "on" : "off");
  }, [tts]);

  useEffect(() => {
    if (!onlineSession) return;
    if (onlineSession.isHost) {
      if (state.phase !== "home" && state.config) void publishRoomState(onlineSession, state);
      return;
    }
    const timer = window.setInterval(async () => {
      try {
        const room = await getRoomState(onlineSession.code);
        if (room.state) dispatch({ type: "SYNC_STATE", state: room.state });
      } catch {
        // The room UI reports connection errors; the game stays on the last state.
      }
    }, 1200);
    return () => window.clearInterval(timer);
  }, [onlineSession, state]);

  function startGame(config: GameConfig, players: Player[]) {
    const pools = buildPools(config.difficulty);
    dispatch({ type: "START_GAME", config, players, pools });
    setUi("game");
  }

  let screen: React.ReactNode;
  if (ui === "home") {
    screen = (
      <HomeScreen
        sound={sound}
        onToggleSound={setSound}
        onNewGame={() => setUi("setup")}
        onDaily={() => setUi("daily")}
        onStats={() => setUi("stats")}
        onOnline={() => setUi("online")}
      />
    );
  } else if (ui === "setup") {
    screen = <SetupScreen onStart={startGame} onBack={() => setUi("home")} />;
  } else if (ui === "stats") {
    screen = <StatsScreen onBack={() => setUi("home")} />;
  } else if (ui === "daily") {
    screen = <DailyChallengeScreen onBack={() => setUi("home")} />;
  } else if (ui === "online") {
    screen = <OnlineScreen onBack={() => setUi("home")} onGameReady={(session, nextState) => {
      setOnlineSession(session);
      dispatch({ type: "SYNC_STATE", state: nextState });
      setUi("game");
    }} />;
  } else {
    switch (state.phase) {
      case "category":
        screen = (
          <CategoryWheelScreen
            state={state}
            dispatch={dispatch}
            autoRandom={state.config?.mode === "randommix"}
          />
        );
        break;
      case "number":
        screen = <NumberSelectScreen state={state} dispatch={dispatch} />;
        break;
      case "question":
        screen = <QuestionScreen state={state} dispatch={dispatch} sound={sound} tts={tts} />;
        break;
      case "scoreboard":
        screen = <ScoreboardScreen state={state} dispatch={dispatch} />;
        break;
      case "gameover":
        screen = (
          <GameOverScreen
            state={state}
            onHome={() => {
              dispatch({ type: "RESET_GAME" });
              setUi("home");
            }}
            onReplay={() => {
              dispatch({ type: "RESET_GAME" });
              setUi("setup");
            }}
          />
        );
        break;
      default:
        screen = <HomeScreen sound={sound} onToggleSound={setSound} onNewGame={() => setUi("setup")} onDaily={() => setUi("daily")} onStats={() => setUi("stats")} onOnline={() => setUi("online")} />;
    }
  }

  return (
    <Suspense fallback={<div className="pitch-bg flex min-h-full items-center justify-center text-sm text-white/60">Loading the arena…</div>}>
      <div className="min-h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={ui + state.phase}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="min-h-full"
          >
            {screen}
          </motion.div>
        </AnimatePresence>
      </div>
    </Suspense>
  );
}
