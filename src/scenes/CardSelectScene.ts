import * as Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "@/config";
import { Card, CardCategory, pickThreeCards } from "@/data/cards";
import { RunState } from "@/state/RunState";

const FONT = "'Ramche', system-ui, sans-serif";

const CATEGORY_COLOR: Record<CardCategory, number> = {
  permanent: 0x4caf50,
  one_shot: 0xffd73d,
  risk_reward: 0xff5252,
};

const CATEGORY_LABEL: Record<CardCategory, string> = {
  permanent: "🟢 영구 패시브",
  one_shot: "🟡 일회성 강화",
  risk_reward: "🔴 리스크-리워드",
};

const RARITY_LABEL: Record<string, string> = {
  common: "일반",
  rare: "희귀",
  legendary: "전설",
};

export class CardSelectScene extends Phaser.Scene {
  private run!: RunState;
  private cards: Card[] = [];

  constructor() {
    super("CardSelectScene");
  }

  init(data: { run: RunState }): void {
    this.run = data.run;
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.add.graphics().fillStyle(0x0a0c1a, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.add
      .text(cx, 70, `✨ Stage ${this.run.stageIndex} 클리어`, {
        fontFamily: FONT,
        fontSize: "44px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 130, `누적 코인: 🪙 ${this.run.totalCoins}  ·  카드 1장을 선택하세요`, {
        fontFamily: FONT,
        fontSize: "20px",
        color: "#cccccc",
      })
      .setOrigin(0.5);

    this.cards = pickThreeCards(this.run.pickedCardIds);

    const cardW = 320;
    const cardH = 380;
    const gap = 40;
    const totalW = cardW * 3 + gap * 2;
    const startX = cx - totalW / 2 + cardW / 2;
    const cardY = cy + 30;

    this.cards.forEach((card, idx) => {
      const x = startX + idx * (cardW + gap);
      this.makeCard(card, x, cardY, cardW, cardH);
    });

    this.input.keyboard?.once("keydown-ONE", () => this.choose(0));
    this.input.keyboard?.once("keydown-TWO", () => this.choose(1));
    this.input.keyboard?.once("keydown-THREE", () => this.choose(2));
  }

  private makeCard(card: Card, x: number, y: number, w: number, h: number): void {
    const accent = CATEGORY_COLOR[card.category];

    const bg = this.add.graphics();
    const drawBg = (highlight: boolean) => {
      bg.clear();
      bg.fillStyle(highlight ? 0x2d3560 : 0x1c2240, 1);
      bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 18);
      bg.lineStyle(highlight ? 4 : 3, accent, 1);
      bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 18);
    };
    drawBg(false);

    this.add
      .text(x, y - h / 2 + 28, CATEGORY_LABEL[card.category], {
        fontFamily: FONT,
        fontSize: "16px",
        color: Phaser.Display.Color.IntegerToColor(accent).rgba,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(x, y - h / 2 + 56, RARITY_LABEL[card.rarity] ?? card.rarity, {
        fontFamily: FONT,
        fontSize: "13px",
        color: "#888888",
      })
      .setOrigin(0.5);

    this.add
      .text(x, y - 30, card.title, {
        fontFamily: FONT,
        fontSize: "26px",
        color: "#ffffff",
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: w - 40 },
      })
      .setOrigin(0.5);

    this.add
      .text(x, y + 60, card.description, {
        fontFamily: FONT,
        fontSize: "16px",
        color: "#bbbbbb",
        align: "center",
        wordWrap: { width: w - 40 },
      })
      .setOrigin(0.5, 0);

    const idx = this.cards.indexOf(card);
    const labelChar = ["①", "②", "③"][idx] ?? `${idx + 1}`;
    this.add
      .text(x, y + h / 2 - 32, `${labelChar}  탭 / ${idx + 1}`, {
        fontFamily: FONT,
        fontSize: "14px",
        color: "#888888",
      })
      .setOrigin(0.5);

    const hit = this.add
      .zone(x, y, w, h)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    hit.on("pointerover", () => drawBg(true));
    hit.on("pointerout", () => drawBg(false));
    hit.on("pointerdown", () => this.choose(idx));
  }

  private choose(idx: number): void {
    const card = this.cards[idx];
    if (!card) return;
    card.apply(this.run);
    this.run.pickedCardIds.push(card.id);
    this.run.stageIndex += 1;
    this.scene.start("GameScene", { run: this.run });
  }
}
