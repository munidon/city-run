import * as Phaser from "phaser";
import { AssetKey } from "@/assets";

const FALLBACK_TEX_KEY = "__platform_block";

function resolveTexture(scene: Phaser.Scene): string {
  if (scene.textures.exists(AssetKey.Deck)) return AssetKey.Deck;
  if (scene.textures.exists(FALLBACK_TEX_KEY)) return FALLBACK_TEX_KEY;
  const w = 64;
  const h = 64;
  const g = scene.add.graphics({ x: 0, y: 0 });
  g.fillStyle(0x4a6b3a, 1);
  g.fillRect(0, 0, w, h);
  g.fillStyle(0x6b9351, 1);
  g.fillRect(0, 0, w, 10);
  g.fillStyle(0x2f4a25, 0.8);
  g.fillRect(0, h - 6, w, 6);
  g.generateTexture(FALLBACK_TEX_KEY, w, h);
  g.destroy();
  return FALLBACK_TEX_KEY;
}

export class Platform extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    const tex = resolveTexture(scene);
    super(scene, x, y, tex);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0, 0);
    this.setDisplaySize(width, height);
    this.setDepth(50);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(width / this.scaleX, height / this.scaleY, false);
    body.setOffset(0, 0);
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.checkCollision.up = true;
    body.checkCollision.down = false;
    body.checkCollision.left = false;
    body.checkCollision.right = false;
  }
}
