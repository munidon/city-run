import * as Phaser from "phaser";
import { BACKGROUND_COLOR, GAME_HEIGHT, GAME_WIDTH, PARENT_ID } from "@/config";
import { BootScene } from "@/scenes/BootScene";
import { MainMenuScene } from "@/scenes/MainMenuScene";
import { GameScene } from "@/scenes/GameScene";
import { CardSelectScene } from "@/scenes/CardSelectScene";
import { FinalScoreScene } from "@/scenes/FinalScoreScene";
import { SettingsScene } from "@/scenes/SettingsScene";
import { AssetPreviewScene } from "@/scenes/AssetPreviewScene";
import { MapEditorScene } from "@/scenes/MapEditorScene";
import { PresentationShotScene } from "@/scenes/PresentationShotScene";
import { isDevToolsUnlocked } from "@/devUnlock";
import { RunState } from "@/state/RunState";

type ScreenshotMode =
  | "play-fire"
  | "fire-disaster"
  | "fire-quiz"
  | "play-flood"
  | "flood-disaster"
  | "energy-boost"
  | "checkpoint-50"
  | "checkpoint-80"
  | "pause-menu"
  | "resume-countdown"
  | "player-run"
  | "player-jump"
  | "player-slide"
  | "player-hit"
  | "items"
  | "obstacles"
  | "quiz-correct"
  | "quiz-wrong"
  | "map-flat"
  | "map-platforms"
  | "map-high"
  | "card"
  | "final";

const urlParams = new URLSearchParams(window.location.search);
const shotMode = urlParams.get("shot") as ScreenshotMode | null;

const config: Phaser.Types.Core.GameConfig = {
  type: shotMode ? Phaser.CANVAS : Phaser.AUTO,
  parent: PARENT_ID,
  backgroundColor: BACKGROUND_COLOR,
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 1800 },
      debug: false,
    },
  },
  input: {
    activePointers: 3,
  },
  scene: [
    BootScene,
    MainMenuScene,
    SettingsScene,
    AssetPreviewScene,
    GameScene,
    CardSelectScene,
    FinalScoreScene,
    MapEditorScene,
    PresentationShotScene,
  ],
};

const game = new Phaser.Game(config);

function makeDemoRun(stageIndex: number): RunState {
  const run = new RunState();
  run.stageIndex = stageIndex;
  run.totalCoins = stageIndex === 1 ? 42 : 136;
  run.currentHp = stageIndex === 1 ? 88 : 92;
  return run;
}

function startDemoGame(mode: ScreenshotMode, run: RunState): void {
  const menu = game.scene.getScene("MainMenuScene");
  const gameScene = game.scene.getScene("GameScene");

  gameScene.events.once(Phaser.Scenes.Events.CREATE, () => {
    gameScene.time.delayedCall(700, () => {
      const demo = gameScene as unknown as {
        disaster: {
          trigger: () => void;
          chaseX?: number;
          floodY?: number;
        };
        floodWater?: { update: (levelY: number) => void };
        health: { set: (value: number) => void };
        hud: {
          setCoins: (value: number) => void;
          setDisasterStatus: (text: string) => void;
          setProgress: (value: number) => void;
        };
        activateEnergyBoost: () => void;
        handleCheckpoint: (checkpoint: number) => void;
        openPauseMenu: () => void;
        startResumeCountdown: () => void;
        openQuiz: () => void;
      };

      demo.health.set(90);
      demo.hud.setCoins(run.totalCoins);

      if (mode === "fire-disaster") {
        demo.disaster.trigger();
        demo.disaster.chaseX = -30;
      } else if (mode === "fire-quiz") {
        demo.openQuiz();
      } else if (mode === "flood-disaster") {
        demo.disaster.trigger();
        demo.disaster.floodY = 470;
        demo.floodWater?.update(470);
        demo.hud.setDisasterStatus("🌊 홍수 발생 — 높은 발판과 두루마리를 찾아라!");
      } else if (mode === "energy-boost") {
        demo.activateEnergyBoost();
      } else if (mode === "checkpoint-50") {
        demo.hud.setProgress(0.5);
        demo.handleCheckpoint(0.5);
      } else if (mode === "checkpoint-80") {
        demo.hud.setProgress(0.8);
        demo.handleCheckpoint(0.8);
      } else if (mode === "pause-menu") {
        demo.openPauseMenu();
      } else if (mode === "resume-countdown") {
        demo.openPauseMenu();
        gameScene.time.delayedCall(250, () => demo.startResumeCountdown());
      }
    });
  });

  menu?.scene.start("GameScene", { run });
}

function startScreenshotMode(mode: ScreenshotMode): void {
  const menu = game.scene.getScene("MainMenuScene");

  if (
    mode.startsWith("player-") ||
    mode === "items" ||
    mode === "obstacles" ||
    mode.startsWith("quiz-") ||
    mode.startsWith("map-")
  ) {
    menu?.scene.start("PresentationShotScene", { mode });
    return;
  }

  if (mode === "card") {
    const run = makeDemoRun(1);
    run.totalCoins = 94;
    menu?.scene.start("CardSelectScene", { run });
    return;
  }

  if (mode === "final") {
    const run = makeDemoRun(2);
    run.totalCoins = 187;
    run.scoreMul = 1.6;
    menu?.scene.start("FinalScoreScene", {
      run,
      stageCoins: 64,
      remainingHp: 73,
      maxHp: run.maxHp,
    });
    return;
  }

  startDemoGame(mode, makeDemoRun(mode.includes("flood") ? 2 : 1));
}

if (shotMode) {
  game.events.once("city-run:boot-complete", () => {
    window.setTimeout(() => startScreenshotMode(shotMode), 80);
  });
}

// URL에 ?editor=1 이 있으면 BootScene 완료 후 에디터로 진입
const wantEditor = urlParams.get("editor") === "1" && isDevToolsUnlocked();
if (wantEditor && !shotMode) {
  game.events.once("city-run:boot-complete", () => {
    const menu = game.scene.getScene("MainMenuScene");
    menu?.scene.start("MapEditorScene");
  });
}

if (import.meta.env.DEV) {
  (window as unknown as { __game: Phaser.Game }).__game = game;
}
