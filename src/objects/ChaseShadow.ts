import * as Phaser from "phaser";
import { GAME_HEIGHT } from "@/config";

const SHADOW_WIDTH = 240;
const PARTICLE_COUNT = 22;

export class ChaseShadow {
  private container: Phaser.GameObjects.Container;
  private gradient: Phaser.GameObjects.Graphics;
  private edgeFlicker: Phaser.GameObjects.Graphics;
  private particles: Phaser.GameObjects.Arc[] = [];
  private particleData: { vy: number; life: number; maxLife: number; r: number }[] = [];
  private flickerPhase = 0;
  public visualX = -SHADOW_WIDTH;
  public destroyed = false;

  constructor(private readonly scene: Phaser.Scene) {
    this.gradient = scene.add.graphics();
    this.edgeFlicker = scene.add.graphics();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const c = scene.add.circle(0, 0, 4, 0xffaa3d, 0.0);
      this.particles.push(c);
      this.particleData.push({ vy: 0, life: 0, maxLife: 1, r: 4 });
    }

    this.container = scene.add
      .container(0, 0, [this.gradient, this.edgeFlicker, ...this.particles])
      .setDepth(900)
      .setScrollFactor(0);

    this.draw();
  }

  public update(deltaMs: number): void {
    if (this.destroyed) return;
    this.flickerPhase += deltaMs / 100;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const d = this.particleData[i];
      d.life -= deltaMs;
      if (d.life <= 0) {
        d.maxLife = 600 + Math.random() * 600;
        d.life = d.maxLife;
        d.vy = -40 - Math.random() * 60;
        d.r = 3 + Math.random() * 5;
        p.x = this.visualX + SHADOW_WIDTH * (0.4 + Math.random() * 0.6);
        p.y = GAME_HEIGHT - Math.random() * GAME_HEIGHT;
        p.setRadius(d.r);
      }
      p.y += (d.vy * deltaMs) / 1000;
      p.x -= (10 * deltaMs) / 1000;
      const lifeRatio = d.life / d.maxLife;
      p.setAlpha(Math.max(0, lifeRatio * 0.85));
      const tint = lifeRatio > 0.5 ? 0xffd24d : lifeRatio > 0.25 ? 0xff7a3d : 0xff3a1a;
      p.setFillStyle(tint, p.alpha);
    }

    this.draw();
  }

  public setX(x: number): void {
    this.visualX = x;
  }

  public hide(): void {
    if (this.destroyed) return;
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 600,
      onComplete: () => this.destroy(),
    });
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.container.destroy(true);
  }

  private draw(): void {
    this.gradient.clear();
    const x = this.visualX;
    const w = SHADOW_WIDTH;
    const h = GAME_HEIGHT;
    for (let i = 0; i < 12; i++) {
      const t = i / 12;
      const segW = w / 12;
      const alpha = 0.05 + (1 - t) * 0.55;
      const color = t < 0.4 ? 0x6b1212 : t < 0.7 ? 0xc23a14 : 0xff6a2a;
      this.gradient.fillStyle(color, alpha);
      this.gradient.fillRect(x + i * segW, 0, segW + 1, h);
    }
    this.gradient.fillStyle(0x000000, 0.7);
    this.gradient.fillRect(x - w, 0, w, h);

    this.edgeFlicker.clear();
    const flickerOffset = Math.sin(this.flickerPhase) * 6;
    const edgeX = x + w;
    this.edgeFlicker.fillStyle(0xffe066, 0.35);
    for (let yy = 0; yy < h; yy += 18) {
      const wob = Math.sin((yy + this.flickerPhase * 30) * 0.05) * 10 + flickerOffset;
      this.edgeFlicker.fillCircle(edgeX + wob, yy, 8);
    }
    this.edgeFlicker.fillStyle(0xff4d2a, 0.5);
    this.edgeFlicker.fillRect(edgeX - 4, 0, 8, h);
  }
}
