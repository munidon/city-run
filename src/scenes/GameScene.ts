import * as Phaser from "phaser";
import { AssetKey } from "@/assets";
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
import { RunState } from "@/state/RunState";

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
  private run!: RunState;
  private stageCoinDelta = 0;

  // 배경 이미지 전체를 위아래로 조절하여 캐릭터의 발(GROUND_Y)에 맞추기 위한 변수 (양수: 위로 이동, 음수: 아래로 이동)
  private readonly bgOffsetY = 0;

  constructor() {
    super("GameScene");
  }

  init(data: { run?: RunState }): void {
    this.run = data?.run ?? new RunState();
  }

  create(): void {
    this.gameOver = false;
    this.cleared = false;
    this.elapsedSec = 0;
    this.coins = 0;
    this.stageCoinDelta = 0;
    this.iframesUntil = 0;
    this.quizActive = false;

    this.createBackground();
    this.createGround();

    this.player = new Player(this, PLAYER_X, GROUND_Y);
    this.physics.add.collider(this.player, this.groundBody);

    const maxHp = this.run.maxHp;
    this.health = new HealthSystem(maxHp, 1.5);
    if (this.run.pendingFullHeal) {
      this.health.reset();
    } else if (this.run.pendingStartHpRatio !== null) {
      this.health.damage(maxHp * (1 - this.run.pendingStartHpRatio));
    }
    this.stage = new StageSystem();
    this.disaster = new DisasterSystem();

    this.obstacles = new ObstacleSpawner(
      this,
      () => this.stage.progress,
      () => this.currentSpeed(),
      this.run.obstacleDensityMul,
    );
    this.items = new ItemSpawner(this, () => this.currentSpeed());

    this.physics.add.collider(this.obstacles.group, this.groundBody);

    this.physics.add.overlap(this.player, this.obstacles.group, this.handleObstacleHit, undefined, this);
    this.physics.add.overlap(this.player, this.items.itemGroup, this.handleItemPickup, undefined, this);
    this.physics.add.overlap(this.player, this.items.scrollGroup, this.handleScrollPickup, undefined, this);

    this.hud = new HUD(this);
    this.health.onChange((cur, max) => this.hud.setHealth(cur, max));
    this.stage.onChange((p) => this.hud.setProgress(p));
    this.stage.onCheckpoint((cp) => this.handleCheckpoint(cp));
    this.hud.setStageLabel(`Stage 1-${this.run.stageIndex}`);
    this.hud.setCoins(this.run.totalCoins);

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

    this.createMobileUI();

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
    this.bgFar.tilePositionX += (speed * 0.2 * delta) / 1000 / this.bgFar.tileScaleX;
    this.bgNear.tilePositionX += (speed * 0.5 * delta) / 1000 / this.bgNear.tileScaleX;
    this.ground.tilePositionX += (speed * delta) / 1000 / this.ground.tileScaleX;

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
    const stageBoost = 1 + (this.run.stageIndex - 1) * 0.07;
    return BASE_SPEED * this.stage.speedMultiplier * (1 + this.disaster.speedBonus) * stageBoost;
  }

  private handleObstacleHit(_player: unknown, obstacleObj: unknown): void {
    const obs = obstacleObj as Obstacle;
    if (obs.consumed) return;
    if (this.time.now < this.iframesUntil) return;

    obs.consumed = true;
    this.iframesUntil = this.time.now + COLLISION_IFRAMES_MS;
    this.health.damage(obs.damagePct);
    this.player.playHit();
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

    if (item.healPct > 0) {
      const heal = item.healPct * this.run.healMul * this.run.pendingRewardMul;
      this.health.heal(heal);
    }
    if (item.coins > 0) {
      const coinMul = this.run.coinMul * this.run.pendingRewardMul * (this.run.pendingDoubleCoin ? 2 : 1);
      const earned = Math.round(item.coins * coinMul);
      this.coins += earned;
      this.stageCoinDelta += earned;
      this.hud.setCoins(this.run.totalCoins + this.stageCoinDelta);
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
        const coinMul = this.run.coinMul * this.run.pendingRewardMul * (this.run.pendingDoubleCoin ? 2 : 1);
        const bonus = Math.round(QUIZ_BONUS_COINS * coinMul);
        this.coins += bonus;
        this.stageCoinDelta += bonus;
        this.hud.setCoins(this.run.totalCoins + this.stageCoinDelta);
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
    const farKey = this.textures.exists(AssetKey.BackgroundBack)
      ? AssetKey.BackgroundBack
      : this.makeStripeTexture("__bg_far", 0x14182b, 0x1c2240, 64);
    const nearKey = this.textures.exists(AssetKey.BackgroundMid)
      ? AssetKey.BackgroundMid
      : this.makeStripeTexture("__bg_near", 0x232a4a, 0x2d3560, 96);

    this.bgFar = this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, farKey)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(0);
    const farScale = GAME_HEIGHT / this.textureHeight(farKey, GAME_HEIGHT);
    this.bgFar.tileScaleX = farScale;
    this.bgFar.tileScaleY = farScale;
    this.bgFar.tilePositionY = this.bgOffsetY;

    this.bgNear = this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, nearKey)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1);
    const nearScale = GAME_HEIGHT / this.textureHeight(nearKey, GAME_HEIGHT);
    this.bgNear.tileScaleX = nearScale;
    this.bgNear.tileScaleY = nearScale;
    const bgNearOffsetY = this.bgOffsetY - 20;
    this.bgNear.tilePositionY = bgNearOffsetY;
  }

  private createGround(): void {
    const groundTex = this.textures.exists(AssetKey.Road)
      ? AssetKey.Road
      : this.makeStripeTexture("__ground", 0x2e2a1f, 0x3c3826, 64);
    const roadSizeMultiplier = 0.8;
    const groundScale = (GAME_HEIGHT / this.textureHeight(groundTex, GAME_HEIGHT)) * roadSizeMultiplier;

    // 스케일이 적용된 실제 이미지의 세로 높이입니다.
    // 타일 스프라이트의 높이를 이 값과 똑같이 맞춰야 이미지가 위아래로 반복(타일링)되지 않습니다.
    const scaledTexHeight = this.textureHeight(groundTex, GAME_HEIGHT) * groundScale;

    // 💡 도로의 상하 위치를 조절하는 값입니다. (양수면 아래로, 음수면 위로 이동)
    // 도로가 너무 위에 떠 있다면 이 값을 늘려보세요 (예: 150, 200 등)
    const roadOffsetY = 150;
    const startY = GAME_HEIGHT - scaledTexHeight + roadOffsetY;

    this.ground = this.add
      .tileSprite(0, startY, GAME_WIDTH, scaledTexHeight, groundTex)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2);

    this.ground.tileScaleX = groundScale;
    this.ground.tileScaleY = groundScale;

    this.groundBody = this.physics.add.staticBody(0, GROUND_Y, GAME_WIDTH, GROUND_HEIGHT);
  }

  private textureHeight(key: string, fallback: number): number {
    const image = this.textures.get(key).getSourceImage() as { height?: number } | null;
    return image?.height && image.height > 0 ? image.height : fallback;
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
    kb?.on("keyup-DOWN", this.tryEndSlide, this);
    kb?.on("keyup-S", this.tryEndSlide, this);
    kb?.on("keydown-ESC", this.returnToMenu, this);
    kb?.on("keydown-R", this.restart, this);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
  }

  private teardownInput(): void {
    const kb = this.input.keyboard;
    kb?.off("keydown-SPACE", this.tryJump, this);
    kb?.off("keydown-UP", this.tryJump, this);
    kb?.off("keydown-W", this.tryJump, this);
    kb?.off("keydown-DOWN", this.trySlide, this);
    kb?.off("keydown-S", this.trySlide, this);
    kb?.off("keyup-DOWN", this.tryEndSlide, this);
    kb?.off("keyup-S", this.tryEndSlide, this);
    kb?.off("keydown-ESC", this.returnToMenu, this);
    kb?.off("keydown-R", this.restart, this);
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
  }

  private tryJump(): void {
    if (this.gameOver || this.cleared || this.quizActive) return;
    this.player.jump();
  }

  private trySlide(): void {
    if (this.gameOver || this.cleared || this.quizActive) return;
    this.player.slide();
  }

  private tryEndSlide(): void {
    if (this.gameOver || this.cleared || this.quizActive) return;
    this.player.endSlide();
  }

  private onPointerDown(_p: Phaser.Input.Pointer): void {
    if (this.quizActive) return;
    if (this.cleared) return;
    if (this.gameOver) {
      this.restart();
      return;
    }
  }

  private handleDeath(): void {
    this.gameOver = true;
    this.showOverlay("💀 사망", `획득 코인: ${this.coins}\n탭 또는 R: 재시작 / ESC: 메뉴`);
  }

  private handleCheckpoint(cp: number): void {
    this.health.heal(10);
    this.iframesUntil = this.time.now + 500;
    const label = `🛟 체크포인트 ${Math.round(cp * 100)}%  +10 HP`;
    this.hud.setDisasterStatus(label);
    this.time.delayedCall(1200, () => {
      if (this.disaster.isActive) return;
      this.hud.setDisasterStatus("");
    });
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
    this.run.totalCoins += this.stageCoinDelta;
    this.run.consumeOneShots();
    this.showOverlay(
      "✨ 스테이지 클리어",
      `이번 스테이지 +${this.stageCoinDelta} 코인 (누적 ${this.run.totalCoins})\n탭 / Space — 카드 선택`,
    );
    const advance = () => this.scene.start("CardSelectScene", { run: this.run });
    this.input.keyboard?.once("keydown-SPACE", advance);
    this.input.keyboard?.once("keydown-ENTER", advance);
    this.time.delayedCall(800, () => {
      this.input.once(Phaser.Input.Events.POINTER_DOWN, advance);
    });
  }

  private showOverlay(title: string, subtitle: string): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const overlay = this.add.graphics().setDepth(2000).setScrollFactor(0);
    overlay.fillStyle(0x000000, 0.55);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.add
      .text(cx, cy - 40, title, {
        fontFamily: "'Ramche', system-ui, sans-serif",
        fontSize: "64px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(2001)
      .setScrollFactor(0);

    this.add
      .text(cx, cy + 50, subtitle, {
        fontFamily: "'Ramche', system-ui, sans-serif",
        fontSize: "22px",
        color: "#cccccc",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(2001)
      .setScrollFactor(0);
  }

  private restart(): void {
    if (this.gameOver) {
      this.run.reset();
    }
    this.scene.start("GameScene", { run: this.run });
  }

  private returnToMenu(): void {
    this.run.reset();
    this.scene.start("MainMenuScene");
  }
  private createMobileUI(): void {
    // 데스크탑 환경이면 버튼을 만들지 않음
    if (this.sys.game.device.os.desktop) return;

    // 양쪽 버튼 동시 터치를 위한 멀티 터치 활성화
    this.input.addPointer(1);

    // --- 왼쪽 JUMP 버튼 ---
    const jumpX = GAME_WIDTH * 0.15;
    const jumpY = GAME_HEIGHT * 0.85;
    const jumpBtn = this.add.circle(jumpX, jumpY, 70, 0xffffff, 0.3)
      .setScrollFactor(0)
      .setDepth(2000)
      .setInteractive();

    this.add.text(jumpX, jumpY, "JUMP", { fontSize: "24px", color: "#ffffff", fontStyle: "bold" })
      .setOrigin(0.5).setScrollFactor(0).setDepth(2001);

    jumpBtn.on('pointerdown', () => {
      jumpBtn.setAlpha(0.6);
      this.tryJump();
    });
    jumpBtn.on('pointerup', () => jumpBtn.setAlpha(0.3));
    jumpBtn.on('pointerout', () => jumpBtn.setAlpha(0.3));

    // --- 오른쪽 SLIDE 버튼 ---
    const slideX = GAME_WIDTH * 0.85;
    const slideY = GAME_HEIGHT * 0.85;
    const slideBtn = this.add.circle(slideX, slideY, 70, 0xffffff, 0.3)
      .setScrollFactor(0)
      .setDepth(2000)
      .setInteractive();

    this.add.text(slideX, slideY, "SLIDE", { fontSize: "24px", color: "#ffffff", fontStyle: "bold" })
      .setOrigin(0.5).setScrollFactor(0).setDepth(2001);

    slideBtn.on('pointerdown', () => {
      slideBtn.setAlpha(0.6);
      this.trySlide();
    });
    slideBtn.on('pointerup', () => {
      slideBtn.setAlpha(0.3);
      this.tryEndSlide();
    });
    slideBtn.on('pointerout', () => {
      slideBtn.setAlpha(0.3);
      this.tryEndSlide();
    });
  }
}
