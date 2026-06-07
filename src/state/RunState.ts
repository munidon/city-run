export class RunState {
  public stageIndex = 1;
  public totalCoins = 0;
  public currentHp: number | null = null;

  public maxHpBonus = 0;
  public coinMul = 1;
  public healMul = 1;
  public damageReduction = 0;
  public magnetRange = 0;
  public scoreMul = 1;
  public damageTakenMul = 1;
  public enableHealInvincibility = false;

  public pendingFullHeal = false;
  public pendingDoubleCoin = false;
  public pendingStartHpRatio: number | null = null;
  public pendingHealRatio: number | null = null;
  public pendingRewardMul = 1;

  public pickedCardIds: string[] = [];

  public reset(): void {
    this.stageIndex = 1;
    this.totalCoins = 0;
    this.currentHp = null;
    this.maxHpBonus = 0;
    this.coinMul = 1;
    this.healMul = 1;
    this.damageReduction = 0;
    this.magnetRange = 0;
    this.scoreMul = 1;
    this.damageTakenMul = 1;
    this.enableHealInvincibility = false;
    this.pendingFullHeal = false;
    this.pendingDoubleCoin = false;
    this.pendingStartHpRatio = null;
    this.pendingHealRatio = null;
    this.pendingRewardMul = 1;
    this.pickedCardIds = [];
  }

  public consumeOneShots(): void {
    this.pendingFullHeal = false;
    this.pendingDoubleCoin = false;
    this.pendingStartHpRatio = null;
    this.pendingHealRatio = null;
    this.pendingRewardMul = 1;
  }

  public get maxHp(): number {
    return Math.round(100 * (1 + this.maxHpBonus));
  }
}
