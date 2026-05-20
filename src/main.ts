import * as Phaser from "phaser";
import { BACKGROUND_COLOR, GAME_HEIGHT, GAME_WIDTH, PARENT_ID } from "@/config";
import { BootScene } from "@/scenes/BootScene";
import { MainMenuScene } from "@/scenes/MainMenuScene";
import { GameScene } from "@/scenes/GameScene";
import { CardSelectScene } from "@/scenes/CardSelectScene";
import { SettingsScene } from "@/scenes/SettingsScene";
import { AssetPreviewScene } from "@/scenes/AssetPreviewScene";
import { MapEditorScene } from "@/scenes/MapEditorScene";

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
  scene: [BootScene, MainMenuScene, SettingsScene, AssetPreviewScene, GameScene, CardSelectScene, MapEditorScene],
};

const game = new Phaser.Game(config);

// URL에 ?editor=1 이 있으면 BootScene 완료 후 에디터로 진입
const wantEditor = new URLSearchParams(window.location.search).get("editor") === "1";
if (wantEditor) {
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
