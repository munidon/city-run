import * as Phaser from "phaser";
import { Item, ItemKind } from "@/objects/Item";
import { Scroll } from "@/objects/Scroll";
import { GROUND_Y, SPAWN_X, DESPAWN_X } from "@/config";

interface IntervalRange {
  minMs: number;
  maxMs: number;
}

const ITEM_INTERVAL: IntervalRange = { minMs: 1400, maxMs: 2200 };
// 코인은 SegmentManager가 맵 데이터 기반으로 스폰하므로 여기서는 가중치 0
export const ITEM_SPAWN_WEIGHTS: Record<ItemKind, number> = {
  gimbap: 4,
  bento: 2,
  coin: 0,
  energy_drink: 1,
  fire_extinguisher: 1,
  gas_mask: 2,
  wet_towel: 2,
};

const Y_LOW = GROUND_Y - 60;
const Y_MID = GROUND_Y - 120;
const Y_HIGH = GROUND_Y - 240;

export class ItemSpawner {
  public readonly itemGroup: Phaser.Physics.Arcade.Group;
  public readonly scrollGroup: Phaser.Physics.Arcade.Group;
  private timeUntilNextMs = 600;
  private paused = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly getSpeed: () => number,
    private readonly getIsDisasterActive: () => boolean = () => false,
  ) {
    this.itemGroup = scene.physics.add.group({ classType: Item, runChildUpdate: false, allowGravity: false });
    this.scrollGroup = scene.physics.add.group({ classType: Scroll, runChildUpdate: false, allowGravity: false });
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

  public removeItemsByKind(kind: ItemKind): void {
    for (const child of this.itemGroup.getChildren()) {
      const item = child as Item;
      if (item.kind === kind) item.destroy();
    }
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
    const entries = (Object.entries(ITEM_SPAWN_WEIGHTS) as Array<[ItemKind, number]>).filter(
      ([kind, weight]) => weight > 0 && !(kind === "energy_drink" && this.getIsDisasterActive()),
    );
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    if (entries.length === 0 || total <= 0) return "gimbap";
    let r = Math.random() * total;
    for (const [kind, weight] of entries) {
      if ((r -= weight) < 0) return kind;
    }
    return entries[entries.length - 1][0];
  }

  private pickY(kind: ItemKind): number {
    if (kind === "bento" || kind === "fire_extinguisher") return Math.random() < 0.5 ? Y_LOW : Y_MID;
    if (kind === "energy_drink") return Math.random() < 0.65 ? Y_MID : Y_HIGH;
    const r = Math.random();
    if (r < 0.45) return Y_LOW;
    if (r < 0.85) return Y_MID;
    return Y_HIGH;
  }
}
