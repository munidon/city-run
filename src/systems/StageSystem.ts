export type ProgressListener = (progress01: number) => void;
export type CheckpointListener = (checkpoint: number) => void;

const STAGE_DURATION_SEC = 60;
const CHECKPOINTS = [0.5, 0.8];

export class StageSystem {
  private elapsedMs = 0;
  private listeners: ProgressListener[] = [];
  private checkpointListeners: CheckpointListener[] = [];
  private firedCheckpoints = new Set<number>();

  public tick(deltaMs: number): void {
    if (this.complete) return;
    this.elapsedMs += deltaMs;
    const p = this.progress;
    for (const l of this.listeners) l(p);

    for (const cp of CHECKPOINTS) {
      if (!this.firedCheckpoints.has(cp) && p >= cp) {
        this.firedCheckpoints.add(cp);
        for (const l of this.checkpointListeners) l(cp);
      }
    }
  }

  public onCheckpoint(listener: CheckpointListener): void {
    this.checkpointListeners.push(listener);
  }

  public reset(): void {
    this.elapsedMs = 0;
    this.firedCheckpoints.clear();
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
