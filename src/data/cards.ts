import { RunState } from "@/state/RunState";

export type CardCategory = "permanent" | "one_shot" | "risk_reward";
export type CardRarity = "common" | "rare" | "legendary";

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
    title: "체력 +20%",
    description: "최대 체력이 20% 증가합니다. 영구.",
    apply: (run) => {
      run.maxHpBonus += 0.2;
    },
  },
  {
    id: "p-coin-up",
    category: "permanent",
    rarity: "common",
    title: "코인 +50%",
    description: "코인 획득량이 50% 증가합니다. 영구.",
    apply: (run) => {
      run.coinMul *= 1.5;
    },
  },
  {
    id: "p-heal-up",
    category: "permanent",
    rarity: "rare",
    title: "회복량 +40%",
    description: "빵·도시락 회복량이 40% 증가합니다. 영구.",
    apply: (run) => {
      run.healMul *= 1.4;
    },
  },
  {
    id: "o-fullheal",
    category: "one_shot",
    rarity: "common",
    title: "풀 체력 시작",
    description: "다음 스테이지를 풀 체력으로 시작합니다.",
    apply: (run) => {
      run.pendingFullHeal = true;
    },
  },
  {
    id: "o-double-coin",
    category: "one_shot",
    rarity: "rare",
    title: "다음 스테이지 코인 2배",
    description: "다음 1스테이지 동안 코인 획득량 2배.",
    apply: (run) => {
      run.pendingDoubleCoin = true;
    },
  },
  {
    id: "r-low-hp",
    category: "risk_reward",
    rarity: "rare",
    title: "체력 -20% / 보상 2배",
    description: "다음 스테이지 80% 체력으로 시작, 모든 보상이 2배.",
    apply: (run) => {
      run.pendingStartHpRatio = 0.8;
      run.pendingRewardMul *= 2;
    },
  },
  {
    id: "r-dense",
    category: "risk_reward",
    rarity: "legendary",
    title: "장애물 +50% / 코인 x3",
    description: "장애물 밀도 50% 증가 (영구), 코인 획득량 3배 (영구).",
    apply: (run) => {
      run.obstacleDensityMul *= 1.5;
      run.coinMul *= 3;
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
