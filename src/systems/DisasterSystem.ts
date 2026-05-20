export type DisasterListener = () => void;

interface DisasterConfig {
  triggerPoints: number[];
  scrollDelayMsMin: number;
  scrollDelayMsMax: number;
  speedBonus: number;
  chaseStartX: number;
  chaseTargetX: number;
  chaseTimeToTargetMs: number;
  chaseRetreatPxPerSec: number;
}

const DEFAULT_CONFIG: DisasterConfig = {
  triggerPoints: [0.2, 0.4, 0.6, 0.8],
  scrollDelayMsMin: 7000,
  scrollDelayMsMax: 10000,
  speedBonus: 0.3,
  chaseStartX: -240,
  chaseTargetX: 448,
  chaseTimeToTargetMs: 17000,
  chaseRetreatPxPerSec: 320,
};

export class DisasterSystem {
  private currentWave = 0;
  private triggered = false;
  private resolved = false;
  private msSinceTrigger = 0;
  private scrollDelayMs = 0;
  private scrollSpawned = false;
  private chaseX = 0;
  private retreating = false;
  private suppressionMs = 0;

  private triggerListeners: DisasterListener[] = [];
  private spawnScrollListeners: DisasterListener[] = [];
  private resolveListeners: DisasterListener[] = [];

  constructor(private readonly config: DisasterConfig = DEFAULT_CONFIG) {
    this.chaseX = this.config.chaseStartX;
  }

  public tick(deltaMs: number, progress01: number): void {
    if (this.suppressionMs > 0) {
      this.suppressionMs = Math.max(0, this.suppressionMs - deltaMs);
    }

    if (this.currentWave >= this.config.triggerPoints.length) return;

    if (!this.triggered) {
      if (this.suppressionMs > 0) return;
      if (progress01 >= this.config.triggerPoints[this.currentWave]) {
        this.trigger();
      }
      return;
    }

    if (this.retreating) {
      this.chaseX -= (this.config.chaseRetreatPxPerSec * deltaMs) / 1000;
      if (this.chaseX <= this.config.chaseStartX) {
        this.chaseX = this.config.chaseStartX;
        this.retreating = false;
        this.currentWave++;
        this.triggered = false;
        this.resolved = false;
        this.msSinceTrigger = 0;
        this.scrollSpawned = false;
      }
      return;
    }

    if (this.resolved) return;

    this.msSinceTrigger += deltaMs;
    const advancePxPerMs =
      (this.config.chaseTargetX - this.config.chaseStartX) / this.config.chaseTimeToTargetMs;
    this.chaseX += advancePxPerMs * deltaMs;

    if (!this.scrollSpawned && this.msSinceTrigger >= this.scrollDelayMs) {
      this.scrollSpawned = true;
      for (const l of this.spawnScrollListeners) l();
    }
  }

  public get chasePosition(): number {
    return this.chaseX;
  }

  public get hasChase(): boolean {
    return this.triggered;
  }

  public resolve(): void {
    if (this.resolved) return;
    this.resolved = true;
    this.retreating = true;
    for (const l of this.resolveListeners) l();
  }

  public get isActive(): boolean {
    return this.triggered && !this.resolved;
  }

  public get hasResolved(): boolean {
    return this.resolved;
  }

  public get speedBonus(): number {
    return this.isActive ? this.config.speedBonus : 0;
  }

  public suppressFor(durationMs: number): void {
    this.suppressionMs = Math.max(this.suppressionMs, durationMs);
    if (this.isActive) this.resolve();
  }

  public onTrigger(l: DisasterListener): void {
    this.triggerListeners.push(l);
  }

  public onSpawnScroll(l: DisasterListener): void {
    this.spawnScrollListeners.push(l);
  }

  public onResolve(l: DisasterListener): void {
    this.resolveListeners.push(l);
  }

  private trigger(): void {
    this.triggered = true;
    this.scrollDelayMs =
      this.config.scrollDelayMsMin +
      Math.random() * (this.config.scrollDelayMsMax - this.config.scrollDelayMsMin);
    for (const l of this.triggerListeners) l();
  }
}
