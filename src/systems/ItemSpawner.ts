import * as Phaser from "phaser";
import { Item, ItemKind } from "@/objects/Item";
import { Scroll } from "@/objects/Scroll";
import { GROUND_Y, SPAWN_X, DESPAWN_X } from "@/config";

interface IntervalRange {
  minMs: number;
  maxMs: number;
}

const ITEM_INTERVAL: IntervalRange = { minMs: 900, maxMs: 1500 };
const ITEM_WEIGHTS: Record<ItemKind, number> = { bread: 6, lunchbox: 1, coin: 5 };

const Y_LOW = GROUND_Y - 60;
const Y_MID = GROUND_Y - 160;
const Y_HIGH = GROUND_Y - 240;

export class ItemSpawner {
  public readonly itemGroup: Phaser.Physics.Arcade.Group;
  public readonly scrollGroup: Phaser.Physics.Arcade.Group;
  private timeUntilNextMs = 600;
  private paused = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly getSpeed: () => number,
  ) {
    this.itemGroup = scene.physics.add.group({ classType: Item, runChildUpdate: false });
    this.scrollGroup = scene.physics.add.group({ classType: Scroll, runChildUpdate: false });
  }

  public update(deltaMs: number): void {
    if (this.paused) return;

    this.timeUntilNextMs -= deltaMs;
    if (this.timeUntilNextMs <= 0) {
      this.spawnItem();
      this.timeUntilNextMs = Phaser.Math.Between(ITEM_INTERVAL.minMs, ITEM_INTERVAL.maxMs);
    }

    const speed = this.getSpeed();
    const sweep = (group: Phaser.Physics.Arcade.Group) => {
      for (const child of group.getChildren()) {
        const o = child as Item | Scroll;
        if (!o.active) continue;
        const body = o.body as Phaser.Physics.Arcade.Body;
        body.setVelocityX(-speed);
        if (o.x < DESPAWN_X) o.destroy();
      }
    };
    sweep(this.itemGroup);
    sweep(this.scrollGroup);
  }

  public spawnScroll(): void {
    const y = Y_MID;
    const scroll = new Scroll(this.scene, SPAWN_X, y);
    this.scrollGroup.add(scroll);
    const body = scroll.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(-this.getSpeed());
  }

  public pause(p: boolean): void {
    this.paused = p;
    const freeze = (group: Phaser.Physics.Arcade.Group) => {
      for (const child of group.getChildren()) {
        const o = child as Item | Scroll;
        const body = o.body as Phaser.Physics.Arcade.Body | null;
        if (!body) continue;
        if (p) {
          o.setData("pausedVx", body.velocity.x);
          body.setVelocity(0, 0);
        } else {
          body.setVelocityX(o.getData("pausedVx") ?? 0);
        }
      }
    };
    freeze(this.itemGroup);
    freeze(this.scrollGroup);
  }

  public clear(): void {
    this.itemGroup.clear(true, true);
    this.scrollGroup.clear(true, true);
  }

  private spawnItem(): void {
    const kind = this.pickKind();
    const y = this.pickY(kind);
    const item = new Item(this.scene, SPAWN_X, y, kind);
    this.itemGroup.add(item);
    const body = item.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(-this.getSpeed());
  }

  private pickKind(): ItemKind {
    const total = ITEM_WEIGHTS.bread + ITEM_WEIGHTS.lunchbox + ITEM_WEIGHTS.coin;
    let r = Math.random() * total;
    if ((r -= ITEM_WEIGHTS.bread) < 0) return "bread";
    if ((r -= ITEM_WEIGHTS.lunchbox) < 0) return "lunchbox";
    return "coin";
  }

  private pickY(kind: ItemKind): number {
    if (kind === "lunchbox") return Math.random() < 0.5 ? Y_LOW : Y_MID;
    const r = Math.random();
    if (r < 0.45) return Y_LOW;
    if (r < 0.85) return Y_MID;
    return Y_HIGH;
  }
}
