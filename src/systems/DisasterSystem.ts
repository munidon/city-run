export type DisasterListener = () => void;

interface DisasterConfig {
  rollProgress: number;
  rollChance: number;
  forcedProgress: number;
  scrollDelayMsMin: number;
  scrollDelayMsMax: number;
  speedBonus: number;
  chaseStartX: number;
  chaseTargetX: number;
  chaseTimeToTargetMs: number;
  chaseRetreatPxPerSec: number;
}

const DEFAULT_CONFIG: DisasterConfig = {
  rollProgress: 0.4,
  rollChance: 0.3,
  forcedProgress: 0.75,
  scrollDelayMsMin: 7000,
  scrollDelayMsMax: 10000,
  speedBonus: 0.3,
  chaseStartX: -240,
  chaseTargetX: 448,
  chaseTimeToTargetMs: 17000,
  chaseRetreatPxPerSec: 320,
};

export class DisasterSystem {
  private rolled = false;
  private triggered = false;
  private resolved = false;
  private msSinceTrigger = 0;
  private scrollDelayMs = 0;
  private scrollSpawned = false;
  private chaseX = 0;
  private retreating = false;

  private triggerListeners: DisasterListener[] = [];
  private spawnScrollListeners: DisasterListener[] = [];
  private resolveListeners: DisasterListener[] = [];

  constructor(private readonly config: DisasterConfig = DEFAULT_CONFIG) {
    this.chaseX = this.config.chaseStartX;
  }

  public tick(deltaMs: number, progress01: number): void {
    if (!this.triggered) {
      if (!this.rolled && progress01 >= this.config.rollProgress) {
        this.rolled = true;
        if (Math.random() < this.config.rollChance) this.trigger();
      }
      if (!this.triggered && progress01 >= this.config.forcedProgress) {
        this.trigger();
      }
      return;
    }

    if (this.retreating) {
      this.chaseX -= (this.config.chaseRetreatPxPerSec * deltaMs) / 1000;
      if (this.chaseX <= this.config.chaseStartX) {
        this.chaseX = this.config.chaseStartX;
        this.retreating = false;
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
