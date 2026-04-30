import * as Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "@/config";

const FONT = "system-ui, -apple-system, sans-serif";

export class HUD {
  private healthBar: Phaser.GameObjects.Graphics;
  private progressBar: Phaser.GameObjects.Graphics;
  private healthText: Phaser.GameObjects.Text;
  private timerText: Phaser.GameObjects.Text;
  private stageLabel: Phaser.GameObjects.Text;
  private coinText: Phaser.GameObjects.Text;
  private disasterText: Phaser.GameObjects.Text;

  private healthRatio = 1;
  private progressRatio = 0;

  constructor(scene: Phaser.Scene) {
    this.healthBar = scene.add.graphics();
    this.progressBar = scene.add.graphics();
    this.healthBar.setScrollFactor(0).setDepth(1000);
    this.progressBar.setScrollFactor(0).setDepth(1000);

    this.healthText = scene.add
      .text(36, 24, "HP", {
        fontFamily: FONT,
        fontSize: "20px",
        color: "#ffffff",
      })
      .setScrollFactor(0)
      .setDepth(1001);

    this.timerText = scene.add
      .text(GAME_WIDTH - 36, 24, "0:00", {
        fontFamily: FONT,
        fontSize: "20px",
        color: "#ffffff",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(1001);

    this.stageLabel = scene.add
      .text(GAME_WIDTH / 2, 24, "Stage 1-1", {
        fontFamily: FONT,
        fontSize: "20px",
        color: "#ffb84d",
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(1001);

    this.coinText = scene.add
      .text(GAME_WIDTH - 36, 92, "🪙 0", {
        fontFamily: FONT,
        fontSize: "22px",
        color: "#ffd73d",
        fontStyle: "bold",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(1001);

    this.disasterText = scene.add
      .text(GAME_WIDTH / 2, 56, "", {
        fontFamily: FONT,
        fontSize: "18px",
        color: "#ff5252",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(1001);

    this.redraw();
  }

  public setHealth(current: number, max: number): void {
    this.healthRatio = max > 0 ? current / max : 0;
    this.healthText.setText(`HP ${Math.ceil(current)}/${max}`);
    this.redraw();
  }

  public setProgress(p: number): void {
    this.progressRatio = Phaser.Math.Clamp(p, 0, 1);
    this.redraw();
  }

  public setElapsed(seconds: number): void {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    this.timerText.setText(`${m}:${s.toString().padStart(2, "0")}`);
  }

  public setStageLabel(text: string): void {
    this.stageLabel.setText(text);
  }

  public setCoins(count: number): void {
    this.coinText.setText(`🪙 ${count}`);
  }

  public setDisasterStatus(text: string): void {
    this.disasterText.setText(text);
  }

  private redraw(): void {
    const padX = 36;
    const topBarY = 60;
    const topBarW = GAME_WIDTH - padX * 2;
    const topBarH = 22;

    this.healthBar.clear();
    this.healthBar.fillStyle(0x000000, 0.45);
    this.healthBar.fillRoundedRect(padX, topBarY, topBarW, topBarH, 8);
    const hpColor = this.healthRatio > 0.5 ? 0x4caf50 : this.healthRatio > 0.2 ? 0xffc107 : 0xff5252;
    this.healthBar.fillStyle(hpColor, 1);
    this.healthBar.fillRoundedRect(padX + 2, topBarY + 2, (topBarW - 4) * this.healthRatio, topBarH - 4, 6);

    const botBarW = 380;
    const botBarH = 10;
    const botBarY = GAME_HEIGHT - 40;
    this.progressBar.clear();
    this.progressBar.fillStyle(0x000000, 0.45);
    this.progressBar.fillRoundedRect(padX, botBarY, botBarW, botBarH, 5);
    this.progressBar.fillStyle(0x4dabff, 1);
    this.progressBar.fillRoundedRect(padX + 2, botBarY + 2, (botBarW - 4) * this.progressRatio, botBarH - 4, 3);
  }
}
