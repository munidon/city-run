import * as Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "@/config";
import { makeButton } from "@/ui/button";
import { Player } from "@/objects/Player";
import { Obstacle } from "@/objects/Obstacle";
import { Item } from "@/objects/Item";
import { Scroll } from "@/objects/Scroll";
import { AssetKey } from "@/assets";

export class AssetPreviewScene extends Phaser.Scene {
  private players: Player[] = [];

  constructor() {
    super("AssetPreviewScene");
  }

  create(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x111122);

    this.add.text(GAME_WIDTH / 2, 50, "에셋 미리보기 (Asset Preview)", {
      fontFamily: "'Ramche', system-ui, sans-serif",
      fontSize: "32px",
      color: "#ffffff"
    }).setOrigin(0.5);

    makeButton(this, 80, 50, "← 뒤로", () => {
      this.scene.start("SettingsScene");
    }, {
      width: 100, height: 40, bgColor: 0x334466, fontSize: "16px", textColor: "#ffffff"
    });

    const row1Y = 250;
    const row2Y = 500;

    // --- Row 1: Characters & Effects ---
    const p1 = new Player(this, 200, row1Y);
    this.players.push(p1);
    this.drawHitbox(p1);

    const p2 = new Player(this, 350, row1Y);
    p2.jump();
    this.players.push(p2);
    this.drawHitbox(p2);

    const p3 = new Player(this, 500, row1Y);
    p3.slide();
    this.players.push(p3);
    this.drawHitbox(p3);

    // Fire Spirit
    const fire = this.add.sprite(800, row1Y - 50, AssetKey.DisasterFire, "sprite3");
    fire.setScale(1.2);
    if (!this.anims.exists("fire_spirit_anim")) {
      this.anims.create({
        key: "fire_spirit_anim",
        frames: this.anims.generateFrameNames(AssetKey.DisasterFire, {
          prefix: "sprite",
          frames: [3, 4, 5, 6, 10, 11, 12, 13]
        }),
        frameRate: 12,
        repeat: -1
      });
    }
    fire.play("fire_spirit_anim");
    this.drawHitboxForSprite(fire);

    // Add labels
    this.addLabel(200, row1Y + 20, "Player (Run)");
    this.addLabel(350, row1Y + 20, "Player (Jump)");
    this.addLabel(500, row1Y + 20, "Player (Slide)");
    this.addLabel(800, row1Y + 100, "Fire Spirit");

    // --- Row 2: Obstacles & Items ---
    const o1 = new Obstacle(this, 150, "single_box");
    this.adjustPos(o1, 150, row2Y);
    this.drawHitbox(o1);
    this.addLabel(150, row2Y + 50, "Box");

    const o2 = new Obstacle(this, 300, "double_pillar");
    this.adjustPos(o2, 300, row2Y);
    this.drawHitbox(o2);
    this.addLabel(300, row2Y + 100, "Pillar");

    const i1 = new Item(this, 450, row2Y, "gimbap");
    this.drawHitbox(i1);
    this.addLabel(450, row2Y + 50, "Gimbap");

    const i2 = new Item(this, 600, row2Y, "bento");
    this.drawHitbox(i2);
    this.addLabel(600, row2Y + 50, "Bento");

    const i3 = new Item(this, 750, row2Y, "coin");
    this.drawHitbox(i3);
    this.addLabel(750, row2Y + 50, "Coin");

    const scroll = new Scroll(this, 900, row2Y);
    this.drawHitbox(scroll);
    this.addLabel(900, row2Y + 50, "Scroll");

    // Disable gravity for all bodies in this scene so things don't fall
    this.physics.world.gravity.y = 0;
  }

  update(): void {
    // Left empty since we just need the scene to render static and animated sprites
  }

  private adjustPos(obj: Phaser.Physics.Arcade.Sprite, x: number, y: number) {
    obj.x = x;
    obj.y = y;
    if (obj.body) {
      const body = obj.body as Phaser.Physics.Arcade.Body;
      body.x = x - body.width / 2;
      body.y = y - body.height / 2;
    }
  }

  private addLabel(x: number, y: number, text: string) {
    this.add.text(x, y, text, {
      fontFamily: "'Ramche', system-ui, sans-serif",
      fontSize: "18px",
      color: "#aaaaaa"
    }).setOrigin(0.5);
  }

  private drawHitbox(obj: Phaser.Physics.Arcade.Sprite) {
    if (obj.body) {
      const body = obj.body as Phaser.Physics.Arcade.Body;
      body.updateFromGameObject();
      const rect = this.add.rectangle(
        body.x + body.width / 2, 
        body.y + body.height / 2, 
        body.width, 
        body.height
      );
      rect.setStrokeStyle(2, 0xffff00);
      rect.setDepth(100);
    }
  }

  private drawHitboxForSprite(sprite: Phaser.GameObjects.Sprite) {
    const rect = this.add.rectangle(
      sprite.x - sprite.displayOriginX + sprite.displayWidth / 2,
      sprite.y - sprite.displayOriginY + sprite.displayHeight / 2,
      sprite.displayWidth,
      sprite.displayHeight
    );
    rect.setStrokeStyle(2, 0xffff00);
    rect.setDepth(100);
  }
}
