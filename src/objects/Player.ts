import * as Phaser from "phaser";
import { AssetKey } from "@/assets";

const PLAYER_WIDTH = 75;
const PLAYER_HEIGHT_STAND = 130;
const PLAYER_WIDTH_JUMP = 75;
const PLAYER_HEIGHT_JUMP = 130;
const PLAYER_WIDTH_SLIDE = 130;
const PLAYER_HEIGHT_SLIDE = 80;
const JUMP_VELOCITY = -600;
const DOUBLE_JUMP_VELOCITY = -600;
const GROUND_EPSILON = 2;
const HIT_ANIM_DURATION_MS = 700;

const ANIM_RUN = "player-boy:run";
const ANIM_JUMP = "player-boy:jump";
const ANIM_SLIDE = "player-boy:slide";
const ANIM_HIT = "player-boy:hit";
const ANIM_HIT_JUMP = "player-boy:hit-jump";
const ANIM_HIT_SLIDE = "player-boy:hit-slide";

const RUN_FRAMES = ["sprite1", "sprite2", "sprite3", "sprite4", "sprite5", "sprite6", "sprite7", "sprite8"];
const JUMP_FRAMES = ["jump1", "jump2", "jump3", "jump4", "jump5", "jump6"];
const SLIDE_FRAMES = ["slide1", "slide2", "slide3"];
const HIT_FRAMES = ["sprite9", "sprite10"];
const HIT_JUMP_FRAMES = ["jump7", "jump8"];
const HIT_SLIDE_FRAMES = ["slide14", "slide15"];

type PlayerPose = "run" | "jump" | "slide" | "hit" | "hit-jump" | "hit-slide";

export class Player extends Phaser.Physics.Arcade.Sprite {
  private jumpsRemaining = 2;
  private isSliding = false;
  private isHit = false;
  private hitTimer?: Phaser.Time.TimerEvent;
  private pose?: PlayerPose;
  private readonly groundY: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const tex = Player.ensureTexture(scene);
    super(scene, x, y, tex, scene.textures.exists(AssetKey.Player) ? RUN_FRAMES[0] : undefined);
    this.groundY = y;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    Player.ensureAnimations(scene);

    this.setOrigin(0.5, 1);
    this.setDepth(70);

    const body = this.body as Phaser.Physics.Arcade.Body;
    this.applyPose("run");
    body.setCollideWorldBounds(true);
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
      frames: Player.frameRefs(JUMP_FRAMES, AssetKey.PlayerJump),
      frameRate: 15,
      repeat: -1,
    });

    scene.anims.create({
      key: ANIM_SLIDE,
      frames: Player.frameRefs(SLIDE_FRAMES, AssetKey.PlayerSlide),
      frameRate: 8,
      repeat: -1,
    });

    scene.anims.create({
      key: ANIM_HIT,
      frames: Player.frameRefs(HIT_FRAMES),
      frameRate: 8,
      repeat: -1,
    });

    scene.anims.create({
      key: ANIM_HIT_JUMP,
      frames: Player.frameRefs(HIT_JUMP_FRAMES, AssetKey.PlayerJump),
      frameRate: 8,
      repeat: -1,
    });

    scene.anims.create({
      key: ANIM_HIT_SLIDE,
      frames: Player.frameRefs(HIT_SLIDE_FRAMES, AssetKey.PlayerSlide),
      frameRate: 8,
      repeat: -1,
    });
  }

  private static frameRefs(frames: string[], key: string = AssetKey.Player): Phaser.Types.Animations.AnimationFrame[] {
    return frames.map((frame) => ({ key, frame }));
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
    if (!this.isGrounded(body)) return false;

    this.snapToGround();
    this.isSliding = true;
    this.applyPose("slide");
    this.snapToGround();
    return true;
  }

  public endSlide(): void {
    if (!this.isSliding) return;
    this.isSliding = false;
    this.applyPose("run");
    this.snapToGround();
  }

  public playHit(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.isHit = true;
    this.hitTimer?.remove(false);
    this.pose = undefined;

    if (this.isSliding) {
      this.endSlide();
      this.pose = undefined; // Clear the pose set by endSlide
      this.applyPose("hit-slide");
    } else if (this.isGrounded(body)) {
      this.applyPose("hit");
    } else {
      this.applyPose("hit-jump");
    }
    this.hitTimer = this.scene.time.delayedCall(HIT_ANIM_DURATION_MS, () => {
      this.isHit = false;
      this.pose = undefined;
    });
  }

  public override update(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    // Prevent player from falling below the ground when hit
    if (this.y >= this.groundY && body.velocity.y >= 0) {
      this.snapToGround();
    }

    if (this.isHit) return;

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
    return !isRising && this.y >= this.groundY - GROUND_EPSILON;
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

    switch (pose) {
      case "hit-slide":
        this.playIfLoaded(ANIM_HIT_SLIDE);
        this.updateSizeAndHitbox(PLAYER_WIDTH_SLIDE, PLAYER_HEIGHT_SLIDE);
        break;
      case "hit-jump":
        this.playIfLoaded(ANIM_HIT_JUMP);
        this.updateSizeAndHitbox(PLAYER_WIDTH_JUMP, PLAYER_HEIGHT_JUMP);
        break;
      case "hit":
        this.playIfLoaded(ANIM_HIT);
        this.updateSizeAndHitbox(PLAYER_WIDTH, PLAYER_HEIGHT_STAND);
        break;
      case "slide":
        this.playIfLoaded(ANIM_SLIDE);
        this.updateSizeAndHitbox(PLAYER_WIDTH_SLIDE, PLAYER_HEIGHT_SLIDE);
        break;
      case "jump":
        this.playIfLoaded(ANIM_JUMP);
        this.updateSizeAndHitbox(PLAYER_WIDTH_JUMP, PLAYER_HEIGHT_JUMP);
        break;
      case "run":
      default:
        this.playIfLoaded(ANIM_RUN);
        this.updateSizeAndHitbox(PLAYER_WIDTH, PLAYER_HEIGHT_STAND);
        break;
    }
  }

  private playIfLoaded(key: string): void {
    if (this.scene.anims.exists(key) && this.anims.currentAnim?.key !== key) {
      this.play(key);
    }
  }

  public get sliding(): boolean {
    return this.isSliding;
  }

  private updateSizeAndHitbox(targetWidth: number, targetHeight: number): void {
    // 1. 화면 표시 크기는 그대로 적용
    this.setDisplaySize(targetWidth, targetHeight);

    // 💡 히트박스를 시각적 크기의 몇 %로 할지 결정합니다 (예: 80%)
    const HITBOX_RATIO_X = 0.6;
    const HITBOX_RATIO_Y = 0.8; // 세로는 너무 많이 줄이면 바닥 판정이 어색해질 수 있어 90%로 설정

    // 2. 스케일 역산 후 비율(Ratio)을 곱해 히트박스를 축소
    const scaledWidth = (targetWidth / this.scaleX) * HITBOX_RATIO_X;
    const scaledHeight = (targetHeight / this.scaleY) * HITBOX_RATIO_Y;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(scaledWidth, scaledHeight);

    // 3. 줄어든 히트박스에 맞춰 오프셋 재계산 (히트박스가 하단 중앙에 오도록 유지)
    const offsetX = (this.width - scaledWidth) / 2;
    const offsetY = this.height - scaledHeight;
    body.setOffset(offsetX, offsetY);
  }
}
