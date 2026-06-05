import * as Phaser from "phaser";
import { SPAWN_X } from "@/config";
import {
  RANDOM_ITEM_SPAWN,
  RANDOM_ITEM_Y,
  RANDOM_OBSTACLE_SPAWN,
} from "@/data/spawnConfig";
import { Item, type ItemKind } from "@/objects/Item";
import { Obstacle, type ObstacleKind } from "@/objects/Obstacle";

export class RandomSpawnSystem {
  private itemTimerMs = 600;
  private obstacleTimerMs = 800;
  private lastObstacleKind: ObstacleKind | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly itemGroup: Phaser.Physics.Arcade.Group,
    private readonly obstacleGroup: Phaser.Physics.Arcade.Group,
    private readonly getSpeed: () => number,
    private readonly getProgress: () => number,
    private readonly getIsDisasterActive: () => boolean,
  ) {}

  public update(deltaMs: number): void {
    this.itemTimerMs -= deltaMs;
    this.obstacleTimerMs -= deltaMs;

    if (this.itemTimerMs <= 0) {
      this.spawnItem();
      this.itemTimerMs = this.randomInterval(RANDOM_ITEM_SPAWN.interval);
    }

    if (this.obstacleTimerMs <= 0) {
      this.spawnObstacle();
      this.obstacleTimerMs = this.randomInterval(RANDOM_OBSTACLE_SPAWN.interval);
    }
  }

  private spawnItem(): void {
    const kind = this.pickWeighted<ItemKind>(
      RANDOM_ITEM_SPAWN.weights,
      (candidate) => !(RANDOM_ITEM_SPAWN.suppressDuringDisaster[candidate] && this.getIsDisasterActive()),
    );
    if (!kind) return;

    const item = new Item(this.scene, SPAWN_X, this.pickY(RANDOM_ITEM_Y[kind]), kind);
    this.itemGroup.add(item);
    const body = item.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(-this.getSpeed());
  }

  private spawnObstacle(): void {
    const weights = this.currentObstacleWeights();
    if (this.lastObstacleKind) {
      weights[this.lastObstacleKind] = Math.max(1, Math.floor(weights[this.lastObstacleKind] / 2));
    }

    const kind = this.pickWeighted(weights);
    if (!kind) return;

    const obstacle = new Obstacle(this.scene, SPAWN_X, kind);
    this.obstacleGroup.add(obstacle);
    const body = obstacle.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(-this.getSpeed());
    this.lastObstacleKind = kind;
  }

  private currentObstacleWeights(): Record<ObstacleKind, number> {
    const progress = this.getProgress();
    const phase = RANDOM_OBSTACLE_SPAWN.weightsByProgress.find((entry) => progress < entry.threshold);
    return { ...(phase ?? RANDOM_OBSTACLE_SPAWN.weightsByProgress[RANDOM_OBSTACLE_SPAWN.weightsByProgress.length - 1]).weights };
  }

  private pickWeighted<T extends string>(
    weights: Record<T, number>,
    filter: (kind: T) => boolean = () => true,
  ): T | null {
    const entries = (Object.entries(weights) as Array<[T, number]>).filter(
      ([kind, weight]) => weight > 0 && filter(kind),
    );
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    if (entries.length === 0 || total <= 0) return null;

    let roll = Math.random() * total;
    for (const [kind, weight] of entries) {
      roll -= weight;
      if (roll < 0) return kind;
    }
    return entries[entries.length - 1][0];
  }

  private pickY(values: number[]): number {
    return values[Math.floor(Math.random() * values.length)];
  }

  private randomInterval(interval: { minMs: number; maxMs: number }): number {
    return Phaser.Math.Between(interval.minMs, interval.maxMs);
  }
}
