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
import { isDevToolsUnlocked } from "@/devUnlock";
import { RunState } from "@/state/RunState";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
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
  ],
};

const game = new Phaser.Game(config);

type ScreenshotMode =
  | "play-fire"
  | "fire-disaster"
  | "fire-quiz"
  | "play-flood"
  | "flood-disaster"
  | "card"
  | "final";

const shotMode = new URLSearchParams(window.location.search).get("shot") as ScreenshotMode | null;

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
        hud: { setCoins: (value: number) => void; setDisasterStatus: (text: string) => void };
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
      }
    });
  });

  menu?.scene.start("GameScene", { run });
}

function startScreenshotMode(mode: ScreenshotMode): void {
  const menu = game.scene.getScene("MainMenuScene");

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
  game.events.once("ready", () => {
    const boot = game.scene.getScene("BootScene");
    boot?.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.setTimeout(() => startScreenshotMode(shotMode), 80);
    });
  });
}

// URL에 ?editor=1 이 있으면 BootScene 완료 후 에디터로 진입
const wantEditor = new URLSearchParams(window.location.search).get("editor") === "1" && isDevToolsUnlocked();
if (wantEditor && !shotMode) {
  game.events.once("ready", () => {
    const boot = game.scene.getScene("BootScene");
    boot?.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      const menu = game.scene.getScene("MainMenuScene");
      menu?.scene.start("MapEditorScene");
    });
  });
}

if (import.meta.env.DEV) {
  (window as unknown as { __game: Phaser.Game }).__game = game;
}
