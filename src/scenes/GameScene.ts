import * as Phaser from "phaser";
import { BASE_SPEED, GAME_HEIGHT, GAME_WIDTH, GROUND_HEIGHT, GROUND_Y, PLAYER_X } from "@/config";
import { Player } from "@/objects/Player";
import { Obstacle } from "@/objects/Obstacle";
import { Item } from "@/objects/Item";
import { Scroll } from "@/objects/Scroll";
import { ChaseShadow } from "@/objects/ChaseShadow";
import { HealthSystem } from "@/systems/HealthSystem";
import { StageSystem } from "@/systems/StageSystem";
import { ObstacleSpawner } from "@/systems/ObstacleSpawner";
import { ItemSpawner } from "@/systems/ItemSpawner";
import { DisasterSystem } from "@/systems/DisasterSystem";
import { HUD } from "@/ui/HUD";
import { QuizModal } from "@/ui/QuizModal";
import { pickRandomQuiz } from "@/data/quizzes";

const SWIPE_THRESHOLD_PX = 40;
const COLLISION_IFRAMES_MS = 700;
const QUIZ_BONUS_COINS = 50;

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private health!: HealthSystem;
  private stage!: StageSystem;
  private hud!: HUD;
  private obstacles!: ObstacleSpawner;
  private items!: ItemSpawner;
  private disaster!: DisasterSystem;

  private bgFar!: Phaser.GameObjects.TileSprite;
  private bgNear!: Phaser.GameObjects.TileSprite;
  private ground!: Phaser.GameObjects.TileSprite;
  private groundBody!: Phaser.Physics.Arcade.StaticBody;

  private gameOver = false;
  private cleared = false;
  private elapsedSec = 0;
  private coins = 0;
  private iframesUntil = 0;
  private quizActive = false;
  private quiz?: QuizModal;
  private chase?: ChaseShadow;

  private touchStart?: { x: number; y: number; time: number };

  constructor() {
    super("GameScene");
  }

  create(): void {
    this.gameOver = false;
    this.cleared = false;
    this.elapsedSec = 0;
    this.coins = 0;
    this.iframesUntil = 0;
    this.quizActive = false;

    this.createBackground();
    this.createGround();

    this.player = new Player(this, PLAYER_X, GROUND_Y);
    this.physics.add.collider(this.player, this.groundBody);

    this.health = new HealthSystem(100, 1.5);
    this.stage = new StageSystem();
    this.disaster = new DisasterSystem();

    this.obstacles = new ObstacleSpawner(this, () => this.stage.progress, () => this.currentSpeed());
    this.items = new ItemSpawner(this, () => this.currentSpeed());

    this.physics.add.collider(this.obstacles.group, this.groundBody);

    this.physics.add.overlap(this.player, this.obstacles.group, this.handleObstacleHit, undefined, this);
    this.physics.add.overlap(this.player, this.items.itemGroup, this.handleItemPickup, undefined, this);
    this.physics.add.overlap(this.player, this.items.scrollGroup, this.handleScrollPickup, undefined, this);

    this.hud = new HUD(this);
    this.health.onChange((cur, max) => this.hud.setHealth(cur, max));
    this.stage.onChange((p) => this.hud.setProgress(p));
    this.hud.setStageLabel("Stage 1-1 (PoC)");
    this.hud.setCoins(0);

    this.disaster.onTrigger(() => {
      this.hud.setDisasterStatus("⚠ 재난 가속 — 두루마리를 찾아라!");
      this.cameras.main.shake(400, 0.005);
      this.chase?.destroy();
      this.chase = new ChaseShadow(this);
    });
    this.disaster.onSpawnScroll(() => {
      if (this.gameOver || this.cleared) return;
      this.items.spawnScroll();
    });
    this.disaster.onResolve(() => {
      this.hud.setDisasterStatus("✓ 재난 해소");
      this.time.delayedCall(1500, () => this.hud.setDisasterStatus(""));
      this.chase?.hide();
      this.chase = undefined;
    });

    this.bindInput();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.teardownInput();
      this.quiz?.destroy();
    });
  }

  override update(_time: number, delta: number): void {
    if (this.gameOver || this.cleared || this.quizActive) return;

    this.elapsedSec += delta / 1000;
    this.hud.setElapsed(this.elapsedSec);

    this.health.tick(delta);
    this.stage.tick(delta);
    this.disaster.tick(delta, this.stage.progress);

    const speed = this.currentSpeed();
    this.bgFar.tilePositionX += (speed * 0.2 * delta) / 1000;
    this.bgNear.tilePositionX += (speed * 0.5 * delta) / 1000;
    this.ground.tilePositionX += (speed * delta) / 1000;

    this.obstacles.update(delta);
    this.items.update(delta);

    if (this.chase) {
      this.chase.setX(this.disaster.chasePosition);
      this.chase.update(delta);
      const playerLeftEdge = this.player.x - 28;
      if (this.disaster.chasePosition >= playerLeftEdge && !this.disaster.hasResolved) {
        this.handleChaseCaught();
        return;
      }
    }

    this.player.update();

    if (this.health.isDead) this.handleDeath();
    else if (this.stage.complete) this.handleClear();
  }

  private currentSpeed(): number {
    return BASE_SPEED * this.stage.speedMultiplier * (1 + this.disaster.speedBonus);
  }

  private handleObstacleHit(_player: unknown, obstacleObj: unknown): void {
    const obs = obstacleObj as Obstacle;
    if (obs.consumed) return;
    if (this.time.now < this.iframesUntil) return;

    obs.consumed = true;
    this.iframesUntil = this.time.now + COLLISION_IFRAMES_MS;
    this.health.damage(obs.damagePct);
    this.flashHit();
    this.cameras.main.shake(120, 0.006);

    obs.setTint(0xff8888);
    this.tweens.add({
      targets: obs,
      alpha: 0,
      duration: 200,
      onComplete: () => obs.destroy(),
    });
  }

  private handleItemPickup(_player: unknown, itemObj: unknown): void {
    const item = itemObj as Item;
    if (item.consumed) return;
    item.consumed = true;

    if (item.healPct > 0) this.health.heal(item.healPct);
    if (item.coins > 0) {
      this.coins += item.coins;
      this.hud.setCoins(this.coins);
    }

    this.tweens.add({
      targets: item,
      y: item.y - 40,
      alpha: 0,
      duration: 250,
      onComplete: () => item.destroy(),
    });
  }

  private handleScrollPickup(_player: unknown, scrollObj: unknown): void {
    const scroll = scrollObj as Scroll;
    if (scroll.consumed || this.quizActive) return;
    scroll.consumed = true;
    scroll.destroy();
    this.openQuiz();
  }

  private openQuiz(): void {
    this.quizActive = true;
    this.physics.world.pause();
    this.obstacles.pause(true);
    this.items.pause(true);

    const question = pickRandomQuiz();
    this.quiz = new QuizModal(this, question, (result) => {
      this.quiz = undefined;
      if (result === "correct") {
        this.coins += QUIZ_BONUS_COINS;
        this.hud.setCoins(this.coins);
        this.disaster.resolve();
      }
      this.physics.world.resume();
      this.obstacles.pause(false);
      this.items.pause(false);
      this.quizActive = false;
    });
  }

  private flashHit(): void {
    const flash = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xff0000, 0.25)
      .setScrollFactor(0)
      .setDepth(1500);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 200,
      onComplete: () => flash.destroy(),
    });
  }

  private createBackground(): void {
    const farKey = this.makeStripeTexture("__bg_far", 0x14182b, 0x1c2240, 64);
    const nearKey = this.makeStripeTexture("__bg_near", 0x232a4a, 0x2d3560, 96);

    this.bgFar = this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, farKey)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(0);
    this.bgNear = this.add
      .tileSprite(0, GAME_HEIGHT * 0.4, GAME_WIDTH, GAME_HEIGHT * 0.6, nearKey)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1)
      .setAlpha(0.85);
  }

  private createGround(): void {
    const groundTex = this.makeStripeTexture("__ground", 0x2e2a1f, 0x3c3826, 64);
    this.ground = this.add
      .tileSprite(0, GROUND_Y, GAME_WIDTH, GROUND_HEIGHT, groundTex)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2);

    this.groundBody = this.physics.add.staticBody(0, GROUND_Y, GAME_WIDTH, GROUND_HEIGHT);
  }

  private makeStripeTexture(key: string, c1: number, c2: number, size: number): string {
    if (this.textures.exists(key)) return key;
    const g = this.add.graphics({ x: 0, y: 0 });
    g.fillStyle(c1, 1);
    g.fillRect(0, 0, size, size);
    g.fillStyle(c2, 1);
    g.fillRect(0, size / 2, size, size / 2);
    g.generateTexture(key, size, size);
    g.destroy();
    return key;
  }

  private bindInput(): void {
    const kb = this.input.keyboard;
    kb?.on("keydown-SPACE", this.tryJump, this);
    kb?.on("keydown-UP", this.tryJump, this);
    kb?.on("keydown-W", this.tryJump, this);
    kb?.on("keydown-DOWN", this.trySlide, this);
    kb?.on("keydown-S", this.trySlide, this);
    kb?.on("keydown-ESC", this.returnToMenu, this);
    kb?.on("keydown-R", this.restart, this);

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
  }

  private teardownInput(): void {
    const kb = this.input.keyboard;
    kb?.off("keydown-SPACE", this.tryJump, this);
    kb?.off("keydown-UP", this.tryJump, this);
    kb?.off("keydown-W", this.tryJump, this);
    kb?.off("keydown-DOWN", this.trySlide, this);
    kb?.off("keydown-S", this.trySlide, this);
    kb?.off("keydown-ESC", this.returnToMenu, this);
    kb?.off("keydown-R", this.restart, this);
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.input.off(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
  }

  private tryJump(): void {
    if (this.gameOver || this.cleared || this.quizActive) return;
    this.player.jump();
  }

  private trySlide(): void {
    if (this.gameOver || this.cleared || this.quizActive) return;
    this.player.slide();
  }

  private onPointerDown(p: Phaser.Input.Pointer): void {
    if (this.quizActive) return;
    if (this.gameOver || this.cleared) {
      this.restart();
      return;
    }
    this.touchStart = { x: p.x, y: p.y, time: p.downTime };
  }

  private onPointerUp(p: Phaser.Input.Pointer): void {
    if (this.quizActive) return;
    if (!this.touchStart) return;
    const dx = p.x - this.touchStart.x;
    const dy = p.y - this.touchStart.y;
    this.touchStart = undefined;

    if (dy > SWIPE_THRESHOLD_PX && Math.abs(dy) > Math.abs(dx)) {
      this.trySlide();
      return;
    }
    this.tryJump();
  }

  private handleDeath(): void {
    this.gameOver = true;
    this.showOverlay("💀 사망", `획득 코인: ${this.coins}\n탭 또는 R: 재시작 / ESC: 메뉴`);
  }

  private handleChaseCaught(): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.health.damage(999);
    this.cameras.main.shake(600, 0.012);
    this.cameras.main.flash(400, 255, 60, 30);
    this.showOverlay("🔥 재난에 휩쓸림", `획득 코인: ${this.coins}\n탭 또는 R: 재시작 / ESC: 메뉴`);
  }

  private handleClear(): void {
    this.cleared = true;
    this.showOverlay("✨ 스테이지 클리어", `획득 코인: ${this.coins}\n탭 또는 R: 재시작 / ESC: 메뉴`);
  }

  private showOverlay(title: string, subtitle: string): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const overlay = this.add.graphics().setDepth(2000).setScrollFactor(0);
    overlay.fillStyle(0x000000, 0.55);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.add
      .text(cx, cy - 40, title, {
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: "64px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(2001)
      .setScrollFactor(0);

    this.add
      .text(cx, cy + 50, subtitle, {
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: "22px",
        color: "#cccccc",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(2001)
      .setScrollFactor(0);
  }

  private restart(): void {
    this.scene.restart();
  }

  private returnToMenu(): void {
    this.scene.start("MainMenuScene");
  }
}
