export class RunState {
  public stageIndex = 1;
  public totalCoins = 0;

  public maxHpBonus = 0;
  public coinMul = 1;
  public healMul = 1;
  public obstacleDensityMul = 1;

  public pendingFullHeal = false;
  public pendingDoubleCoin = false;
  public pendingStartHpRatio: number | null = null;
  public pendingRewardMul = 1;

  public pickedCardIds: string[] = [];

  public reset(): void {
    this.stageIndex = 1;
    this.totalCoins = 0;
    this.maxHpBonus = 0;
    this.coinMul = 1;
    this.healMul = 1;
    this.obstacleDensityMul = 1;
    this.pendingFullHeal = false;
    this.pendingDoubleCoin = false;
    this.pendingStartHpRatio = null;
    this.pendingRewardMul = 1;
    this.pickedCardIds = [];
  }

  public consumeOneShots(): void {
    this.pendingFullHeal = false;
    this.pendingDoubleCoin = false;
    this.pendingStartHpRatio = null;
    this.pendingRewardMul = 1;
  }

  public get maxHp(): number {
    return Math.round(100 * (1 + this.maxHpBonus));
  }
}
