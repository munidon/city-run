import * as Phaser from "phaser";

const W = 56;
const H = 64;

export class Scroll extends Phaser.Physics.Arcade.Sprite {
  public consumed = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const tex = Scroll.ensureTexture(scene);
    super(scene, x, y, tex);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(W, H);
    body.setAllowGravity(false);
    body.setImmovable(true);
    this.setDepth(45);

    scene.tweens.add({
      targets: this,
      angle: 6,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    scene.tweens.add({
      targets: this,
      y: y - 10,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private static ensureTexture(scene: Phaser.Scene): string {
    const key = "__scroll";
    if (scene.textures.exists(key)) return key;
    const g = scene.add.graphics({ x: 0, y: 0 });
    g.fillStyle(0x6b3f1f, 1);
    g.fillRoundedRect(0, 0, W, 12, 6);
    g.fillRoundedRect(0, H - 12, W, 12, 6);
    g.fillStyle(0xf3e3b0, 1);
    g.fillRect(4, 10, W - 8, H - 20);
    g.fillStyle(0x8c5a32, 1);
    for (let y = 16; y < H - 16; y += 8) {
      g.fillRect(10, y, W - 20, 2);
    }
    g.generateTexture(key, W, H);
    g.destroy();
    return key;
  }
}
