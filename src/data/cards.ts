import { RunState } from "@/state/RunState";

export type CardCategory = "permanent" | "one_shot" | "risk_reward";
export type CardRarity = "common" | "rare" | "epic" | "legendary";

export interface Card {
  id: string;
  category: CardCategory;
  rarity: CardRarity;
  title: string;
  description: string;
  apply: (run: RunState) => void;
}

export const ALL_CARDS: Card[] = [
  {
    id: "p-hp-up",
    category: "permanent",
    rarity: "common",
    title: "기초 체력 보강",
    description: "최대 체력이 15% 증가합니다. 영구.",
    apply: (run) => {
      run.maxHpBonus += 0.15;
    },
  },
  {
    id: "p-coin-up-common",
    category: "permanent",
    rarity: "common",
    title: "가벼운 지갑",
    description: "코인 획득량이 15% 증가합니다. 영구.",
    apply: (run) => {
      run.coinMul *= 1.15;
    },
  },
  {
    id: "o-heal-half",
    category: "one_shot",
    rarity: "common",
    title: "응급 처치",
    description: "다음 스테이지를 최대 체력의 50%가 회복된 상태로 시작합니다.",
    apply: (run) => {
      run.pendingHealRatio = 0.5;
    },
  },
  {
    id: "p-shield-common",
    category: "permanent",
    rarity: "common",
    title: "안전모 착용",
    description: "장애물 충돌 시 받는 피해량이 10% 감소합니다. 영구.",
    apply: (run) => {
      run.damageReduction += 0.1;
    },
  },
  {
    id: "p-coin-up-rare",
    category: "permanent",
    rarity: "rare",
    title: "황금 구두",
    description: "코인 획득량이 40% 증가합니다. 영구.",
    apply: (run) => {
      run.coinMul *= 1.4;
    },
  },
  {
    id: "p-magnet-rare",
    category: "permanent",
    rarity: "rare",
    title: "자석 배낭",
    description: "아이템 및 코인 흡수 범위가 30% 증가합니다. 영구.",
    apply: (run) => {
      run.magnetRange += 0.3;
    },
  },
  {
    id: "o-fullheal",
    category: "one_shot",
    rarity: "rare",
    title: "긴급 수송",
    description: "다음 스테이지를 풀 체력으로 시작합니다.",
    apply: (run) => {
      run.pendingFullHeal = true;
    },
  },
  {
    id: "o-double-coin",
    category: "one_shot",
    rarity: "rare",
    title: "벼락부자",
    description: "다음 1스테이지 동안 코인 획득량이 2배가 됩니다.",
    apply: (run) => {
      run.pendingDoubleCoin = true;
    },
  },
  {
    id: "r-low-hp",
    category: "risk_reward",
    rarity: "epic",
    title: "배수진",
    description: "다음 스테이지를 50% 체력으로 시작하지만, 스테이지 클리어 보상이 2.5배가 됩니다.",
    apply: (run) => {
      run.pendingStartHpRatio = 0.5;
      run.pendingRewardMul *= 2.5;
    },
  },
  {
    id: "r-glass-cannon",
    category: "risk_reward",
    rarity: "epic",
    title: "유리 몸과 초고속 부스터",
    description: "점수 및 코인 획득량이 60% 증가하지만, 충돌 피해량이 2배가 됩니다. 영구.",
    apply: (run) => {
      run.coinMul *= 1.6;
      run.scoreMul *= 1.6;
      run.damageTakenMul *= 2;
    },
  },
  {
    id: "p-scavenger",
    category: "permanent",
    rarity: "epic",
    title: "도시의 미식가",
    description: "빵·도시락 회복량이 50% 증가하며, 회복 시 3초간 무적 상태가 됩니다. 영구.",
    apply: (run) => {
      run.healMul *= 1.5;
      run.enableHealInvincibility = true;
    },
  },
];

export function pickThreeCards(exclude: string[] = []): Card[] {
  const pool = ALL_CARDS.filter((c) => !exclude.includes(c.id));
  const chosen: Card[] = [];
  const work = [...pool];
  while (chosen.length < 3 && work.length > 0) {
    const idx = Math.floor(Math.random() * work.length);
    chosen.push(work.splice(idx, 1)[0]);
  }
  while (chosen.length < 3) {
    chosen.push(ALL_CARDS[Math.floor(Math.random() * ALL_CARDS.length)]);
  }
  return chosen;
}
