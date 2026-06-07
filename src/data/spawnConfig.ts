import { GROUND_Y } from "@/config";
import type { ItemKind } from "@/objects/Item";
import type { ObstacleKind } from "@/objects/Obstacle";

export interface RandomSpawnConfig {
  interval: {
    minMs: number;
    maxMs: number;
  };
  weights: Record<string, number>;
}

export const RANDOM_ITEM_SPAWN: RandomSpawnConfig & {
  weights: Record<ItemKind, number>;
  suppressDuringDisaster: Partial<Record<ItemKind, boolean>>;
} = {
  interval: { minMs: 2200, maxMs: 3400 },
  // 확률 조정은 여기 숫자만 바꾸면 됩니다. 0이면 스폰되지 않습니다.
  weights: {
    gimbap: 5,
    bento: 2,
    coin: 0,
    energy_drink: 1,
    fire_extinguisher: 1,
    gas_mask: 2,
    wet_towel: 2,
  },
  suppressDuringDisaster: {
    energy_drink: true,
  },
};

export const RANDOM_OBSTACLE_SPAWN: RandomSpawnConfig & {
  weightsByProgress: Array<{
    threshold: number;
    weights: Record<ObstacleKind, number>;
  }>;
} = {
  interval: { minMs: 1200, maxMs: 1900 },
  weights: {
    smoke: 0,
    pillar: 0,
    fire_smoke: 0,
  },
  weightsByProgress: [
    { threshold: 0.25, weights: { smoke: 6, pillar: 2, fire_smoke: 1 } },
    { threshold: 0.6, weights: { smoke: 5, pillar: 3, fire_smoke: 2 } },
    { threshold: 0.85, weights: { smoke: 4, pillar: 4, fire_smoke: 3 } },
    { threshold: 1.01, weights: { smoke: 4, pillar: 5, fire_smoke: 3 } },
  ],
};

export const RANDOM_ITEM_Y: Record<ItemKind, number[]> = {
  gimbap: [GROUND_Y - 60, GROUND_Y - 120, GROUND_Y - 240],
  bento: [GROUND_Y - 60, GROUND_Y - 120],
  coin: [GROUND_Y - 50, GROUND_Y - 110, GROUND_Y - 170],
  energy_drink: [GROUND_Y - 120, GROUND_Y - 240],
  fire_extinguisher: [GROUND_Y - 60, GROUND_Y - 120],
  gas_mask: [GROUND_Y - 60, GROUND_Y - 120, GROUND_Y - 240],
  wet_towel: [GROUND_Y - 60, GROUND_Y - 120, GROUND_Y - 240],
};
