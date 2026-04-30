import * as Phaser from "phaser";
import { AssetKey } from "@/assets";

const PLAYER_WIDTH = 160;
const PLAYER_HEIGHT_STAND = 90;
const PLAYER_WIDTH_JUMP = 160;
const PLAYER_HEIGHT_JUMP = 90;
const PLAYER_WIDTH_SLIDE = 160;
const PLAYER_HEIGHT_SLIDE = 45;
const JUMP_VELOCITY = -600;
const DOUBLE_JUMP_VELOCITY = -600;
// const SLIDE_DURATION_MS = 100;
const GROUND_EPSILON = 2;
const ANIM_RUN = "player-cat:run";
const ANIM_JUMP = "player-cat:jump";
const ANIM_SLIDE = "player-cat:slide";
const RUN_FRAMES = ["sprite4", "sprite5", "sprite1", "sprite2", "sprite3", "sprite6"];
const JUMP_FRAMES = ["sprite18", "sprite16", "sprite15", "sprite14", "sprite17", "sprite19"];
const SLIDE_FRAMES = ["sprite23", "sprite22", "sprite25", "sprite24", "sprite21", "sprite20"];
type PlayerPose = "run" | "jump" | "slide";

export class Player extends Phaser.Physics.Arcade.Sprite {
  private jumpsRemaining = 2;
  private isSliding = false;
  private pose?: PlayerPose;
  // private slideTimer?: Phaser.Time.TimerEvent;
  private readonly groundY: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const tex = Player.ensureTexture(scene);
    super(scene, x, y, tex, scene.textures.exists(AssetKey.Player) ? RUN_FRAMES[0] : undefined);
    this.groundY = y;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    Player.ensureAnimations(scene);

    this.setOrigin(0.5, 1);
    this.applyPose("run");
    this.setDepth(70);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(PLAYER_WIDTH, PLAYER_HEIGHT_STAND);
    body.setOffset(0, 0);
    body.setMaxVelocity(0, 1600);
  }

  private static ensureTexture(scene: Phaser.Scene): string {
    if (scene.textures.exists(AssetKey.Player)) return AssetKey.Player;

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

  private static ensureAnimations(scene: Phaser.Scene): void {
    if (!scene.textures.exists(AssetKey.Player) || scene.anims.exists(ANIM_RUN)) return;

    scene.anims.create({
      key: ANIM_RUN,
      frames: Player.frameRefs(RUN_FRAMES),
      frameRate: 14,
      repeat: -1,
    });

    scene.anims.create({
      key: ANIM_JUMP,
      frames: Player.frameRefs(JUMP_FRAMES),
      frameRate: 10,
      repeat: -1,
    });

    scene.anims.create({
      key: ANIM_SLIDE,
      frames: Player.frameRefs(SLIDE_FRAMES),
      frameRate: 12,
      repeat: -1,
    });
  }

  private static frameRefs(frames: string[]): Phaser.Types.Animations.AnimationFrame[] {
    return frames.map((frame) => ({ key: AssetKey.Player, frame }));
  }

  public jump(): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.isSliding) this.endSlide();

    if (this.isGrounded(body)) {
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
    if (!this.isGrounded(body)) {
      return false;
    }

    this.snapToGround();
    this.isSliding = true;
    this.applyPose("slide");
    body.setSize(PLAYER_WIDTH_SLIDE, PLAYER_HEIGHT_SLIDE);
    this.snapToGround();

    // this.slideTimer?.remove(false);
    // this.slideTimer = this.scene.time.delayedCall(SLIDE_DURATION_MS, () => this.endSlide());
    return true;
  }

  public endSlide(): void {
    if (!this.isSliding) return;
    this.isSliding = false;
    this.applyPose("run");
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(PLAYER_WIDTH, PLAYER_HEIGHT_STAND);
    this.snapToGround();
  }

  public override update(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.isSliding) {
      this.snapToGround();
      return;
    }

    if (this.isGrounded(body)) {
      this.jumpsRemaining = 2;
      this.snapToGround();
      this.applyPose("run");
    } else {
      this.applyPose("jump");
    }
  }

  private isGrounded(body: Phaser.Physics.Arcade.Body): boolean {
    const isRising = body.velocity.y < 0;
    return body.blocked.down || body.touching.down || (!isRising && this.y >= this.groundY - GROUND_EPSILON);
  }

  private snapToGround(): void {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    this.y = this.groundY;
    if (body) {
      body.setVelocityY(0);
    }
  }

  private applyPose(pose: PlayerPose): void {
    if (this.pose === pose) return;
    this.pose = pose;

    if (pose === "slide") {
      this.playIfLoaded(ANIM_SLIDE);
      this.setDisplaySize(PLAYER_WIDTH_SLIDE, PLAYER_HEIGHT_SLIDE);
      return;
    }

    this.playIfLoaded(pose === "jump" ? ANIM_JUMP : ANIM_RUN);
    if (pose === "jump") {
      this.setDisplaySize(PLAYER_WIDTH_JUMP, PLAYER_HEIGHT_JUMP);
      return;
    }

    this.setDisplaySize(PLAYER_WIDTH, PLAYER_HEIGHT_STAND);
  }

  private playIfLoaded(key: string): void {
    if (this.scene.anims.exists(key) && this.anims.currentAnim?.key !== key) {
      this.play(key);
    }
  }

  public get sliding(): boolean {
    return this.isSliding;
  }
}
