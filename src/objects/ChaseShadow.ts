import * as Phaser from "phaser";
import { GAME_HEIGHT } from "@/config";
import { AssetKey } from "@/assets";

const SHADOW_WIDTH = 240;

export class ChaseShadow {
  private container: Phaser.GameObjects.Container;
  private spiritSprite: Phaser.GameObjects.Sprite;
  public visualX = -SHADOW_WIDTH;
  public destroyed = false;

  constructor(private readonly scene: Phaser.Scene) {
    // 1. 스프라이트 생성 및 크기 설정
    this.spiritSprite = scene.add.sprite(0, GAME_HEIGHT * 0.5, AssetKey.DisasterFire, "sprite3");
    this.spiritSprite.setScale(1.5);

    // 2. 애니메이션 생성 및 재생
    if (!scene.anims.exists("fire_spirit_anim")) {
      scene.anims.create({
        key: "fire_spirit_anim",
        frames: scene.anims.generateFrameNames(AssetKey.DisasterFire, {
          prefix: "sprite",
          frames: [3, 4, 5, 6, 10, 11, 12, 13]
        }),
        frameRate: 12,
        repeat: -1
      });
    }
    this.spiritSprite.play("fire_spirit_anim");

    // 3. 컨테이너에 스프라이트만 단독으로 담습니다.
    this.container = scene.add
      .container(0, 0, [this.spiritSprite])
      .setDepth(900)
      .setScrollFactor(0);
  }

  public update(): void {
    if (this.destroyed) return;

    // 스프라이트의 위치만 visualX에 맞춰 따라오도록 업데이트합니다.
    this.spiritSprite.x = this.visualX + SHADOW_WIDTH * 0.3;

    // 만약 위아래로 둥둥 떠다니는 효과(Math.sin)를 원하신다면 아래처럼 수정하세요.
    // this.spiritSprite.y = GAME_HEIGHT * 0.55 + Math.sin(this.scene.time.now / 200) * 15;
    this.spiritSprite.y = GAME_HEIGHT * 0.55;
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
}