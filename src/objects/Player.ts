import * as Phaser from "phaser";

const PLAYER_WIDTH = 56;
const PLAYER_HEIGHT_STAND = 96;
const PLAYER_HEIGHT_SLIDE = 48;
const JUMP_VELOCITY = -780;
const DOUBLE_JUMP_VELOCITY = -680;
const SLIDE_DURATION_MS = 600;

export class Player extends Phaser.Physics.Arcade.Sprite {
  private jumpsRemaining = 2;
  private isSliding = false;
  private slideTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const tex = Player.ensureTexture(scene);
    super(scene, x, y, tex);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    this.setDisplaySize(PLAYER_WIDTH, PLAYER_HEIGHT_STAND);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(PLAYER_WIDTH, PLAYER_HEIGHT_STAND);
    body.setOffset(0, 0);
    body.setMaxVelocity(0, 1600);
  }

  private static ensureTexture(scene: Phaser.Scene): string {
    const key = "__player_placeholder";
    if (scene.textures.exists(key)) return key;
    const g = scene.add.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffb84d, 1);
    g.fillRoundedRect(0, 0, PLAYER_WIDTH, PLAYER_HEIGHT_STAND, 12);
    g.fillStyle(0x1a1a2e, 1);
    g.fillCircle(PLAYER_WIDTH * 0.5, PLAYER_HEIGHT_STAND * 0.22, 6);
    g.generateTexture(key, PLAYER_WIDTH, PLAYER_HEIGHT_STAND);
    g.destroy();
    return key;
  }

  public jump(): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.isSliding) this.endSlide();

    if (body.blocked.down || body.touching.down) {
      this.jumpsRemaining = 2;
    }

    if (this.jumpsRemaining <= 0) return false;

    const isFirstJump = this.jumpsRemaining === 2;
    body.setVelocityY(isFirstJump ? JUMP_VELOCITY : DOUBLE_JUMP_VELOCITY);
    this.jumpsRemaining -= 1;
    return true;
  }

  public slide(): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.isSliding) return false;
    if (!(body.blocked.down || body.touching.down)) {
      body.setVelocityY(900);
      return false;
    }

    this.isSliding = true;
    this.setDisplaySize(PLAYER_WIDTH + 24, PLAYER_HEIGHT_SLIDE);
    body.setSize(PLAYER_WIDTH + 24, PLAYER_HEIGHT_SLIDE);

    this.slideTimer?.remove(false);
    this.slideTimer = this.scene.time.delayedCall(SLIDE_DURATION_MS, () => this.endSlide());
    return true;
  }

  private endSlide(): void {
    if (!this.isSliding) return;
    this.isSliding = false;
    this.setDisplaySize(PLAYER_WIDTH, PLAYER_HEIGHT_STAND);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(PLAYER_WIDTH, PLAYER_HEIGHT_STAND);
  }

  public override update(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body.blocked.down || body.touching.down) {
      this.jumpsRemaining = 2;
    }
  }

  public get sliding(): boolean {
    return this.isSliding;
  }
}
