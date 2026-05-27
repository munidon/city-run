import { GAME_WIDTH, GROUND_Y } from "@/config";
import type { ItemKind } from "@/objects/Item";
import type { ObstacleKind } from "@/objects/Obstacle";

export interface PlatformDef {
  x: number;      // 세그먼트 내 로컬 좌표 (0 = 세그먼트 시작)
  y: number;      // 월드 좌표 (위로 갈수록 작아짐)
  width: number;
  height: number;
}

export interface CoinDef {
  x: number;      // 세그먼트 내 로컬 좌표
  y: number;
}

export interface SegmentItemDef {
  kind: Exclude<ItemKind, "coin">;
  x: number;
  y: number;
}

export interface SegmentObstacleDef {
  kind: ObstacleKind;
  x: number;
  y: number;
}

export interface MapSegment {
  id: string;
  length: number;             // 세그먼트 가로 길이 (px)
  difficulty: 1 | 2 | 3;      // 풀에서의 가중치용
  entryGroundY: number;       // 좌측 끝 지면 높이 (연결 검증)
  exitGroundY: number;        // 우측 끝 지면 높이
  platforms: PlatformDef[];
  coins: CoinDef[];
  items: SegmentItemDef[];
  obstacles: SegmentObstacleDef[];
}

const PLATFORM_THICKNESS = 36;

// 임시 콘텐츠 — 에디터로 본격적으로 디자인하기 전 동작 확인용
export const SEGMENTS: MapSegment[] = [
  {
    id: "flat-warmup",
    length: GAME_WIDTH,
    difficulty: 1,
    entryGroundY: GROUND_Y,
    exitGroundY: GROUND_Y,
    platforms: [],
    coins: [
      { x: 400, y: GROUND_Y - 50 },
      { x: 460, y: GROUND_Y - 50 },
      { x: 520, y: GROUND_Y - 50 },
    ],
    items: [],
    obstacles: [],
  },
  {
    id: "step-up-3",
    length: GAME_WIDTH,
    difficulty: 1,
    entryGroundY: GROUND_Y,
    exitGroundY: GROUND_Y,
    platforms: [
      // 모두 단일 점프(<=130px)로 도달 가능
      { x: 200, y: GROUND_Y - 70, width: 240, height: PLATFORM_THICKNESS },
      { x: 540, y: GROUND_Y - 120, width: 240, height: PLATFORM_THICKNESS },
      { x: 880, y: GROUND_Y - 70, width: 240, height: PLATFORM_THICKNESS },
    ],
    coins: [
      { x: 320, y: GROUND_Y - 120 },
      { x: 480, y: GROUND_Y - 160 },
      { x: 660, y: GROUND_Y - 170 },
      { x: 840, y: GROUND_Y - 160 },
      { x: 1000, y: GROUND_Y - 120 },
    ],
    items: [],
    obstacles: [],
  },
  {
    id: "gap-jumps",
    length: GAME_WIDTH,
    difficulty: 2,
    entryGroundY: GROUND_Y,
    exitGroundY: GROUND_Y,
    platforms: [
      // 단일 점프 한계 근처 → 약간의 도전 (모두 단일 점프 가능 범위 내)
      { x: 180, y: GROUND_Y - 100, width: 180, height: PLATFORM_THICKNESS },
      { x: 500, y: GROUND_Y - 130, width: 180, height: PLATFORM_THICKNESS },
      { x: 820, y: GROUND_Y - 100, width: 180, height: PLATFORM_THICKNESS },
    ],
    coins: [
      { x: 270, y: GROUND_Y - 150 },
      { x: 430, y: GROUND_Y - 180 },
      { x: 590, y: GROUND_Y - 190 },
      { x: 750, y: GROUND_Y - 180 },
      { x: 910, y: GROUND_Y - 150 },
    ],
    items: [],
    obstacles: [],
  },
  {
    id: "high-platform",
    length: GAME_WIDTH,
    difficulty: 3,
    entryGroundY: GROUND_Y,
    exitGroundY: GROUND_Y,
    platforms: [
      // 가장 높은 발판은 이중 점프 필수 (단일 점프로 도달 불가)
      { x: 200, y: GROUND_Y - 90, width: 200, height: PLATFORM_THICKNESS },
      { x: 480, y: GROUND_Y - 200, width: 320, height: PLATFORM_THICKNESS },
      { x: 880, y: GROUND_Y - 90, width: 200, height: PLATFORM_THICKNESS },
    ],
    coins: [
      { x: 300, y: GROUND_Y - 140 },
      { x: 540, y: GROUND_Y - 250 },
      { x: 640, y: GROUND_Y - 260 },
      { x: 740, y: GROUND_Y - 250 },
      { x: 980, y: GROUND_Y - 140 },
    ],
    items: [],
    obstacles: [],
  },
];

/**
 * stage 진행도(0~1)에 따라 가중치를 적용해 다음 세그먼트를 무작위로 선택.
 * 진행도가 높을수록 난이도 2~3 가중치 증가.
 */
export function pickRandomSegment(progress: number, exclude?: string): MapSegment {
  const pool = SEGMENTS.filter((s) => s.id !== exclude);
  if (pool.length === 0) return SEGMENTS[0];

  const weights = pool.map((s) => {
    if (s.difficulty === 1) return 1 + Math.max(0, 0.5 - progress);
    if (s.difficulty === 2) return 0.4 + progress;
    return 0.1 + progress * 1.2;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i += 1) {
    r -= weights[i];
    if (r < 0) return pool[i];
  }
  return pool[pool.length - 1];
}

export function getSegmentById(id: string): MapSegment | undefined {
  return SEGMENTS.find((s) => s.id === id);
}
