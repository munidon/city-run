import { BASE_SPEED } from "@/config";

export const GRAVITY = 1800;
export const JUMP_SPEED = 750;        // Player JUMP_VELOCITY 절대값 (위로 발사)
export const DOUBLE_JUMP_SPEED = 700; // Player DOUBLE_JUMP_VELOCITY 절대값
export const SCROLL_SPEED = BASE_SPEED;

export interface ArcPoint {
  x: number;
  y: number;
  t: number;          // 시작 시점부터 흐른 시간 (s)
}

/**
 * 시작점 (x0, y0)에서 정해진 시점에 점프했을 때의 월드 좌표.
 * 월드는 좌측으로 스크롤되지만, 에디터에서 "다음 세그먼트 좌표"는 정지된 캔버스에서 보므로
 * 여기서는 캔버스 기준의 곡선을 반환한다 (즉, 플레이어가 멈춰 있고 코인만 따라 그리는 좌표).
 *
 * Phaser 좌표계는 y가 아래로 증가하므로, 위로 솟구치는 점프는 y가 감소.
 */
export function trajectoryAt(x0: number, y0: number, t: number): { x: number; y: number } {
  // 단일 점프 포물선
  // x: 시간에 따라 SCROLL_SPEED 만큼 오른쪽으로 (게임 화면에서는 월드가 좌측 스크롤하므로
  //   플레이어가 화면에서는 정지하지만, 에디터 캔버스 기준에서는 코인 후보가 오른쪽으로 멀어진다)
  const x = x0 + SCROLL_SPEED * t;
  const y = y0 - JUMP_SPEED * t + 0.5 * GRAVITY * t * t;
  return { x, y };
}

/**
 * 이중 점프 곡선: 단일 점프 정점(t1 = JUMP_SPEED/GRAVITY)에 다시 -JUMP_SPEED 가속 → 두 번째 포물선.
 */
export function doubleJumpAt(x0: number, y0: number, t: number): { x: number; y: number } {
  const tApex = JUMP_SPEED / GRAVITY;       // 첫 정점에 도달하는 시간
  if (t <= tApex) {
    return trajectoryAt(x0, y0, t);
  }
  const apex = trajectoryAt(x0, y0, tApex); // 첫 정점 위치
  const dt = t - tApex;
  const x = apex.x + SCROLL_SPEED * dt;
  const y = apex.y - DOUBLE_JUMP_SPEED * dt + 0.5 * GRAVITY * dt * dt;
  return { x, y };
}

/**
 * 시작점에서 점프해 다시 시작 높이(y0) 또는 그 아래로 내려올 때까지의 곡선을 dt 간격으로 샘플링.
 */
export function sampleArc(
  x0: number,
  y0: number,
  doubleJump: boolean,
  endY: number = y0,
  stepMs: number = 20,
  maxMs: number = 2000,
): ArcPoint[] {
  const points: ArcPoint[] = [];
  const fn = doubleJump ? doubleJumpAt : trajectoryAt;
  for (let ms = 0; ms <= maxMs; ms += stepMs) {
    const t = ms / 1000;
    const p = fn(x0, y0, t);
    points.push({ x: p.x, y: p.y, t });
    // 정점을 넘어 내려가다 endY에 도달하면 종료
    if (ms > 0 && p.y >= endY) break;
  }
  return points;
}

/**
 * 곡선 위의 균등 간격(arc length) 스냅 점들. 코인 후보 위치로 사용.
 */
export function snapPointsAlongArc(arc: ArcPoint[], spacing: number = 30): ArcPoint[] {
  if (arc.length === 0) return [];
  const out: ArcPoint[] = [arc[0]];
  let accumulated = 0;
  for (let i = 1; i < arc.length; i += 1) {
    const dx = arc[i].x - arc[i - 1].x;
    const dy = arc[i].y - arc[i - 1].y;
    accumulated += Math.hypot(dx, dy);
    if (accumulated >= spacing) {
      out.push(arc[i]);
      accumulated = 0;
    }
  }
  return out;
}
