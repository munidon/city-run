import * as Phaser from "phaser";
import { AssetKey } from "@/assets";
import { GAME_HEIGHT, GAME_WIDTH, GROUND_Y } from "@/config";
import { Item, type ItemKind } from "@/objects/Item";
import { Platform } from "@/objects/Platform";
import { QuizModal } from "@/ui/QuizModal";
import { CHAPTER_1_QUIZZES } from "@/data/quizzes";
import { getSegmentById, type MapSegment } from "@/data/segments";

const FONT = "'Ramche', system-ui, sans-serif";

type PresentationShotMode =
  | "player-run"
  | "player-jump"
  | "player-slide"
  | "player-hit"
  | "items"
  | "obstacles"
  | "quiz-correct"
  | "quiz-wrong"
  | "map-flat"
  | "map-platforms"
  | "map-high";

type PlayerShotMode = Extract<PresentationShotMode, "player-run" | "player-jump" | "player-slide" | "player-hit">;

const ITEM_LABELS: Array<{ kind: ItemKind; label: string }> = [
  { kind: "gimbap", label: "김밥" },
  { kind: "bento", label: "도시락" },
  { kind: "energy_drink", label: "에너지 드링크" },
  { kind: "fire_extinguisher", label: "소화기" },
  { kind: "gas_mask", label: "방독면" },
  { kind: "wet_towel", label: "젖은 수건" },
  { kind: "coin", label: "코인" },
];

export class PresentationShotScene extends Phaser.Scene {
  private mode: PresentationShotMode = "items";

  constructor() {
    super("PresentationShotScene");
  }

  init(data: { mode?: PresentationShotMode } = {}): void {
    this.mode = data.mode ?? "items";
  }

  create(): void {
    if (this.mode.startsWith("quiz-")) {
      this.createQuizExplanation(this.mode === "quiz-correct" ? "correct" : "wrong");
      return;
    }

    this.createCityBackground(this.mode.startsWith("map-"));

    if (this.mode.startsWith("player-")) this.createPlayerCloseup(this.mode as PlayerShotMode);
    else if (this.mode === "items") this.createItemGallery();
    else if (this.mode === "obstacles") this.createObstacleGallery();
    else if (this.mode === "map-flat") this.createMapSegment("flat-warmup", "평지 구간");
    else if (this.mode === "map-platforms") this.createMapSegment("gap-jumps", "연속 발판 점프 구간");
    else if (this.mode === "map-high") this.createMapSegment("high-platform", "높은 발판 구간");
  }

  private createCityBackground(flood = false): void {
    const farKey = flood ? AssetKey.BackgroundBackFlood : AssetKey.BackgroundBack;
    const midKey = flood ? AssetKey.BackgroundMidFlood : AssetKey.BackgroundMid;

    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, farKey).setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(0);
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, midKey).setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(1);
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT - 76, AssetKey.Road).setDisplaySize(GAME_WIDTH, 260).setDepth(2);
    this.add.rectangle(GAME_WIDTH / 2, 40, GAME_WIDTH, 80, 0x07131f, 0.5).setDepth(10);
  }

  private title(text: string): void {
    this.add
      .text(GAME_WIDTH / 2, 38, text, {
        fontFamily: FONT,
        fontSize: "34px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(100);
  }

  private createPlayerCloseup(mode: PlayerShotMode): void {
    const specs: Record<PlayerShotMode, { title: string; key: string; frame: string; w: number; h: number }> = {
      "player-run": { title: "플레이어 캐릭터 한도시 · 기본 달리기", key: AssetKey.Player, frame: "sprite4", w: 150, h: 260 },
      "player-jump": { title: "플레이어 캐릭터 한도시 · 점프 동작", key: AssetKey.PlayerJump, frame: "jump3", w: 150, h: 260 },
      "player-slide": { title: "플레이어 캐릭터 한도시 · 슬라이드 동작", key: AssetKey.PlayerSlide, frame: "slide1", w: 300, h: 184 },
      "player-hit": { title: "플레이어 캐릭터 한도시 · 피격 애니메이션", key: AssetKey.Player, frame: "sprite9", w: 150, h: 260 },
    };
    const spec = specs[mode];

    this.title(spec.title);
    this.add
      .sprite(GAME_WIDTH / 2, mode === "player-slide" ? 455 : 475, spec.key, spec.frame)
      .setOrigin(0.5, 1)
      .setDisplaySize(spec.w, spec.h)
      .setDepth(40);
  }

  private createItemGallery(): void {
    this.title("아이템 종류");
    const startX = 145;
    const y = 330;
    const gap = 160;

    ITEM_LABELS.forEach((entry, idx) => {
      const x = startX + idx * gap;
      const item = new Item(this, x, y, entry.kind);
      item.setDisplaySize(entry.kind === "coin" ? 72 : 96, entry.kind === "coin" ? 72 : 96);
      item.setDepth(40);
      this.add
        .text(x, y + 88, entry.label, {
          fontFamily: FONT,
          fontSize: "22px",
          color: "#ffffff",
          align: "center",
        })
        .setOrigin(0.5)
        .setDepth(50);
    });

    this.add.image(GAME_WIDTH / 2 - 60, 505, AssetKey.Scroll).setDisplaySize(100, 100).setDepth(40);
    this.add
      .text(GAME_WIDTH / 2 + 40, 505, "두루마리 · 퀴즈 아이템", {
        fontFamily: FONT,
        fontSize: "28px",
        color: "#ffcf72",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5)
      .setDepth(50);
  }

  private createObstacleGallery(): void {
    this.title("장애물 종류");
    const entries = [
      { key: AssetKey.ObstacleSmoke, label: "상자형 장애물", w: 165, h: 138 },
      { key: AssetKey.ObstaclePillar, label: "기둥형 장애물", w: 124, h: 230 },
      { key: AssetKey.ObstacleFireSmoke, label: "화염 연기형 장애물", w: 250, h: 250 },
    ];
    const xs = [300, 640, 980];

    entries.forEach((entry, idx) => {
      const x = xs[idx];
      this.add.image(x, 385, entry.key).setDisplaySize(entry.w, entry.h).setDepth(40);
      this.add
        .text(x, 560, entry.label, {
          fontFamily: FONT,
          fontSize: "28px",
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(50);
    });
  }

  private createQuizExplanation(result: "correct" | "wrong"): void {
    this.createCityBackground(false);
    const modal = new QuizModal(this, CHAPTER_1_QUIZZES[0], () => undefined);
    this.time.delayedCall(150, () => {
      (modal as unknown as { finish: (result: "correct" | "wrong", picked: number) => void }).finish(
        result,
        result === "correct" ? CHAPTER_1_QUIZZES[0].answerIndex : 0,
      );
    });
  }

  private createMapSegment(id: string, title: string): void {
    this.title(title);
    const segment = getSegmentById(id);
    if (!segment) return;

    this.add.sprite(210, GROUND_Y, AssetKey.Player, "sprite4").setOrigin(0.5, 1).setDisplaySize(75, 130).setDepth(40);
    this.renderSegment(segment, 80);
  }

  private renderSegment(segment: MapSegment, offsetX: number): void {
    for (const platform of segment.platforms) {
      new Platform(this, offsetX + platform.x, platform.y, platform.width, platform.height).setDepth(35);
    }

    for (const coin of segment.coins) {
      const item = new Item(this, offsetX + coin.x, coin.y, "coin");
      item.setDepth(45);
    }
  }
}
