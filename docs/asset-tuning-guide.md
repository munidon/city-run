# 에셋 크기 및 히트박스 조정 가이드

이 문서는 게임 내 에셋의 화면 표시 크기, 물리 히트박스, 스폰 위치를 어디서 조정하는지 정리한 문서입니다.

## 기본 원칙

- 화면에 보이는 크기: 보통 `setDisplaySize(width, height)` 또는 `size` 값으로 조정합니다.
- 충돌 판정 크기: Arcade Physics `body.setSize(...)` 값으로 조정합니다.
- 충돌 판정 위치: `body.setOffset(...)`, 스프라이트 `origin`, 또는 스폰 `y` 값의 영향을 받습니다.
- 에셋 파일 경로: [src/assets.ts](/Users/hhj/DOAN/src/assets.ts)에서 관리합니다.
- 변경 후 확인: 게임 내 `설정 > 에셋 미리보기`에서 노란 히트박스를 확인합니다.

## 장애물

파일: [src/objects/Obstacle.ts](/Users/hhj/DOAN/src/objects/Obstacle.ts)

장애물 종류는 현재 `smoke`, `pillar`입니다.

```ts
const SPECS: Record<ObstacleKind, ObstacleSpec> = {
  smoke: {
    width: 110,
    height: 92,
    damagePct: 5,
    spawnY: GROUND_Y - 46,
    gravity: false,
  },
  pillar: {
    width: 92,
    height: 170,
    damagePct: 10,
    spawnY: GROUND_Y - 85,
    gravity: false,
  },
};
```

| 값 | 바꾸면 생기는 변화 |
| --- | --- |
| `width` | 장애물의 화면 표시 너비와 기본 히트박스 너비가 바뀝니다. |
| `height` | 장애물의 화면 표시 높이와 기본 히트박스 높이가 바뀝니다. |
| `damagePct` | 플레이어가 부딪혔을 때 감소하는 체력이 바뀝니다. |
| `spawnY` | 장애물이 세로로 스폰되는 위치가 바뀝니다. `GROUND_Y - height / 2` 형태가 바닥에 맞추기 쉽습니다. |
| `gravity` | `true`면 중력 영향을 받고, `false`면 제자리 높이를 유지하며 좌우로만 이동합니다. |

현재 히트박스는 표시 크기와 동일하게 잡습니다.

```ts
this.setDisplaySize(spec.width, spec.height);
body.setSize(spec.width / this.scaleX, spec.height / this.scaleY, true);
```

시각 크기는 유지하고 히트박스만 줄이고 싶다면:

```ts
body.setSize((spec.width * 0.8) / this.scaleX, (spec.height * 0.85) / this.scaleY, true);
```

장애물 출현 비율과 간격은 [src/systems/ObstacleSpawner.ts](/Users/hhj/DOAN/src/systems/ObstacleSpawner.ts)에서 조정합니다.

```ts
const PHASES = [
  { threshold: 0.25, interval: { minMs: 1700, maxMs: 2400 }, weights: { smoke: 6, pillar: 2 } },
];
```

| 값 | 바꾸면 생기는 변화 |
| --- | --- |
| `interval.minMs`, `interval.maxMs` | 장애물 사이 시간 간격이 바뀝니다. 작을수록 자주 나옵니다. |
| `weights.smoke` | smoke 출현 비중이 바뀝니다. |
| `weights.pillar` | pillar 출현 비중이 바뀝니다. |
| `threshold` | 스테이지 진행률 구간이 바뀝니다. `0.25`는 25% 전까지 적용됩니다. |

## 아이템

파일: [src/objects/Item.ts](/Users/hhj/DOAN/src/objects/Item.ts)

```ts
const SPECS: Record<ItemKind, ItemSpec> = {
  energy_drink: { size: 58, hitSize: 32, healPct: 3, coins: 0 },
};
```

| 값 | 바꾸면 생기는 변화 |
| --- | --- |
| `size` | 아이템의 화면 표시 크기가 바뀝니다. 정사각형으로 표시됩니다. |
| `hitSize` | 아이템 획득 판정 크기가 바뀝니다. 작을수록 정확히 먹어야 합니다. |
| `healPct` | 획득 시 회복량이 바뀝니다. |
| `coins` | 획득 시 코인 보상량이 바뀝니다. |

아이템 히트박스는 가운데 정렬입니다.

```ts
this.setDisplaySize(spec.size, spec.size);
body.setSize(hitSize / this.scaleX, hitSize / this.scaleY, true);
```

아이템 출현 확률과 출현 간격은 [src/systems/ItemSpawner.ts](/Users/hhj/DOAN/src/systems/ItemSpawner.ts)에서 조정합니다.

## 플레이어

파일: [src/objects/Player.ts](/Users/hhj/DOAN/src/objects/Player.ts)

```ts
const PLAYER_WIDTH = 75;
const PLAYER_HEIGHT_STAND = 130;
const PLAYER_WIDTH_JUMP = 75;
const PLAYER_HEIGHT_JUMP = 130;
const PLAYER_WIDTH_SLIDE = 130;
const PLAYER_HEIGHT_SLIDE = 80;
```

| 값 | 바꾸면 생기는 변화 |
| --- | --- |
| `PLAYER_WIDTH`, `PLAYER_HEIGHT_STAND` | 달리기 상태 표시 크기가 바뀝니다. |
| `PLAYER_WIDTH_JUMP`, `PLAYER_HEIGHT_JUMP` | 점프 상태 표시 크기가 바뀝니다. |
| `PLAYER_WIDTH_SLIDE`, `PLAYER_HEIGHT_SLIDE` | 슬라이딩 상태 표시 크기가 바뀝니다. |
| `JUMP_VELOCITY` | 첫 점프 높이가 바뀝니다. 더 작은 음수일수록 낮게 뜁니다. |
| `DOUBLE_JUMP_VELOCITY` | 2단 점프 높이가 바뀝니다. |

플레이어 히트박스 비율은 `updateSizeAndHitbox` 안에서 조정합니다.

```ts
const HITBOX_RATIO_X = 0.5;
const HITBOX_RATIO_Y = 0.8;
```

| 값 | 바꾸면 생기는 변화 |
| --- | --- |
| `HITBOX_RATIO_X` | 플레이어 충돌 판정 너비가 바뀝니다. 작을수록 장애물을 덜 맞습니다. |
| `HITBOX_RATIO_Y` | 플레이어 충돌 판정 높이가 바뀝니다. 너무 작으면 바닥/발판 판정이 어색해질 수 있습니다. |

## 발판

파일: [src/objects/Platform.ts](/Users/hhj/DOAN/src/objects/Platform.ts)

발판은 `new Platform(scene, x, y, width, height)`로 만들어지며, `width`, `height`가 표시 크기와 히트박스를 동시에 결정합니다.

```ts
this.setDisplaySize(width, height);
body.setSize(width / this.scaleX, height / this.scaleY, false);
```

발판 배치 데이터는 [src/data/segments.ts](/Users/hhj/DOAN/src/data/segments.ts)에 있습니다.

```ts
platforms: [
  { x: 420, y: 420, width: 220, height: 36 },
],
```

| 값 | 바꾸면 생기는 변화 |
| --- | --- |
| `x` | 세그먼트 안에서 발판의 가로 위치가 바뀝니다. |
| `y` | 발판의 세로 위치가 바뀝니다. 작을수록 위에 배치됩니다. |
| `width` | 발판 길이와 히트박스 너비가 바뀝니다. |
| `height` | 발판 두께와 히트박스 높이가 바뀝니다. |

발판은 위에서 내려올 때만 밟히도록 [src/scenes/GameScene.ts](/Users/hhj/DOAN/src/scenes/GameScene.ts)의 `canLandOnPlatform`에서 판정합니다.

## 배경과 도로

파일: [src/scenes/GameScene.ts](/Users/hhj/DOAN/src/scenes/GameScene.ts)

배경 레이어 크기와 위치:

```ts
private readonly bgOffsetY = 0;
```

도로 크기와 위치:

```ts
const roadSizeMultiplier = 0.8;
const roadOffsetY = 150;
```

| 값 | 바꾸면 생기는 변화 |
| --- | --- |
| `bgOffsetY` | 배경 전체의 세로 위치가 바뀝니다. |
| `roadSizeMultiplier` | 도로 이미지 표시 배율이 바뀝니다. |
| `roadOffsetY` | 도로의 세로 위치가 바뀝니다. 양수면 더 아래로 내려갑니다. |

## 에셋 미리보기

파일: [src/scenes/AssetPreviewScene.ts](/Users/hhj/DOAN/src/scenes/AssetPreviewScene.ts)

미리보기 화면에서 카드 크기와 간격은 아래 상수로 조정합니다.

```ts
const CARD_W = 250;
const CARD_H = 238;
const GAP_X = 28;
const GAP_Y = 30;
```

| 값 | 바꾸면 생기는 변화 |
| --- | --- |
| `CARD_W`, `CARD_H` | 미리보기 카드 크기가 바뀝니다. |
| `GAP_X`, `GAP_Y` | 카드 사이 여백이 바뀝니다. |
| 각 `addPreviewCard` 내부 위치 보정값 | 미리보기 안에서 에셋 위치만 바뀝니다. 실제 게임 판정에는 영향이 없습니다. |

## 추천 작업 순서

1. 에셋 파일을 `public/assets/...`에 교체합니다.
2. 파일명이 바뀌었다면 [src/assets.ts](/Users/hhj/DOAN/src/assets.ts)의 경로를 수정합니다.
3. 화면 표시 크기를 `Obstacle.ts`, `Item.ts`, `Player.ts`, `Platform.ts`에서 조정합니다.
4. 히트박스를 같은 파일에서 조정합니다.
5. `npm run build`로 타입 오류를 확인합니다.
6. 게임 내 `설정 > 에셋 미리보기`에서 노란 히트박스를 확인합니다.
7. 실제 플레이에서 점프, 슬라이드, 충돌, 아이템 획득이 자연스러운지 확인합니다.
