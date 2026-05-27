import * as Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "@/config";
import { AssetKey, SoundKey } from "@/assets";
import { RunState } from "@/state/RunState";
import { makeButton } from "@/ui/button";

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super("MainMenuScene");
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.add
      .image(cx, cy - 70, AssetKey.TitleLogo)
      .setOrigin(0.5)
      .setDisplaySize(1360, 750);

    makeButton(
      this,
      cx,
      cy + 170,
      "▶  게임 시작",
      () => this.startGame(false),
      {
        width: 300,
        height: 64,
        bgColor: 0x2d6a4f,
        fontSize: "28px",
        textColor: "#d8f3dc",
        soundKey: SoundKey.GameStart,
      }
    );

    makeButton(
      this,
      cx,
      cy + 250,
      "⚙  설정",
      () => this.scene.start("SettingsScene"),
      {
        width: 300,
        height: 52,
        bgColor: 0x1e1e38,
        fontSize: "28px",
        textColor: "#8888bb",
      }
    );

    makeButton(
      this,
      cx,
      cy + 320,
      "🛠  맵 에디터",
      () => this.scene.start("MapEditorScene"),
      {
        width: 300,
        height: 44,
        bgColor: 0x312a5a,
        fontSize: "22px",
        textColor: "#b6aafc",
      }
    );

    this.add
      .text(GAME_WIDTH - 180, cy + 172, "DEBUG STAGE", {
        fontFamily: "'Ramche', system-ui, sans-serif",
        fontSize: "16px",
        color: "#7f8db8",
      })
      .setOrigin(0.5);

    makeButton(
      this,
      GAME_WIDTH - 180,
      cy + 214,
      "화재 바로 시작",
      () => this.startDebugStage(1),
      {
        width: 210,
        height: 40,
        bgColor: 0x5a2a2a,
        fontSize: "18px",
        textColor: "#ffd8d8",
        soundKey: SoundKey.GameStart,
      }
    );

    makeButton(
      this,
      GAME_WIDTH - 180,
      cy + 264,
      "홍수 바로 시작",
      () => this.startDebugStage(2),
      {
        width: 210,
        height: 40,
        bgColor: 0x1f5f8b,
        fontSize: "18px",
        textColor: "#d7f4ff",
        soundKey: SoundKey.GameStart,
      }
    );

    this.input.keyboard?.on("keydown-SPACE", () => this.startGame());
    this.input.keyboard?.on("keydown-ENTER", () => this.startGame());
  }

  private startGame(playSound = true): void {
    if (playSound) this.sound.play(SoundKey.GameStart);
    this.scene.start("GameScene", { run: new RunState() });
  }

  private startDebugStage(stageIndex: number): void {
    const run = new RunState();
    run.stageIndex = stageIndex;
    this.scene.start("GameScene", { run });
  }
}
