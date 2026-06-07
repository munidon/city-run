import * as Phaser from "phaser";
import { AssetKey, SoundKey } from "@/assets";
import { BASE_SPEED, DESPAWN_X, GAME_HEIGHT, GAME_WIDTH, GROUND_HEIGHT, GROUND_Y, PLAYER_X, SPAWN_X } from "@/config";
import { Player } from "@/objects/Player";
import { Obstacle } from "@/objects/Obstacle";
import { Item } from "@/objects/Item";
import { Platform } from "@/objects/Platform";
import { Scroll } from "@/objects/Scroll";
import { ChaseShadow } from "@/objects/ChaseShadow";
import { FloodWater } from "@/objects/FloodWater";
import { HealthSystem } from "@/systems/HealthSystem";
import { StageSystem } from "@/systems/StageSystem";
import { DisasterSystem } from "@/systems/DisasterSystem";
import { RandomSpawnSystem } from "@/systems/RandomSpawnSystem";
import { SegmentManager } from "@/systems/SegmentManager";
import { MapSegment } from "@/data/segments";
import { getBgmVolume } from "@/settings";
import { HUD } from "@/ui/HUD";
import { QuizModal } from "@/ui/QuizModal";
import { CHAPTER_1_QUIZZES, FLOOD_QUIZZES, pickRandomQuiz } from "@/data/quizzes";
import type { QuizQuestion } from "@/data/quizzes";
import { RunState } from "@/state/RunState";
import { disasterForStage, disasterLabel } from "@/data/disasters";
import type { DisasterKind } from "@/data/disasters";
import { makeButton } from "@/ui/button";

const COLLISION_IFRAMES_MS = 700;
const CHASE_DAMAGE = 50;
const FLOOD_DAMAGE = 10;
const FLOOD_DAMAGE_INTERVAL_MS = 1000;
const FLOOD_AUTO_RESOLVE_DAMAGE = 40;
const QUIZ_BONUS_COINS = 50;
const ENERGY_BOOST_DURATION_MS = 5000;
const ENERGY_SPEED_MULTIPLIER = 2;
const HEAL_INVINCIBILITY_MS = 3000;
const MAGNET_BASE_RADIUS = 190;
const MAGNET_PULL_SPEED = 650;
const ENERGY_PARTICLE_KEY = "__energy_boost_particle";
const PAUSE_DEPTH = 1900;

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private health!: HealthSystem;
  private stage!: StageSystem;
  private hud!: HUD;
  private disaster!: DisasterSystem;
  private segments!: SegmentManager;
  private randomSpawns!: RandomSpawnSystem;
  private scrollGroup!: Phaser.Physics.Arcade.Group;
  private testSegment?: MapSegment;

  private bgFar!: Phaser.GameObjects.TileSprite;
  private bgNear!: Phaser.GameObjects.TileSprite;
  private ground!: Phaser.GameObjects.TileSprite;
  private groundBody!: Phaser.Physics.Arcade.StaticBody;
  private bgm?: Phaser.Sound.BaseSound;

  private gameOver = false;
  private cleared = false;
  private elapsedSec = 0;
  private coins = 0;
  private iframesUntil = 0;
  private quizActive = false;
  private quiz?: QuizModal;
  private chase?: ChaseShadow;
  private floodWater?: FloodWater;
  private run!: RunState;
  private stageCoinDelta = 0;
  private energyBoostUntil = 0;
  private energyStatusTimer?: Phaser.Time.TimerEvent;
  private energyBoostEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  private usedQuizIds = new Set<string>();
  private isGamePaused = false;
  private pauseButton?: Phaser.GameObjects.Container;
  private pauseOverlay?: Phaser.GameObjects.Container;
  private confirmOverlay?: Phaser.GameObjects.Container;
  private countdownText?: Phaser.GameObjects.Text;
  private resumeCountdownTimer?: number;
  private pausedRealAt = 0;
  private touchingFloodWater = false;
  private nextFloodDamageAt = 0;
  private floodDamageTaken = 0;

  // 배경 이미지 전체를 위아래로 조절하여 캐릭터의 발(GROUND_Y)에 맞추기 위한 변수 (양수: 위로 이동, 음수: 아래로 이동)
  private readonly bgOffsetY = 0;

  constructor() {
    super("GameScene");
  }

  init(data: { run?: RunState; testSegment?: MapSegment }): void {
    this.run = data?.run ?? new RunState();
    this.testSegment = data?.testSegment;
  }

  create(): void {
    this.gameOver = false;
    this.cleared = false;
    this.elapsedSec = 0;
    this.coins = 0;
    this.stageCoinDelta = 0;
    this.iframesUntil = 0;
    this.quizActive = false;
    this.touchingFloodWater = false;
    this.nextFloodDamageAt = 0;
    this.floodDamageTaken = 0;
    this.energyBoostUntil = 0;
    this.energyStatusTimer?.remove(false);
    this.energyStatusTimer = undefined;
    this.energyBoostEmitter?.destroy();
    this.energyBoostEmitter = undefined;
    this.usedQuizIds.clear();
    this.isGamePaused = false;
    this.clearResumeCountdown();
    this.pauseOverlay?.destroy();
    this.pauseOverlay = undefined;
    this.confirmOverlay?.destroy();
    this.confirmOverlay = undefined;
    this.countdownText?.destroy();
    this.countdownText = undefined;
    this.floodWater?.destroy();
    this.floodWater = undefined;
    const disasterKind = disasterForStage(this.run.stageIndex);

    this.createBackground(disasterKind);
    this.createGround();

    this.player = new Player(this, PLAYER_X, GROUND_Y);
    this.physics.add.collider(this.player, this.groundBody);

    const maxHp = this.run.maxHp;
    this.health = new HealthSystem(maxHp, 1.5);
    const carriedHp = this.run.currentHp ?? maxHp;
    let startHp = carriedHp;
    if (this.run.pendingFullHeal) startHp = maxHp;
    else if (this.run.pendingStartHpRatio !== null) startHp = maxHp * this.run.pendingStartHpRatio;
    else if (this.run.pendingHealRatio !== null) startHp = carriedHp + maxHp * this.run.pendingHealRatio;
    this.health.damage(maxHp - Phaser.Math.Clamp(startHp, 0, maxHp));
    this.stage = new StageSystem();
    this.disaster = new DisasterSystem(disasterKind);
    if (disasterKind === "flood") {
      this.floodWater = new FloodWater(this);
    }

    this.segments = new SegmentManager(
      this,
      () => this.currentSpeed(),
      () => this.stage.progress,
    );
    if (this.testSegment) this.segments.setForcedSegment(this.testSegment);
    this.randomSpawns = new RandomSpawnSystem(
      this,
      this.segments.coinGroup,
      this.segments.obstacleGroup,
      () => this.currentSpeed(),
      () => this.stage.progress,
      () => this.disaster.isActive,
    );
    this.scrollGroup = this.physics.add.group({ classType: Scroll, runChildUpdate: false, allowGravity: false });

    this.physics.add.collider(
      this.player,
      this.segments.platformGroup,
    );

    this.physics.add.overlap(this.player, this.segments.obstacleGroup, this.handleObstacleHit, undefined, this);
    this.physics.add.overlap(this.player, this.segments.coinGroup, this.handleItemPickup, undefined, this);
    this.physics.add.overlap(this.player, this.scrollGroup, this.handleScrollPickup, undefined, this);

    this.hud = new HUD(this);
    this.health.onChange((cur, max) => this.hud.setHealth(cur, max));
    this.stage.onChange((p) => this.hud.setProgress(p));
    this.stage.onCheckpoint((cp) => this.handleCheckpoint(cp));
    this.hud.setStageLabel(`Stage 1-${this.run.stageIndex} · ${disasterLabel(disasterKind)}`);
    this.hud.setCoins(this.run.totalCoins);
    this.createPauseButton();

    this.disaster.onTrigger(() => {
      this.sound.play(SoundKey.DisasterAppear);
      if (this.disaster.kind === "flood") {
        this.floodDamageTaken = 0;
        this.resetFloodContact();
      }
      this.hud.setDisasterStatus(
        this.disaster.kind === "flood"
          ? "🌊 홍수 발생 — 높은 발판과 두루마리를 찾아라!"
          : "⚠ 재난 출현 — 두루마리를 찾아라!",
      );
      this.cameras.main.shake(400, 0.005);
      this.chase?.destroy();
      this.chase = this.disaster.kind === "fire" ? new ChaseShadow(this) : undefined;
    });
    this.disaster.onSpawnScroll(() => {
      if (this.gameOver || this.cleared) return;
      this.spawnScroll();
    });
    this.disaster.onResolve(() => {
      this.hud.setDisasterStatus(this.disaster.kind === "flood" ? "✓ 홍수 수위 하강" : "✓ 재난 해소");
      this.time.delayedCall(1500, () => {
        if (this.isEnergyBoostActive()) return;
        this.hud.setDisasterStatus("");
      });
      this.chase?.hide();
      this.chase = undefined;
    });

    this.bindInput();

    this.createMobileUI();

    this.sound.setVolume(getBgmVolume());
    this.bgm = this.sound.add(SoundKey.Bgm, { loop: true, volume: 1 });
    this.bgm.play();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.clearResumeCountdown();
      this.teardownInput();
      this.energyBoostEmitter?.destroy();
      this.floodWater?.destroy();
      this.quiz?.destroy();
      this.pauseButton?.destroy();
      this.bgm?.stop();
      this.bgm?.destroy();
    });
  }

  override update(_time: number, delta: number): void {
    if (this.gameOver || this.cleared || this.quizActive || this.isGamePaused) return;

    this.elapsedSec += delta / 1000;
    this.hud.setElapsed(this.elapsedSec);

    this.health.tick(delta);
    this.stage.tick(delta * this.progressSpeedMultiplier());
    this.disaster.tick(delta, this.stage.progress);
    this.floodWater?.update(this.disaster.floodLevelY);

    const speed = this.currentSpeed();
    this.bgFar.tilePositionX += (speed * 0.2 * delta) / 1000 / this.bgFar.tileScaleX;
    this.bgNear.tilePositionX += (speed * 0.5 * delta) / 1000 / this.bgNear.tileScaleX;
    this.ground.tilePositionX += (speed * delta) / 1000 / this.ground.tileScaleX;

    this.segments.update(delta);
    this.randomSpawns.update(delta);
    this.updateScrolls();
    this.keepPlayerOnPlatform();
    this.updateMagnetPickups();

    if (this.chase) {
      this.chase.setX(this.disaster.chasePosition);
      this.chase.update();

      // --- 수정된 충돌(사망) 판정 로직 ---
      const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
      const playerRightEdge = playerBody.right; // 플레이어 히트박스의 우측 끝 절대 좌표

      // 불의 정령(재난)의 우측 끝 절대 좌표 계산
      // 불의 정령 스프라이트가 visualX(chasePosition) + 72 위치에 렌더링되고 있으므로,
      // 오프셋을 늘릴 수록 바깥쪽에서 죽음
      const FIRE_OFFSET = 200;
      const fireRightEdge = this.disaster.chasePosition + FIRE_OFFSET;

      // 불길의 오른쪽 끝이 플레이어의 오른쪽 끝을 완전히 덮치면 사망
      if (fireRightEdge >= playerRightEdge && !this.disaster.hasResolved && !this.isEnergyBoostActive()) {
        this.handleChaseCaught();
        return;
      }
    }

    this.updateFloodDamage();

    this.player.update();
    this.updateEnergyBoostParticles();

    if (this.health.isDead) this.handleDeath();
    else if (this.stage.complete) this.handleClear();
  }

  private currentSpeed(): number {
    const stageBoost = 1 + (this.run.stageIndex - 1) * 0.07;
    return (
      BASE_SPEED *
      this.stage.speedMultiplier *
      (1 + this.disaster.speedBonus) *
      stageBoost *
      this.progressSpeedMultiplier()
    );
  }

  private progressSpeedMultiplier(): number {
    return this.isEnergyBoostActive() ? ENERGY_SPEED_MULTIPLIER : 1;
  }

  private isEnergyBoostActive(): boolean {
    return this.time.now < this.energyBoostUntil;
  }

  private handleObstacleHit(_player: unknown, obstacleObj: unknown): void {
    const obs = obstacleObj as Obstacle;
    if (obs.consumed) return;
    if (obs.kind === "fire_smoke" && this.player.sliding) return;

    if (this.isEnergyBoostActive()) {
      obs.consumed = true;
      this.launchObstacle(obs);
      return;
    }

    if (this.time.now < this.iframesUntil) return;

    obs.consumed = true;
    this.iframesUntil = this.time.now + COLLISION_IFRAMES_MS;
    const supportY = this.findCurrentPlatformSupportY();
    this.health.damage(this.obstacleDamage(obs.damagePct));
    this.sound.play(SoundKey.BossHit);
    this.player.playHit();
    if (supportY !== null) this.player.snapToSupport(supportY);
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
      const foodHealMul = item.kind === "gimbap" || item.kind === "bento" ? this.run.healMul : 1;
      const heal = item.healPct * foodHealMul;
      this.health.heal(heal);
      if (this.run.enableHealInvincibility) {
        this.iframesUntil = Math.max(this.iframesUntil, this.time.now + HEAL_INVINCIBILITY_MS);
      }
    }
    if (item.kind === "energy_drink") {
      this.activateEnergyBoost();
    }
    if (item.coins > 0) {
      this.sound.play(SoundKey.Coin);
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

  private activateEnergyBoost(): void {
    this.energyBoostUntil = Math.max(this.energyBoostUntil, this.time.now + ENERGY_BOOST_DURATION_MS);
    this.iframesUntil = Math.max(this.iframesUntil, this.energyBoostUntil);
    this.disaster.suppressFor(ENERGY_BOOST_DURATION_MS);
    this.hud.setDisasterStatus("⚡ 에너지 드링크: 5초 무적 질주");
    this.startEnergyBoostParticles();

    this.energyStatusTimer?.remove(false);
    this.energyStatusTimer = this.time.delayedCall(ENERGY_BOOST_DURATION_MS, () => {
      if (this.isEnergyBoostActive()) {
        this.energyStatusTimer = this.time.delayedCall(this.energyBoostUntil - this.time.now, () => {
          this.stopEnergyBoostParticles();
          if (!this.disaster.isActive) this.hud.setDisasterStatus("");
          this.energyStatusTimer = undefined;
        });
        return;
      }
      this.stopEnergyBoostParticles();
      if (!this.disaster.isActive) this.hud.setDisasterStatus("");
      this.energyStatusTimer = undefined;
    });
  }

  private obstacleDamage(baseDamage: number): number {
    const reductionMul = Math.max(0, 1 - this.run.damageReduction);
    return baseDamage * reductionMul * this.run.damageTakenMul;
  }

  private updateMagnetPickups(): void {
    if (this.run.magnetRange <= 0) return;
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body | null;
    if (!playerBody) return;

    const playerRadius = Math.max(playerBody.width, playerBody.height) / 2;
    const magnetRadius = MAGNET_BASE_RADIUS * (1 + this.run.magnetRange);
    const pullSpeed = MAGNET_PULL_SPEED * (1 + this.run.magnetRange);
    for (const child of this.segments.coinGroup.getChildren()) {
      const item = child as Item;
      if (!item.active || item.consumed) continue;
      const itemBody = item.body as Phaser.Physics.Arcade.Body | null;
      if (!itemBody) continue;

      const itemRadius = Math.max(itemBody.width, itemBody.height) / 2;
      const distance = Phaser.Math.Distance.Between(
        playerBody.center.x,
        playerBody.center.y,
        itemBody.center.x,
        itemBody.center.y,
      );
      const pickupRadius = Math.max(28, playerRadius * 0.45 + itemRadius * 0.35);
      if (distance <= pickupRadius) {
        this.handleItemPickup(this.player, item);
        continue;
      }

      if (distance <= magnetRadius) {
        item.setData("magnetized", true);
        item.setDepth(95);
        const angle = Phaser.Math.Angle.Between(itemBody.center.x, itemBody.center.y, playerBody.center.x, playerBody.center.y);
        itemBody.setVelocity(Math.cos(angle) * pullSpeed, Math.sin(angle) * pullSpeed);
      } else if (item.getData("magnetized")) {
        item.setData("magnetized", false);
        item.setDepth(75);
        itemBody.setVelocity(-this.currentSpeed(), 0);
      }
    }
  }

  private ensureEnergyParticleTexture(): string {
    if (this.textures.exists(ENERGY_PARTICLE_KEY)) return ENERGY_PARTICLE_KEY;

    const g = this.add.graphics({ x: 0, y: 0 });
    g.fillStyle(0xfff14a, 1);
    g.fillCircle(8, 8, 8);
    g.fillStyle(0xffffff, 0.75);
    g.fillCircle(6, 6, 3);
    g.generateTexture(ENERGY_PARTICLE_KEY, 16, 16);
    g.destroy();
    return ENERGY_PARTICLE_KEY;
  }

  private startEnergyBoostParticles(): void {
    if (!this.energyBoostEmitter) {
      this.energyBoostEmitter = this.add
        .particles(0, 0, this.ensureEnergyParticleTexture(), {
          lifespan: { min: 220, max: 420 },
          speedX: { min: -230, max: -90 },
          speedY: { min: -70, max: 70 },
          scale: { start: 0.72, end: 0 },
          alpha: { start: 0.95, end: 0 },
          tint: 0xffd84d,
          quantity: 3,
          frequency: 28,
          blendMode: Phaser.BlendModes.ADD,
          maxAliveParticles: 90,
          emitting: false,
        })
        .setDepth(69);
    }

    this.updateEnergyBoostParticles();
    this.energyBoostEmitter.resume();
    this.energyBoostEmitter.start();
  }

  private stopEnergyBoostParticles(kill = false): void {
    this.energyBoostEmitter?.stop(kill);
  }

  private updateEnergyBoostParticles(): void {
    if (!this.energyBoostEmitter || !this.isEnergyBoostActive()) return;
    const verticalOffset = this.player.sliding ? -38 : -66;
    this.energyBoostEmitter.setPosition(this.player.x - 48, this.player.y + verticalOffset);
  }

  private launchObstacle(obs: Obstacle): void {
    obs.setData("launched", true);
    const body = obs.body as Phaser.Physics.Arcade.Body | null;
    body?.setVelocity(0, 0);
    body?.setEnable(false);
    obs.setTint(0xfff3a3);
    this.tweens.add({
      targets: obs,
      x: obs.x + Phaser.Math.Between(220, 360),
      y: obs.y - Phaser.Math.Between(120, 220),
      angle: obs.angle + Phaser.Math.Between(220, 420),
      alpha: 0,
      duration: 450,
      ease: "Cubic.easeOut",
      onComplete: () => obs.destroy(),
    });
  }

  private handleScrollPickup(_player: unknown, scrollObj: unknown): void {
    const scroll = scrollObj as Scroll;
    if (scroll.consumed || this.quizActive) return;
    scroll.consumed = true;
    this.sound.play(SoundKey.GetScroll);
    scroll.destroy();
    this.openQuiz();
  }

  private spawnScroll(): void {
    const scroll = new Scroll(this, SPAWN_X, GROUND_Y - 120);
    this.scrollGroup.add(scroll);
    const body = scroll.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(-this.currentSpeed());
  }

  private updateScrolls(): void {
    const speed = this.currentSpeed();
    for (const child of this.scrollGroup.getChildren()) {
      const scroll = child as Scroll;
      if (!scroll.active) continue;
      const body = scroll.body as Phaser.Physics.Arcade.Body | null;
      if (!body) continue;
      body.setVelocityX(-speed);
      if (scroll.x < DESPAWN_X) scroll.destroy();
    }
  }

  private pauseScrolls(paused: boolean): void {
    for (const child of this.scrollGroup.getChildren()) {
      const scroll = child as Scroll;
      const body = scroll.body as Phaser.Physics.Arcade.Body | null;
      if (!body) continue;
      if (paused) {
        scroll.setData("pausedVx", body.velocity.x);
        body.setVelocity(0, 0);
      } else {
        body.setVelocityX(scroll.getData("pausedVx") ?? 0);
      }
    }
  }

  private openQuiz(): void {
    this.quizActive = true;
    this.physics.world.pause();
    this.pauseScrolls(true);
    this.segments.pause(true);

    const question = pickRandomQuiz(this.currentQuizPool(), this.usedQuizIds);
    this.usedQuizIds.add(question.id);
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
      this.pauseScrolls(false);
      this.segments.pause(false);
      this.quizActive = false;
    });
  }

  private currentQuizPool(): QuizQuestion[] {
    return this.disaster.kind === "flood" ? FLOOD_QUIZZES : CHAPTER_1_QUIZZES;
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

  private createBackground(disasterKind: DisasterKind): void {
    const preferredFarKey = disasterKind === "flood" ? AssetKey.BackgroundBackFlood : AssetKey.BackgroundBack;
    const preferredNearKey = disasterKind === "flood" ? AssetKey.BackgroundMidFlood : AssetKey.BackgroundMid;
    const farKey = this.textures.exists(preferredFarKey)
      ? preferredFarKey
      : this.makeStripeTexture("__bg_far", 0x14182b, 0x1c2240, 64);
    const nearKey = this.textures.exists(preferredNearKey)
      ? preferredNearKey
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
    const bgNearOffsetY = this.bgOffsetY - 30;
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
    kb?.on("keydown-ESC", this.openPauseMenu, this);
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
    kb?.off("keydown-ESC", this.openPauseMenu, this);
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
  }

  private tryJump(): void {
    if (this.gameOver || this.cleared || this.quizActive || this.isGamePaused) return;
    this.player.jump();
  }

  private trySlide(): void {
    if (this.gameOver || this.cleared || this.quizActive || this.isGamePaused) return;
    this.player.slide();
  }

  private tryEndSlide(): void {
    if (this.gameOver || this.cleared || this.quizActive || this.isGamePaused) return;
    this.player.endSlide();
  }

  private onPointerDown(_p: Phaser.Input.Pointer): void {
    if (this.quizActive || this.isGamePaused) return;
    if (this.cleared) return;
    if (this.gameOver) {
      this.restart();
      return;
    }
  }

  private findCurrentPlatformSupportY(): number | null {
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body | null;
    if (!playerBody) return null;

    let supportY: number | null = null;
    for (const child of this.segments.platformGroup.getChildren()) {
      const platform = child as Platform;
      const platformBody = platform.body as Phaser.Physics.Arcade.Body | null;
      if (!platform.active || !platformBody) continue;

      const overlapsX = playerBody.right > platformBody.left + 8 && playerBody.left < platformBody.right - 8;
      const standingOnTop = playerBody.bottom >= platformBody.top - 14 && playerBody.bottom <= platformBody.top + 42;
      if (!overlapsX || !standingOnTop) continue;
      if (supportY === null || platformBody.top < supportY) supportY = platformBody.top;
    }

    return supportY;
  }

  private keepPlayerOnPlatform(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body | null;
    if (!body || body.velocity.y < -20) return;

    const supportY = this.findCurrentPlatformSupportY();
    if (supportY === null) return;

    this.player.snapToSupport(supportY);
  }

  private createPauseButton(): void {
    const x = GAME_WIDTH - 58;
    const y = 36;
    const bg = this.add
      .rectangle(0, 0, 44, 38, 0x111128, 0.72)
      .setStrokeStyle(1, 0xffffff, 0.35)
      .setInteractive({ useHandCursor: true });
    const icon = this.add
      .text(0, -1, "Ⅱ", {
        fontFamily: "'Ramche', system-ui, sans-serif",
        fontSize: "23px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.pauseButton = this.add.container(x, y, [bg, icon]).setScrollFactor(0).setDepth(1200);
    bg.on("pointerover", () => bg.setAlpha(0.55));
    bg.on("pointerout", () => bg.setAlpha(1));
    bg.on("pointerup", () => {
      this.sound.play(SoundKey.Settings);
      this.openPauseMenu();
    });
  }

  private openPauseMenu(): void {
    if (this.gameOver || this.cleared || this.quizActive || this.isGamePaused) return;

    this.isGamePaused = true;
    this.pausedRealAt = performance.now();
    this.freezeGameplay();
    this.showPauseOverlay();
  }

  private freezeGameplay(): void {
    this.physics.world.pause();
    this.pauseScrolls(true);
    this.segments.pause(true);
    this.tweens.pauseAll();
    this.time.paused = true;
    this.energyBoostEmitter?.pause();
  }

  private startResumeCountdown(): void {
    this.confirmOverlay?.destroy();
    this.confirmOverlay = undefined;
    this.pauseOverlay?.destroy();
    this.pauseOverlay = undefined;

    let count = 3;
    this.countdownText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, String(count), {
        fontFamily: "'Ramche', system-ui, sans-serif",
        fontSize: "108px",
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#111128",
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(PAUSE_DEPTH + 40);

    this.clearResumeCountdown();
    this.resumeCountdownTimer = window.setInterval(() => {
      count -= 1;
      if (count > 0) {
        this.countdownText?.setText(String(count));
        return;
      }
      this.clearResumeCountdown();
      this.countdownText?.destroy();
      this.countdownText = undefined;
      this.resumeGameplay();
    }, 1000);
  }

  private resumeGameplay(): void {
    const pausedDurationMs = Math.max(0, performance.now() - this.pausedRealAt);
    this.energyBoostUntil += pausedDurationMs;
    this.iframesUntil += pausedDurationMs;
    this.time.paused = false;
    this.tweens.resumeAll();
    this.physics.world.resume();
    this.pauseScrolls(false);
    this.segments.pause(false);
    this.isGamePaused = false;
    if (this.isEnergyBoostActive()) this.startEnergyBoostParticles();
  }

  private showPauseOverlay(): void {
    this.pauseOverlay?.destroy();

    const dim = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.45)
      .setScrollFactor(0)
      .setInteractive();
    const title = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 134, "일시정지", {
        fontFamily: "'Ramche', system-ui, sans-serif",
        fontSize: "52px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    const resume = makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, "게임 재개", () => {
      this.startResumeCountdown();
    }, {
      width: 260,
      height: 56,
      bgColor: 0x2d6a4f,
      fontSize: "24px",
      textColor: "#d8f3dc",
      soundKey: SoundKey.GameStart,
    });
    const quit = makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 34, "게임 나가기", () => {
      this.showQuitConfirm();
    }, {
      width: 260,
      height: 56,
      bgColor: 0x5a2a2a,
      fontSize: "24px",
      textColor: "#ffd8d8",
      soundKey: SoundKey.Exit,
    });
    const settings = makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 108, "설정", () => {
      this.openSettingsFromPause();
    }, {
      width: 260,
      height: 56,
      bgColor: 0x2a3a5a,
      fontSize: "24px",
      textColor: "#ffffff",
    });

    this.pauseOverlay = this.add
      .container(0, 0, [dim, title, resume, quit, settings])
      .setScrollFactor(0)
      .setDepth(PAUSE_DEPTH);
  }

  private showQuitConfirm(): void {
    this.confirmOverlay?.destroy();

    const dim = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.62)
      .setScrollFactor(0)
      .setInteractive();
    const panel = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 560, 260, 0x111128, 0.96)
      .setStrokeStyle(1, 0xffffff, 0.25)
      .setScrollFactor(0);
    const msg = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 52, "정말 나가시겠습니까?\n진행 상황은 저장되지 않습니다.", {
        fontFamily: "'Ramche', system-ui, sans-serif",
        fontSize: "24px",
        color: "#ffffff",
        align: "center",
        lineSpacing: 10,
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    const yes = makeButton(this, GAME_WIDTH / 2 - 90, GAME_HEIGHT / 2 + 68, "네", () => this.confirmQuit(), {
      width: 140,
      height: 50,
      bgColor: 0x6a2d2d,
      fontSize: "22px",
      textColor: "#ffe0e0",
    });
    const no = makeButton(this, GAME_WIDTH / 2 + 90, GAME_HEIGHT / 2 + 68, "아니오", () => {
      this.confirmOverlay?.destroy();
      this.confirmOverlay = undefined;
    }, {
      width: 140,
      height: 50,
      bgColor: 0x2d6a4f,
      fontSize: "22px",
      textColor: "#d8f3dc",
    });

    this.confirmOverlay = this.add
      .container(0, 0, [dim, panel, msg, yes, no])
      .setScrollFactor(0)
      .setDepth(PAUSE_DEPTH + 20);
  }

  private openSettingsFromPause(): void {
    this.confirmOverlay?.destroy();
    this.confirmOverlay = undefined;
    this.scene.launch("SettingsScene", { returnScene: "GameScene" });
    this.scene.bringToTop("SettingsScene");
  }

  private confirmQuit(): void {
    this.clearResumeCountdown();
    this.stopEnergyBoostParticles(true);
    this.time.paused = false;
    this.tweens.resumeAll();
    this.stopBgm();
    this.run.reset();
    this.scene.start("MainMenuScene");
  }

  private clearResumeCountdown(): void {
    if (this.resumeCountdownTimer === undefined) return;
    window.clearInterval(this.resumeCountdownTimer);
    this.resumeCountdownTimer = undefined;
  }

  private handleDeath(): void {
    this.gameOver = true;
    this.stopEnergyBoostParticles();
    this.stopBgm();
    this.showOverlay("💀 사망", `획득 코인: ${this.coins}\n탭: 재시작 / ESC: 메뉴`);
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
    this.health.damage(CHASE_DAMAGE);
    this.iframesUntil = this.time.now + COLLISION_IFRAMES_MS;
    this.player.playHit();
    this.stopEnergyBoostParticles();
    this.sound.play(SoundKey.BossHit);
    this.cameras.main.shake(320, 0.01);
    this.cameras.main.flash(260, 255, 80, 30);
    this.disaster.resolve();
    this.hud.setDisasterStatus(`🔥 재난 피해 -${CHASE_DAMAGE} HP`);
    this.time.delayedCall(1300, () => {
      if (this.disaster.isActive) return;
      this.hud.setDisasterStatus("");
    });
  }

  private updateFloodDamage(): void {
    if (this.disaster.kind !== "flood" || !this.disaster.isActive || this.isEnergyBoostActive()) {
      this.resetFloodContact();
      return;
    }
    const body = this.player.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;

    const waterLineY = this.disaster.floodLevelY;
    if (body.bottom <= waterLineY + 4) {
      this.resetFloodContact();
      return;
    }

    if (this.touchingFloodWater && this.time.now < this.nextFloodDamageAt) return;
    this.touchingFloodWater = true;
    this.nextFloodDamageAt = this.time.now + FLOOD_DAMAGE_INTERVAL_MS;
    this.applyFloodDamage();
  }

  private resetFloodContact(): void {
    this.touchingFloodWater = false;
    this.nextFloodDamageAt = 0;
  }

  private applyFloodDamage(): void {
    this.health.damage(FLOOD_DAMAGE);
    this.floodDamageTaken += FLOOD_DAMAGE;
    this.player.playHit();
    this.stopEnergyBoostParticles();
    this.sound.play(SoundKey.BossHit);
    this.cameras.main.shake(140, 0.005);
    this.cameras.main.flash(160, 50, 150, 255);
    this.hud.setDisasterStatus(`🌊 홍수 피해 -${FLOOD_DAMAGE} HP`);
    if (this.floodDamageTaken >= FLOOD_AUTO_RESOLVE_DAMAGE) {
      this.disaster.resolve();
      this.resetFloodContact();
      this.hud.setDisasterStatus("✓ 홍수 피해 누적 — 수위 하강");
      return;
    }
    this.time.delayedCall(700, () => {
      if (this.disaster.isActive) return;
      this.hud.setDisasterStatus("");
    });
  }

  private stopBgm(): void {
    if (!this.bgm) return;
    this.tweens.add({
      targets: this.bgm,
      volume: 0,
      duration: 800,
      onComplete: () => this.bgm?.stop(),
    });
  }

  private handleClear(): void {
    this.cleared = true;
    this.stopEnergyBoostParticles();
    this.sound.play(SoundKey.StageClear);
    this.stopBgm();
    this.run.totalCoins += this.stageCoinDelta;
    this.run.currentHp = this.health.value;
    this.run.consumeOneShots();
    if (this.run.stageIndex === 2 && this.disaster.kind === "flood") {
      this.scene.start("FinalScoreScene", {
        run: this.run,
        stageCoins: this.stageCoinDelta,
        remainingHp: this.health.value,
        maxHp: this.health.maxValue,
      });
      return;
    }
    this.showOverlay(
      "✨ 스테이지 클리어",
      `이번 스테이지 +${this.stageCoinDelta} 코인 (누적 ${this.run.totalCoins})\n확인 버튼을 누르면 카드 선택으로 이동`,
    );
    const advance = () => this.scene.start("CardSelectScene", { run: this.run });
    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 145, "확인", advance, {
      width: 240,
      height: 58,
      bgColor: 0x2d6a4f,
      fontSize: "26px",
      textColor: "#d8f3dc",
    })
      .setDepth(2002)
      .setScrollFactor(0);
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

  private createMobileUI(): void {
    // 데스크탑 환경이면 버튼을 만들지 않음
    if (this.sys.game.device.os.desktop) return;

    // 양쪽 버튼 동시 터치를 위한 멀티 터치 활성화
    this.input.addPointer(1);

    // --- 왼쪽 JUMP 버튼 ---
    const jumpX = GAME_WIDTH * 0.15;
    const jumpY = GAME_HEIGHT * 0.85;
    const buttonW = 240;
    const buttonH = 128;
    const jumpBtn = this.add.ellipse(jumpX, jumpY, buttonW, buttonH, 0xffffff, 0.3)
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
    const slideBtn = this.add.ellipse(slideX, slideY, buttonW, buttonH, 0xffffff, 0.3)
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
