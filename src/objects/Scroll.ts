import * as Phaser from "phaser";
import { AssetKey } from "@/assets";

// 제어를 직관적으로 하기 위해 배율(Scale) 대신 명시적인 픽셀 크기 변수로 대체합니다.
const DISPLAY_SIZE = 64;
const HIT_SIZE = 32; // 아이템처럼 넉넉한 히트박스를 원하실 경우 이 값을 늘리시면 됩니다.

export class Scroll extends Phaser.Physics.Arcade.Sprite {
  public consumed = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, AssetKey.Scroll);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;

    // 1. 화면에 표시될 크기 설정 (내부적으로 this.scaleX, this.scaleY가 계산됨)
    this.setDisplaySize(DISPLAY_SIZE, DISPLAY_SIZE);

    // 2. 현재 적용된 스케일을 기준으로 히트박스 크기를 역산
    const scaledHitSizeX = HIT_SIZE / this.scaleX;
    const scaledHitSizeY = HIT_SIZE / this.scaleY;

    // 3. 중앙 정렬(true)과 함께 역산된 크기를 물리 바디에 적용
    body.setSize(scaledHitSizeX, scaledHitSizeY, true);

    body.setAllowGravity(false);
    body.setImmovable(true);
    this.setDepth(76);

    scene.tweens.add({
      targets: this,
      y: y - 6,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }
}