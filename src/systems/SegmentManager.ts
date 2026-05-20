import * as Phaser from "phaser";
import { Platform } from "@/objects/Platform";
import { Item } from "@/objects/Item";
import { DESPAWN_X, GAME_WIDTH, SPAWN_X } from "@/config";
import { MapSegment, pickRandomSegment } from "@/data/segments";

/**
 * 세그먼트(맵 청크)를 게임 진행 중 우측에서 좌측으로 흘러보내며 끊김 없이 이어붙인다.
 * - 플랫폼: setVelocityX(-speed)로 스크롤. screenLeft 통과 시 destroy.
 * - 코인: Item(kind=coin)으로 스폰. screenLeft 통과 시 destroy.
 */
export class SegmentManager {
  public readonly platformGroup: Phaser.Physics.Arcade.Group;
  public readonly coinGroup: Phaser.Physics.Arcade.Group;

  /** 다음 세그먼트의 좌측 가장자리가 위치할 (현재 시점의) 월드 X. 매 프레임 스크롤 속도만큼 감소. */
  private nextSpawnX: number = SPAWN_X;
  private lastSegmentId?: string;
  private paused = false;
  /** Test Play 모드: 단일 세그먼트만 반복. */
  private forcedSegment?: MapSegment;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly getSpeed: () => number,
    private readonly getProgress: () => number = () => 0,
  ) {
    this.platformGroup = scene.physics.add.group({
      classType: Platform,
      runChildUpdate: false,
      allowGravity: false,
      immovable: true,
    });
    this.coinGroup = scene.physics.add.group({
      classType: Item,
      runChildUpdate: false,
      allowGravity: false,
    });
  }

  /** 단일 세그먼트만 무한 반복 (에디터 Test Play 용도) */
  public setForcedSegment(seg: MapSegment | undefined): void {
    this.forcedSegment = seg;
  }

  public update(deltaMs: number): void {
    if (this.paused) return;

    const speed = this.getSpeed();
    // 다음 스폰 커서를 월드 스크롤과 동기화
    this.nextSpawnX -= (speed * deltaMs) / 1000;

    while (this.nextSpawnX <= SPAWN_X) {
      const seg = this.forcedSegment ?? pickRandomSegment(this.getProgress(), this.lastSegmentId);
      this.spawnSegment(seg, this.nextSpawnX);
      this.lastSegmentId = seg.id;
      this.nextSpawnX += seg.length;
    }

    // 모든 객체에 현재 속도 적용 + 화면 좌측을 벗어난 것 제거
    const sweep = (group: Phaser.Physics.Arcade.Group, leftEdgeGetter: (o: Phaser.GameObjects.GameObject) => number) => {
      for (const child of group.getChildren()) {
        const obj = child as Phaser.Physics.Arcade.Sprite;
        if (!obj.active) continue;
        const body = obj.body as Phaser.Physics.Arcade.Body | null;
        if (!body) continue;
        body.setVelocityX(-speed);
        if (leftEdgeGetter(obj) < DESPAWN_X) obj.destroy();
      }
    };

    sweep(this.platformGroup, (o) => {
      const p = o as Platform;
      return p.x + (p.displayWidth ?? 0);
    });
    sweep(this.coinGroup, (o) => (o as Item).x);
  }

  public pause(p: boolean): void {
    this.paused = p;
    const freeze = (group: Phaser.Physics.Arcade.Group) => {
      for (const child of group.getChildren()) {
        const obj = child as Phaser.Physics.Arcade.Sprite;
        const body = obj.body as Phaser.Physics.Arcade.Body | null;
        if (!body) continue;
        if (p) {
          obj.setData("pausedVx", body.velocity.x);
          body.setVelocity(0, 0);
        } else {
          body.setVelocityX(obj.getData("pausedVx") ?? 0);
        }
      }
    };
    freeze(this.platformGroup);
    freeze(this.coinGroup);
  }

  public clear(): void {
    this.platformGroup.clear(true, true);
    this.coinGroup.clear(true, true);
  }

  public reset(): void {
    this.clear();
    this.nextSpawnX = SPAWN_X;
    this.lastSegmentId = undefined;
  }

  private spawnSegment(seg: MapSegment, leftWorldX: number): void {
    const speed = this.getSpeed();

    for (const def of seg.platforms) {
      const plat = new Platform(this.scene, leftWorldX + def.x, def.y, def.width, def.height);
      this.platformGroup.add(plat);
      const body = plat.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
      body.setImmovable(true);
      body.setVelocityX(-speed);
    }

    for (const def of seg.coins) {
      const coin = new Item(this.scene, leftWorldX + def.x, def.y, "coin");
      this.coinGroup.add(coin);
      const body = coin.body as Phaser.Physics.Arcade.Body;
      body.setVelocityX(-speed);
    }

    // 너무 멀리 우측에서 스폰됐다면 즉시 화면 안쪽으로 끌어오기 위한 처리는 불필요:
    // velocity가 일정하므로 자연스럽게 흘러들어옴.
    void GAME_WIDTH; // intentionally referenced to keep import in case of future use
  }
}
