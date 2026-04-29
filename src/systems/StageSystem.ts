export type ProgressListener = (progress01: number) => void;

const STAGE_DURATION_SEC = 60;

export class StageSystem {
  private elapsedMs = 0;
  private listeners: ProgressListener[] = [];

  public tick(deltaMs: number): void {
    if (this.complete) return;
    this.elapsedMs += deltaMs;
    const p = this.progress;
    for (const l of this.listeners) l(p);
  }

  public reset(): void {
    this.elapsedMs = 0;
    for (const l of this.listeners) l(0);
  }

  public get progress(): number {
    return Math.min(1, this.elapsedMs / (STAGE_DURATION_SEC * 1000));
  }

  public get complete(): boolean {
    return this.progress >= 1;
  }

  public get speedMultiplier(): number {
    const p = this.progress;
    if (p < 0.25) return 1.0;
    if (p < 0.6) return 1.15;
    if (p < 0.85) return 1.3;
    return 1.45;
  }

  public onChange(listener: ProgressListener): void {
    this.listeners.push(listener);
    listener(this.progress);
  }
}
