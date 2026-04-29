import * as Phaser from "phaser";
import { Obstacle, ObstacleKind } from "@/objects/Obstacle";
import { SPAWN_X, DESPAWN_X } from "@/config";

interface IntervalRange {
  minMs: number;
  maxMs: number;
}

interface PhaseConfig {
  threshold: number;
  interval: IntervalRange;
  weights: Record<ObstacleKind, number>;
}

const PHASES: PhaseConfig[] = [
  { threshold: 0.25, interval: { minMs: 1700, maxMs: 2400 }, weights: { flame: 6, falling: 1, low_bar: 2 } },
  { threshold: 0.6, interval: { minMs: 1300, maxMs: 1900 }, weights: { flame: 5, falling: 2, low_bar: 3 } },
  { threshold: 0.85, interval: { minMs: 1050, maxMs: 1500 }, weights: { flame: 4, falling: 3, low_bar: 3 } },
  { threshold: 1.01, interval: { minMs: 900, maxMs: 1250 }, weights: { flame: 4, falling: 4, low_bar: 4 } },
];

export class ObstacleSpawner {
  public readonly group: Phaser.Physics.Arcade.Group;
  private timeUntilNextMs = 800;
  private paused = false;
  private lastKind: ObstacleKind | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly getProgress: () => number,
    private readonly getSpeed: () => number,
    private readonly densityMul: number = 1,
  ) {
    this.group = scene.physics.add.group({ classType: Obstacle, runChildUpdate: false });
  }

  public update(deltaMs: number): void {
    if (this.paused) return;

    this.timeUntilNextMs -= deltaMs;
    if (this.timeUntilNextMs <= 0) {
      this.spawn();
      const phase = this.currentPhase();
      const next = Phaser.Math.Between(phase.interval.minMs, phase.interval.maxMs);
      this.timeUntilNextMs = Math.max(450, next / this.densityMul);
    }

    const speed = this.getSpeed();
    for (const child of this.group.getChildren()) {
      const obs = child as Obstacle;
      if (!obs.active) continue;
      const body = obs.body as Phaser.Physics.Arcade.Body;
      body.setVelocityX(-speed);
      if (obs.x < DESPAWN_X) obs.destroy();
    }
  }

  public pause(p: boolean): void {
    this.paused = p;
    for (const child of this.group.getChildren()) {
      const obs = child as Obstacle;
      const body = obs.body as Phaser.Physics.Arcade.Body | null;
      if (!body) continue;
      if (p) {
        obs.setData("pausedVx", body.velocity.x);
        obs.setData("pausedVy", body.velocity.y);
        obs.setData("pausedGravity", body.allowGravity);
        body.setAllowGravity(false);
        body.setVelocity(0, 0);
      } else {
        body.setAllowGravity(obs.getData("pausedGravity") ?? false);
        body.setVelocity(obs.getData("pausedVx") ?? 0, obs.getData("pausedVy") ?? 0);
      }
    }
  }

  public clear(): void {
    this.group.clear(true, true);
  }

  private currentPhase(): PhaseConfig {
    const p = this.getProgress();
    for (const phase of PHASES) if (p < phase.threshold) return phase;
    return PHASES[PHASES.length - 1];
  }

  private spawn(): void {
    const phase = this.currentPhase();
    const kind = this.pickKind(phase.weights);
    const obs = new Obstacle(this.scene, SPAWN_X, kind);
    this.group.add(obs);
    const body = obs.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(-this.getSpeed());
    this.lastKind = kind;
  }

  private pickKind(weights: Record<ObstacleKind, number>): ObstacleKind {
    const adjusted: Record<ObstacleKind, number> = { ...weights };
    if (this.lastKind) adjusted[this.lastKind] = Math.max(1, Math.floor(adjusted[this.lastKind] / 2));
    const total = adjusted.flame + adjusted.falling + adjusted.low_bar;
    let r = Math.random() * total;
    if ((r -= adjusted.flame) < 0) return "flame";
    if ((r -= adjusted.falling) < 0) return "falling";
    return "low_bar";
  }
}
