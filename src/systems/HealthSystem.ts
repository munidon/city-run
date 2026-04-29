export type HealthListener = (current: number, max: number) => void;

export class HealthSystem {
  private current: number;
  private listeners: HealthListener[] = [];

  constructor(
    private readonly max: number = 100,
    private readonly drainPerSecond: number = 1.5,
  ) {
    this.current = max;
  }

  public tick(deltaMs: number): void {
    if (this.current <= 0) return;
    this.set(this.current - this.drainPerSecond * (deltaMs / 1000));
  }

  public damage(amount: number): void {
    this.set(this.current - amount);
  }

  public heal(amount: number): void {
    this.set(this.current + amount);
  }

  public reset(): void {
    this.set(this.max);
  }

  public get value(): number {
    return this.current;
  }

  public get maxValue(): number {
    return this.max;
  }

  public get isDead(): boolean {
    return this.current <= 0;
  }

  public onChange(listener: HealthListener): void {
    this.listeners.push(listener);
    listener(this.current, this.max);
  }

  private set(next: number): void {
    const clamped = Math.max(0, Math.min(this.max, next));
    if (clamped === this.current) return;
    this.current = clamped;
    for (const l of this.listeners) l(this.current, this.max);
  }
}
