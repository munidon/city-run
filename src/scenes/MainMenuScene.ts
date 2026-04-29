import * as Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "@/config";

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super("MainMenuScene");
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.add
      .text(cx, cy - 80, "도시런", {
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: "96px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy + 10, "City Run — PoC", {
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: "28px",
        color: "#ffb84d",
      })
      .setOrigin(0.5);

    const startText = this.add
      .text(cx, cy + 110, "▶ 탭 / 스페이스로 시작", {
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: "32px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: startText,
      alpha: 0.4,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    const start = () => this.scene.start("GameScene");
    this.input.on("pointerdown", start);
    this.input.keyboard?.on("keydown-SPACE", start);
    this.input.keyboard?.on("keydown-ENTER", start);
  }
}
