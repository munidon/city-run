import * as Phaser from "phaser";
import { SoundKey } from "@/assets";
import { GAME_HEIGHT, GAME_WIDTH, GROUND_Y, PLAYER_X } from "@/config";
import {
  CoinDef,
  MapSegment,
  PlatformDef,
  SEGMENTS,
  SegmentItemDef,
  SegmentObstacleDef,
} from "@/data/segments";
import { sampleArc, snapPointsAlongArc } from "@/editor/JumpTrajectory";
import { ItemKind } from "@/objects/Item";
import { ObstacleKind } from "@/objects/Obstacle";
import { RunState } from "@/state/RunState";

type Tool = "select" | "platform" | "coin" | "item" | "obstacle" | "erase";
type PlaceableItemKind = Exclude<ItemKind, "coin">;

const STORAGE_KEY = "doan_map_editor_v1";
const GRID = 32;
const PLATFORM_DEFAULT_HEIGHT = 24;
const PALETTE_HEIGHT = 104;
const SIDEBAR_WIDTH = 240;
const CANVAS_X = 0;
const CANVAS_Y = PALETTE_HEIGHT;
const CANVAS_WIDTH = GAME_WIDTH - SIDEBAR_WIDTH;
const CANVAS_HEIGHT = GAME_HEIGHT - PALETTE_HEIGHT;

const ITEM_KINDS: PlaceableItemKind[] = [
  "gimbap",
  "bento",
  "energy_drink",
  "fire_extinguisher",
  "gas_mask",
  "wet_towel",
];
const OBSTACLE_KINDS: ObstacleKind[] = ["smoke", "pillar", "fire_smoke"];
const ITEM_LABELS: Record<PlaceableItemKind, string> = {
  gimbap: "김밥",
  bento: "도시락",
  energy_drink: "에너지",
  fire_extinguisher: "소화기",
  gas_mask: "방독면",
  wet_towel: "젖은수건",
};
const OBSTACLE_LABELS: Record<ObstacleKind, string> = {
  smoke: "박스",
  pillar: "기둥",
  fire_smoke: "슬라이드연기",
};
const ITEM_COLORS: Record<PlaceableItemKind, number> = {
  gimbap: 0xf5c98a,
  bento: 0xff7a59,
  energy_drink: 0x2dd4bf,
  fire_extinguisher: 0xdc2626,
  gas_mask: 0x334155,
  wet_towel: 0x38bdf8,
};
const OBSTACLE_COLORS: Record<ObstacleKind, number> = {
  smoke: 0x8b5a2b,
  pillar: 0x708090,
  fire_smoke: 0x252833,
};

interface EditorState {
  segments: MapSegment[];
  activeId: string;
}

function defaultState(): EditorState {
  return {
    segments: [emptySegment("seg-1")],
    activeId: "seg-1",
  };
}

function emptySegment(id: string): MapSegment {
  return {
    id,
    length: GAME_WIDTH,
    difficulty: 1,
    entryGroundY: GROUND_Y,
    exitGroundY: GROUND_Y,
    platforms: [],
    coins: [],
    items: [],
    obstacles: [],
  };
}

function normalizeSegment(seg: MapSegment): MapSegment {
  return {
    ...seg,
    platforms: seg.platforms ?? [],
    coins: seg.coins ?? [],
    items: seg.items ?? [],
    obstacles: seg.obstacles ?? [],
  };
}

function loadState(): EditorState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as EditorState;
    if (!parsed.segments || parsed.segments.length === 0) return defaultState();
    return {
      ...parsed,
      segments: parsed.segments.map(normalizeSegment),
    };
  } catch {
    return defaultState();
  }
}

function saveState(state: EditorState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function snap(v: number, step: number = GRID): number {
  return Math.round(v / step) * step;
}

export class MapEditorScene extends Phaser.Scene {
  private state!: EditorState;
  private tool: Tool = "platform";
  private selectedItemKind: PlaceableItemKind = "gimbap";
  private selectedObstacleKind: ObstacleKind = "smoke";

  // 캔버스(작업 영역) 좌표는 세그먼트 로컬 좌표와 동일하게 유지.
  private canvasContainer!: Phaser.GameObjects.Container;
  private gridGfx!: Phaser.GameObjects.Graphics;
  private guideGfx!: Phaser.GameObjects.Graphics;
  private platformGfx!: Phaser.GameObjects.Graphics;
  private coinGfx!: Phaser.GameObjects.Graphics;
  private itemGfx!: Phaser.GameObjects.Graphics;
  private obstacleGfx!: Phaser.GameObjects.Graphics;
  private arcGfx!: Phaser.GameObjects.Graphics;
  private previewGfx!: Phaser.GameObjects.Graphics;

  private statusText!: Phaser.GameObjects.Text;
  private segMetaText!: Phaser.GameObjects.Text;
  private toolButtons: Record<Tool, Phaser.GameObjects.Container> = {} as any;
  private itemKindButton!: Phaser.GameObjects.Container;
  private obstacleKindButton!: Phaser.GameObjects.Container;

  // platform 드래그 상태
  private dragStart?: { x: number; y: number };

  // coin arc 상태
  private arcOrigin?: { x: number; y: number };
  private arcDouble = false;
  private snapCandidates: { x: number; y: number }[] = [];

  constructor() {
    super("MapEditorScene");
  }

  create(): void {
    this.state = loadState();
    if (!this.activeSegment()) this.state.activeId = this.state.segments[0].id;

    this.cameras.main.setBackgroundColor("#1a1d2e");

    this.createPalette();
    this.createSidebar();
    this.createCanvas();

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    this.input.keyboard?.on("keydown-ESC", this.exitToMenu, this);
    this.input.keyboard?.on("keydown-ONE", () => this.setTool("select"));
    this.input.keyboard?.on("keydown-TWO", () => this.setTool("platform"));
    this.input.keyboard?.on("keydown-THREE", () => this.setTool("coin"));
    this.input.keyboard?.on("keydown-FOUR", () => this.setTool("item"));
    this.input.keyboard?.on("keydown-FIVE", () => this.setTool("obstacle"));
    this.input.keyboard?.on("keydown-SIX", () => this.setTool("erase"));
    this.input.keyboard?.on("keydown-Q", () => this.cycleItemKind());
    this.input.keyboard?.on("keydown-E", () => this.cycleObstacleKind());
    this.input.keyboard?.on("keydown-D", () => {
      this.arcDouble = !this.arcDouble;
      this.refreshArc();
      this.setStatus(`이중 점프 곡선: ${this.arcDouble ? "ON" : "OFF"}`);
    });

    this.refreshAll();
    this.setStatus("키 1~6: 도구 / Q,E: 종류 변경 / D: 점프 곡선 / ESC: 메뉴");
  }

  // -------------------- UI 생성 --------------------

  private createPalette(): void {
    const bg = this.add.rectangle(0, 0, GAME_WIDTH, PALETTE_HEIGHT, 0x202542).setOrigin(0, 0);
    bg.setDepth(10);

    const tools: { tool: Tool; label: string }[] = [
      { tool: "select", label: "1 선택" },
      { tool: "platform", label: "2 플랫폼" },
      { tool: "coin", label: "3 코인(점프)" },
      { tool: "item", label: "4 아이템" },
      { tool: "obstacle", label: "5 장애물" },
      { tool: "erase", label: "6 지우개" },
    ];
    tools.forEach((t, i) => {
      this.toolButtons[t.tool] = this.makeButton(20 + i * 104, 10, 96, 30, t.label, () => this.setTool(t.tool));
    });

    this.itemKindButton = this.makeButton(660, 10, 150, 30, this.itemKindLabel(), () => this.cycleItemKind());
    this.obstacleKindButton = this.makeButton(820, 10, 190, 30, this.obstacleKindLabel(), () => this.cycleObstacleKind());

    this.makeButton(20, 54, 110, 28, "▶ Test Play", () => this.testPlay());
    this.makeButton(140, 54, 110, 28, "💾 Save", () => {
      saveState(this.state);
      this.setStatus("localStorage 저장 완료");
    });
    this.makeButton(260, 54, 130, 28, "📋 Export TS", () => this.exportTS());
    this.makeButton(400, 54, 130, 28, "📥 Import TS", () => this.importTS());
    this.makeButton(540, 54, 80, 28, "+ 새 세그", () => this.newSegment());
    this.makeButton(630, 54, 80, 28, "🗑 삭제", () => this.deleteActive());

    this.statusText = this.add
      .text(GAME_WIDTH - SIDEBAR_WIDTH - 10, 10, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        color: "#aab3d6",
      })
      .setOrigin(1, 0)
      .setDepth(11);
  }

  private createSidebar(): void {
    const x = GAME_WIDTH - SIDEBAR_WIDTH;
    this.add.rectangle(x, 0, SIDEBAR_WIDTH, GAME_HEIGHT, 0x161929).setOrigin(0, 0).setDepth(10);
    this.add
      .text(x + 12, 12, "세그먼트 목록", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setDepth(11);

    this.segMetaText = this.add
      .text(x + 12, GAME_HEIGHT - 220, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "12px",
        color: "#cccccc",
        wordWrap: { width: SIDEBAR_WIDTH - 24 },
      })
      .setDepth(11);
  }

  private rebuildSidebarList(): void {
    const x = GAME_WIDTH - SIDEBAR_WIDTH;
    // 이전 목록 제거
    this.children.list.filter((c) => c.getData("kind") === "seg-row").forEach((c) => c.destroy());

    this.state.segments.forEach((seg, i) => {
      const row = this.add.container(x + 12, 40 + i * 30).setDepth(11);
      row.setData("kind", "seg-row");
      const bg = this.add
        .rectangle(0, 0, SIDEBAR_WIDTH - 24, 26, seg.id === this.state.activeId ? 0x3b4a86 : 0x232846)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      bg.on("pointerdown", () => {
        this.state.activeId = seg.id;
        this.cancelArc();
        this.refreshAll();
      });
      const txt = this.add.text(8, 5, `${seg.id}  (d${seg.difficulty}, l${seg.length})`, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "12px",
        color: "#ffffff",
      });
      row.add([bg, txt]);
    });
  }

  private refreshSegMeta(): void {
    const seg = this.activeSegment();
    if (!seg) {
      this.segMetaText.setText("");
      return;
    }
    this.segMetaText.setText(
      `[ ${seg.id} ]\n` +
        `length: ${seg.length}\n` +
        `difficulty: ${seg.difficulty}\n` +
        `platforms: ${seg.platforms.length}\n` +
        `coins: ${seg.coins.length}\n\n` +
        `items: ${seg.items.length}\n` +
        `obstacles: ${seg.obstacles.length}\n\n` +
        `좌클릭: 도구 적용\n` +
        `우클릭(코인 모드): 시작점 초기화\n` +
        `Q/E: 아이템/장애물 종류`,
    );
  }

  private makeButton(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setDepth(11);
    const bg = this.add.rectangle(0, 0, w, h, 0x3a4170).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    const txt = this.add
      .text(w / 2, h / 2, label, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    c.add([bg, txt]);
    bg.on("pointerover", () => bg.setFillStyle(0x515ba0));
    bg.on("pointerout", () => bg.setFillStyle(0x3a4170));
    bg.on("pointerdown", () => {
      this.sound.play(SoundKey.Settings);
      onClick();
    });
    return c;
  }

  private setButtonLabel(button: Phaser.GameObjects.Container, label: string): void {
    const txt = button.list[1] as Phaser.GameObjects.Text;
    txt.setText(label);
  }

  private createCanvas(): void {
    this.canvasContainer = this.add.container(CANVAS_X, CANVAS_Y).setDepth(1);

    // 배경
    const bg = this.add.rectangle(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 0x0e1020).setOrigin(0, 0);
    this.canvasContainer.add(bg);

    this.gridGfx = this.add.graphics();
    this.guideGfx = this.add.graphics();
    this.platformGfx = this.add.graphics();
    this.coinGfx = this.add.graphics();
    this.itemGfx = this.add.graphics();
    this.obstacleGfx = this.add.graphics();
    this.arcGfx = this.add.graphics();
    this.previewGfx = this.add.graphics();
    this.canvasContainer.add([
      this.gridGfx,
      this.guideGfx,
      this.platformGfx,
      this.coinGfx,
      this.itemGfx,
      this.obstacleGfx,
      this.arcGfx,
      this.previewGfx,
    ]);

    // 플레이어 위치 마커
    const playerMarker = this.add.rectangle(PLAYER_X, GROUND_Y, 20, 60, 0xffd76b, 0.6).setOrigin(0.5, 1);
    this.canvasContainer.add(playerMarker);
  }

  // -------------------- 도구 동작 --------------------

  private setTool(t: Tool): void {
    this.tool = t;
    this.cancelArc();
    Object.entries(this.toolButtons).forEach(([k, btn]) => {
      const bg = btn.list[0] as Phaser.GameObjects.Rectangle;
      bg.setFillStyle(k === t ? 0x6b78d6 : 0x3a4170);
    });
    this.setStatus(`도구: ${t}`);
  }

  private cycleItemKind(): void {
    const index = ITEM_KINDS.indexOf(this.selectedItemKind);
    this.selectedItemKind = ITEM_KINDS[(index + 1) % ITEM_KINDS.length];
    this.setButtonLabel(this.itemKindButton, this.itemKindLabel());
    if (this.tool === "item") this.setStatus(`아이템: ${ITEM_LABELS[this.selectedItemKind]}`);
  }

  private cycleObstacleKind(): void {
    const index = OBSTACLE_KINDS.indexOf(this.selectedObstacleKind);
    this.selectedObstacleKind = OBSTACLE_KINDS[(index + 1) % OBSTACLE_KINDS.length];
    this.setButtonLabel(this.obstacleKindButton, this.obstacleKindLabel());
    if (this.tool === "obstacle") this.setStatus(`장애물: ${OBSTACLE_LABELS[this.selectedObstacleKind]}`);
  }

  private itemKindLabel(): string {
    return `Q 아이템: ${ITEM_LABELS[this.selectedItemKind]}`;
  }

  private obstacleKindLabel(): string {
    return `E 장애물: ${OBSTACLE_LABELS[this.selectedObstacleKind]}`;
  }

  private activeSegment(): MapSegment | undefined {
    return this.state.segments.find((s) => s.id === this.state.activeId);
  }

  private newSegment(): void {
    const id = `seg-${this.state.segments.length + 1}`;
    this.state.segments.push(emptySegment(id));
    this.state.activeId = id;
    this.refreshAll();
  }

  private deleteActive(): void {
    if (this.state.segments.length <= 1) {
      this.setStatus("최소 1개 세그먼트는 남아야 합니다");
      return;
    }
    this.state.segments = this.state.segments.filter((s) => s.id !== this.state.activeId);
    this.state.activeId = this.state.segments[0].id;
    this.refreshAll();
  }

  private onPointerDown(p: Phaser.Input.Pointer): void {
    if (!this.isInCanvas(p)) return;
    const { x, y } = this.toCanvas(p);
    const seg = this.activeSegment();
    if (!seg) return;

    if (this.tool === "platform") {
      this.dragStart = { x: snap(x), y: snap(y) };
    } else if (this.tool === "coin") {
      // 좌클릭이 첫 클릭이면 시작점 설정 → arc 그리기. 두 번째 클릭은 후보 토글로 작동.
      const candidate = this.findCandidateAt(x, y);
      if (candidate) {
        this.toggleCoinAt(candidate.x, candidate.y);
      } else {
        this.arcOrigin = { x: snap(x, 16), y: snap(y, 16) };
        this.refreshArc();
      }
    } else if (this.tool === "erase") {
      this.eraseAt(x, y);
    } else if (this.tool === "item") {
      const def: SegmentItemDef = {
        kind: this.selectedItemKind,
        x: snap(x, 16),
        y: snap(y, 16),
      };
      seg.items.push(def);
      this.refreshAll();
    } else if (this.tool === "obstacle") {
      const def: SegmentObstacleDef = {
        kind: this.selectedObstacleKind,
        x: snap(x, 16),
        y: snap(y, 16),
      };
      seg.obstacles.push(def);
      this.refreshAll();
    } else if (this.tool === "select") {
      // 선택 모드: 클릭한 오브젝트 정보 출력
      const plat = this.findPlatformAt(seg, x, y);
      const item = this.findItemAt(seg, x, y);
      const obs = this.findObstacleAt(seg, x, y);
      if (plat) this.setStatus(`platform (x=${plat.x}, y=${plat.y}, w=${plat.width})`);
      else if (item) this.setStatus(`item ${item.kind} (x=${item.x}, y=${item.y})`);
      else if (obs) this.setStatus(`obstacle ${obs.kind} (x=${obs.x}, y=${obs.y})`);
    }

    if (p.rightButtonDown() && this.tool === "coin") {
      this.cancelArc();
    }
  }

  private onPointerMove(p: Phaser.Input.Pointer): void {
    this.previewGfx.clear();
    if (!this.isInCanvas(p)) return;
    const { x, y } = this.toCanvas(p);
    if (this.tool === "platform" && this.dragStart && p.isDown) {
      const x1 = this.dragStart.x;
      const y1 = this.dragStart.y;
      const x2 = snap(x);
      const y2 = snap(y);
      this.previewGfx.fillStyle(0x9ad36b, 0.4);
      this.previewGfx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
    } else if (this.tool === "item") {
      this.drawItemMarker(this.previewGfx, snap(x, 16), snap(y, 16), this.selectedItemKind, 0.55);
    } else if (this.tool === "obstacle") {
      this.drawObstacleMarker(this.previewGfx, snap(x, 16), snap(y, 16), this.selectedObstacleKind, 0.55);
    }
  }

  private onPointerUp(p: Phaser.Input.Pointer): void {
    if (this.tool !== "platform" || !this.dragStart) return;
    const seg = this.activeSegment();
    if (!seg) return;
    const { x, y } = this.toCanvas(p);
    const x1 = this.dragStart.x;
    const y1 = this.dragStart.y;
    const x2 = snap(x);
    const y2 = snap(y);
    const width = Math.abs(x2 - x1);
    const height = Math.max(PLATFORM_DEFAULT_HEIGHT, Math.abs(y2 - y1));
    if (width >= GRID) {
      const def: PlatformDef = {
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width,
        height,
      };
      seg.platforms.push(def);
      this.refreshAll();
    }
    this.dragStart = undefined;
    this.previewGfx.clear();
  }

  private eraseAt(x: number, y: number): void {
    const seg = this.activeSegment();
    if (!seg) return;
    // 큰 오브젝트부터 지운 뒤 작은 오브젝트를 검사한다.
    const pi = seg.platforms.findIndex((p) => x >= p.x && x <= p.x + p.width && y >= p.y && y <= p.y + p.height);
    if (pi >= 0) {
      seg.platforms.splice(pi, 1);
      this.refreshAll();
      return;
    }
    const oi = seg.obstacles.findIndex((o) => Math.hypot(o.x - x, o.y - y) < this.obstaclePickRadius(o.kind));
    if (oi >= 0) {
      seg.obstacles.splice(oi, 1);
      this.refreshAll();
      return;
    }
    const ii = seg.items.findIndex((i) => Math.hypot(i.x - x, i.y - y) < 24);
    if (ii >= 0) {
      seg.items.splice(ii, 1);
      this.refreshAll();
      return;
    }
    const ci = seg.coins.findIndex((c) => Math.hypot(c.x - x, c.y - y) < 24);
    if (ci >= 0) {
      seg.coins.splice(ci, 1);
      this.refreshAll();
    }
  }

  private findPlatformAt(seg: MapSegment, x: number, y: number): PlatformDef | undefined {
    return seg.platforms.find((p) => x >= p.x && x <= p.x + p.width && y >= p.y && y <= p.y + p.height);
  }

  private findItemAt(seg: MapSegment, x: number, y: number): SegmentItemDef | undefined {
    return seg.items.find((i) => Math.hypot(i.x - x, i.y - y) < 24);
  }

  private findObstacleAt(seg: MapSegment, x: number, y: number): SegmentObstacleDef | undefined {
    return seg.obstacles.find((o) => Math.hypot(o.x - x, o.y - y) < this.obstaclePickRadius(o.kind));
  }

  private findCandidateAt(x: number, y: number): { x: number; y: number } | undefined {
    return this.snapCandidates.find((c) => Math.hypot(c.x - x, c.y - y) < 18);
  }

  private toggleCoinAt(x: number, y: number): void {
    const seg = this.activeSegment();
    if (!seg) return;
    const existingIdx = seg.coins.findIndex((c) => Math.hypot(c.x - x, c.y - y) < 6);
    if (existingIdx >= 0) {
      seg.coins.splice(existingIdx, 1);
    } else {
      const def: CoinDef = { x: Math.round(x), y: Math.round(y) };
      seg.coins.push(def);
    }
    this.refreshAll();
  }

  private cancelArc(): void {
    this.arcOrigin = undefined;
    this.snapCandidates = [];
    this.arcGfx.clear();
  }

  private refreshArc(): void {
    this.arcGfx.clear();
    this.snapCandidates = [];
    if (!this.arcOrigin) return;

    const arc = sampleArc(this.arcOrigin.x, this.arcOrigin.y, this.arcDouble, GROUND_Y);
    if (arc.length === 0) return;

    this.arcGfx.lineStyle(2, 0xffd76b, 0.5);
    this.arcGfx.beginPath();
    this.arcGfx.moveTo(arc[0].x, arc[0].y);
    for (let i = 1; i < arc.length; i += 1) this.arcGfx.lineTo(arc[i].x, arc[i].y);
    this.arcGfx.strokePath();

    this.snapCandidates = snapPointsAlongArc(arc, 36).map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }));
    for (const c of this.snapCandidates) {
      this.arcGfx.fillStyle(0xffd76b, 0.45);
      this.arcGfx.fillCircle(c.x, c.y, 6);
    }
  }

  // -------------------- 렌더링 --------------------

  private refreshAll(): void {
    this.drawGrid();
    this.drawGuides();
    this.drawSegment();
    this.refreshArc();
    this.refreshSegMeta();
    this.rebuildSidebarList();
    saveState(this.state);
  }

  private drawGrid(): void {
    this.gridGfx.clear();
    this.gridGfx.lineStyle(1, 0x232846, 1);
    for (let x = 0; x <= CANVAS_WIDTH; x += GRID) {
      this.gridGfx.moveTo(x, 0);
      this.gridGfx.lineTo(x, CANVAS_HEIGHT);
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += GRID) {
      this.gridGfx.moveTo(0, y);
      this.gridGfx.lineTo(CANVAS_WIDTH, y);
    }
    this.gridGfx.strokePath();
  }

  private drawGuides(): void {
    this.guideGfx.clear();
    // GROUND_Y 가이드
    this.guideGfx.lineStyle(2, 0x76d36b, 0.7);
    this.guideGfx.beginPath();
    this.guideGfx.moveTo(0, GROUND_Y);
    this.guideGfx.lineTo(CANVAS_WIDTH, GROUND_Y);
    this.guideGfx.strokePath();
    // length 끝선
    const seg = this.activeSegment();
    if (seg) {
      this.guideGfx.lineStyle(1, 0xd66b9a, 0.5);
      this.guideGfx.beginPath();
      this.guideGfx.moveTo(seg.length, 0);
      this.guideGfx.lineTo(seg.length, CANVAS_HEIGHT);
      this.guideGfx.strokePath();
    }
  }

  private drawSegment(): void {
    this.platformGfx.clear();
    this.coinGfx.clear();
    this.itemGfx.clear();
    this.obstacleGfx.clear();
    const seg = this.activeSegment();
    if (!seg) return;

    for (const p of seg.platforms) {
      this.platformGfx.fillStyle(0x6b9351, 0.85);
      this.platformGfx.fillRect(p.x, p.y, p.width, p.height);
      this.platformGfx.lineStyle(2, 0x2f4a25, 1);
      this.platformGfx.strokeRect(p.x, p.y, p.width, p.height);
    }

    for (const c of seg.coins) {
      this.coinGfx.fillStyle(0xffd73d, 1);
      this.coinGfx.fillCircle(c.x, c.y, 7);
      this.coinGfx.lineStyle(2, 0xb38600, 1);
      this.coinGfx.strokeCircle(c.x, c.y, 7);
    }

    for (const item of seg.items) {
      this.drawItemMarker(this.itemGfx, item.x, item.y, item.kind, 1);
    }

    for (const obstacle of seg.obstacles) {
      this.drawObstacleMarker(this.obstacleGfx, obstacle.x, obstacle.y, obstacle.kind, 1);
    }
  }

  private drawItemMarker(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    kind: PlaceableItemKind,
    alpha: number,
  ): void {
    gfx.fillStyle(ITEM_COLORS[kind], alpha);
    gfx.fillCircle(x, y, 13);
    gfx.lineStyle(2, 0xffffff, alpha);
    gfx.strokeCircle(x, y, 13);
  }

  private drawObstacleMarker(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    kind: ObstacleKind,
    alpha: number,
  ): void {
    gfx.fillStyle(OBSTACLE_COLORS[kind], alpha);
    if (kind === "fire_smoke") {
      gfx.fillEllipse(x, y, 110, 54);
      gfx.fillStyle(0xff6a2a, alpha * 0.45);
      gfx.fillCircle(x - 24, y + 3, 14);
      gfx.fillCircle(x + 22, y + 4, 12);
    } else if (kind === "pillar") {
      gfx.fillRoundedRect(x - 26, y - 78, 52, 156, 8);
    } else {
      gfx.fillRoundedRect(x - 40, y - 34, 80, 68, 8);
    }
    gfx.lineStyle(2, 0xffffff, alpha * 0.8);
    gfx.strokeCircle(x, y, this.obstaclePickRadius(kind));
  }

  private obstaclePickRadius(kind: ObstacleKind): number {
    if (kind === "fire_smoke") return 58;
    if (kind === "pillar") return 42;
    return 40;
  }

  private isInCanvas(p: Phaser.Input.Pointer): boolean {
    return p.x >= CANVAS_X && p.x <= CANVAS_X + CANVAS_WIDTH && p.y >= CANVAS_Y && p.y <= CANVAS_Y + CANVAS_HEIGHT;
  }

  private toCanvas(p: Phaser.Input.Pointer): { x: number; y: number } {
    return { x: p.x - CANVAS_X, y: p.y - CANVAS_Y };
  }

  private setStatus(s: string): void {
    this.statusText.setText(s);
  }

  // -------------------- 외부 동작 --------------------

  private testPlay(): void {
    const seg = this.activeSegment();
    if (!seg) return;
    saveState(this.state);
    this.scene.start("GameScene", { run: new RunState(), testSegment: seg });
  }

  private exportTS(): void {
    const lines: string[] = [];
    lines.push("// 클립보드에서 src/data/segments.ts 의 SEGMENTS 배열에 붙여넣으세요.");
    lines.push("export const EXPORTED_SEGMENTS: MapSegment[] = [");
    for (const seg of this.state.segments) {
      lines.push("  {");
      lines.push(`    id: ${JSON.stringify(seg.id)},`);
      lines.push(`    length: ${seg.length},`);
      lines.push(`    difficulty: ${seg.difficulty},`);
      lines.push(`    entryGroundY: ${seg.entryGroundY},`);
      lines.push(`    exitGroundY: ${seg.exitGroundY},`);
      lines.push("    platforms: [");
      for (const p of seg.platforms) {
        lines.push(`      { x: ${p.x}, y: ${p.y}, width: ${p.width}, height: ${p.height} },`);
      }
      lines.push("    ],");
      lines.push("    coins: [");
      for (const c of seg.coins) {
        lines.push(`      { x: ${c.x}, y: ${c.y} },`);
      }
      lines.push("    ],");
      lines.push("    items: [");
      for (const item of seg.items) {
        lines.push(`      { kind: ${JSON.stringify(item.kind)}, x: ${item.x}, y: ${item.y} },`);
      }
      lines.push("    ],");
      lines.push("    obstacles: [");
      for (const obstacle of seg.obstacles) {
        lines.push(`      { kind: ${JSON.stringify(obstacle.kind)}, x: ${obstacle.x}, y: ${obstacle.y} },`);
      }
      lines.push("    ],");
      lines.push("  },");
    }
    lines.push("];");
    const text = lines.join("\n");

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(
        () => this.setStatus("Export TS → 클립보드 복사됨"),
        () => {
          window.prompt("Export TS (수동 복사)", text);
          this.setStatus("Export TS (수동 프롬프트)");
        },
      );
    } else {
      window.prompt("Export TS (수동 복사)", text);
      this.setStatus("Export TS (수동 프롬프트)");
    }
  }

  private importTS(): void {
    const txt = window.prompt("MapSegment[] 형태의 TS/JSON 붙여넣기 (배열 부분만)");
    if (!txt) return;
    try {
      // 배열 형태만 추출하여 평가 (단순 JSON.parse는 키 미인용으로 실패할 수 있어 Function 사용)
      // 안전성: 에디터는 사용자 본인이 직접 붙여넣는 도구이므로 Function 사용 허용
      const arr = new Function(`return (${txt});`)() as MapSegment[];
      if (!Array.isArray(arr)) throw new Error("not array");
      this.state.segments = arr.map(normalizeSegment);
      this.state.activeId = arr[0]?.id ?? "seg-1";
      this.refreshAll();
      this.setStatus(`Import 완료: ${arr.length}개 세그먼트`);
    } catch (e) {
      this.setStatus(`Import 실패: ${(e as Error).message}`);
    }
  }

  private exitToMenu(): void {
    saveState(this.state);
    this.scene.start("MainMenuScene");
  }
}

/** 빌트인 SEGMENTS를 한 번에 에디터로 가져오기 위한 헬퍼 (필요 시 콘솔에서 사용) */
export function importBuiltinSegments(): EditorState {
  return { segments: SEGMENTS.map((s) => normalizeSegment({ ...s })), activeId: SEGMENTS[0]?.id ?? "seg-1" };
}
