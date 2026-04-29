export type DisasterListener = () => void;

interface DisasterConfig {
  rollProgress: number;
  rollChance: number;
  forcedProgress: number;
  scrollDelayMsMin: number;
  scrollDelayMsMax: number;
  speedBonus: number;
}

const DEFAULT_CONFIG: DisasterConfig = {
  rollProgress: 0.4,
  rollChance: 0.3,
  forcedProgress: 0.85,
  scrollDelayMsMin: 7000,
  scrollDelayMsMax: 10000,
  speedBonus: 0.3,
};

export class DisasterSystem {
  private rolled = false;
  private triggered = false;
  private resolved = false;
  private msSinceTrigger = 0;
  private scrollDelayMs = 0;
  private scrollSpawned = false;

  private triggerListeners: DisasterListener[] = [];
  private spawnScrollListeners: DisasterListener[] = [];
  private resolveListeners: DisasterListener[] = [];

  constructor(private readonly config: DisasterConfig = DEFAULT_CONFIG) {}

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

    if (this.scrollSpawned || this.resolved) return;

    this.msSinceTrigger += deltaMs;
    if (this.msSinceTrigger >= this.scrollDelayMs) {
      this.scrollSpawned = true;
      for (const l of this.spawnScrollListeners) l();
    }
  }

  public resolve(): void {
    if (this.resolved) return;
    this.resolved = true;
    for (const l of this.resolveListeners) l();
  }

  public get isActive(): boolean {
    return this.triggered && !this.resolved;
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
