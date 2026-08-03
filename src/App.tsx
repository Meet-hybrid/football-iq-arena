import { useEffect, useReducer, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { gameReducer, initialState, buildPools } from "./game/engine";
import { setSoundEnabled } from "./audio/sound";
import { HomeScreen } from "./screens/HomeScreen";
import { SetupScreen } from "./screens/SetupScreen";
import { CategoryWheelScreen } from "./screens/CategoryWheelScreen";
import { NumberSelectScreen } from "./screens/NumberSelectScreen";
import { QuestionScreen } from "./screens/QuestionScreen";
import { ScoreboardScreen } from "./screens/ScoreboardScreen";
import { GameOverScreen } from "./screens/GameOverScreen";
import { StatsScreen } from "./screens/StatsScreen";
import { DailyChallengeScreen } from "./screens/DailyChallengeScreen";
import type { GameConfig, Player } from "./types";

type Ui = "home" | "setup" | "game" | "stats" | "daily";

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, initialState);
  const [ui, setUi] = useState<Ui>("home");
  const [sound, setSound] = useState(() => localStorage.getItem("fia-sound") !== "off");
  const [tts] = useState(() => localStorage.getItem("fia-tts") !== "off");

  useEffect(() => {
    setSoundEnabled(sound);
    localStorage.setItem("fia-sound", sound ? "on" : "off");
  }, [sound]);

  useEffect(() => {
    localStorage.setItem("fia-tts", tts ? "on" : "off");
  }, [tts]);

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
      />
    );
  } else if (ui === "setup") {
    screen = <SetupScreen onStart={startGame} onBack={() => setUi("home")} />;
  } else if (ui === "stats") {
    screen = <StatsScreen onBack={() => setUi("home")} />;
  } else if (ui === "daily") {
    screen = <DailyChallengeScreen onBack={() => setUi("home")} />;
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
        screen = <HomeScreen sound={sound} onToggleSound={setSound} onNewGame={() => setUi("setup")} onDaily={() => setUi("daily")} onStats={() => setUi("stats")} />;
    }
  }

  return (
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
  );
}
