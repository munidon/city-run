import * as Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "@/config";

const WAVE_STEP = 48;
const HIDDEN_Y = GAME_HEIGHT + 80;

export class FloodWater {
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setScrollFactor(0).setDepth(950);
    this.update(HIDDEN_Y);
  }

  public update(levelY: number): void {
    const topY = Math.min(HIDDEN_Y, levelY);
    this.graphics.clear();
    if (topY >= GAME_HEIGHT + 32) return;

    const phase = this.scene.time.now / 260;

    this.graphics.fillStyle(0x1377d4, 0.36);
    this.graphics.beginPath();
    this.graphics.moveTo(0, GAME_HEIGHT + 80);
    this.graphics.lineTo(0, this.waveY(0, topY, phase));

    for (let x = 0; x <= GAME_WIDTH + WAVE_STEP; x += WAVE_STEP) {
      this.graphics.lineTo(x, this.waveY(x, topY, phase));
    }

    this.graphics.lineTo(GAME_WIDTH + WAVE_STEP, GAME_HEIGHT + 80);
    this.graphics.closePath();
    this.graphics.fillPath();

    this.graphics.lineStyle(5, 0x9be7ff, 0.55);
    this.graphics.beginPath();
    this.graphics.moveTo(0, this.waveY(0, topY, phase));
    for (let x = 0; x <= GAME_WIDTH + WAVE_STEP; x += WAVE_STEP) {
      this.graphics.lineTo(x, this.waveY(x, topY, phase));
    }
    this.graphics.strokePath();

    this.graphics.fillStyle(0x9be7ff, 0.12);
    for (let x = 24; x < GAME_WIDTH; x += 112) {
      const y = this.waveY(x, topY, phase) + 32 + ((x / 7 + phase * 9) % 36);
      this.graphics.fillRoundedRect(x, y, 54, 8, 4);
    }
  }

  public destroy(): void {
    this.graphics.destroy();
  }

  private waveY(x: number, baseY: number, phase: number): number {
    return baseY + Math.sin(x / 78 + phase) * 9 + Math.sin(x / 31 + phase * 0.7) * 4;
  }
}
