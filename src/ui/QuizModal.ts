import * as Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "@/config";
import type { QuizQuestion } from "@/data/quizzes";

const FONT = "system-ui, -apple-system, sans-serif";
const TIME_LIMIT_MS = 6000;
const PANEL_W = 980;
const PANEL_H = 540;

export type QuizResult = "correct" | "wrong" | "timeout";
export type QuizDoneCallback = (result: QuizResult, question: QuizQuestion) => void;

export class QuizModal {
  private container: Phaser.GameObjects.Container;
  private timerEvent: Phaser.Time.TimerEvent;
  private timerBar: Phaser.GameObjects.Graphics;
  private msLeft = TIME_LIMIT_MS;
  private resolved = false;
  private explanationContainer?: Phaser.GameObjects.Container;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly question: QuizQuestion,
    private readonly onDone: QuizDoneCallback,
  ) {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const overlay = scene.add.graphics();
    overlay.fillStyle(0x000000, 0.65);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const panel = scene.add.graphics();
    panel.fillStyle(0x1f2540, 0.98);
    panel.fillRoundedRect(-PANEL_W / 2, -PANEL_H / 2, PANEL_W, PANEL_H, 24);
    panel.lineStyle(3, 0xffb84d, 1);
    panel.strokeRoundedRect(-PANEL_W / 2, -PANEL_H / 2, PANEL_W, PANEL_H, 24);

    const tag = scene.add
      .text(0, -PANEL_H / 2 + 36, "📜  재난 상식 퀴즈", {
        fontFamily: FONT,
        fontSize: "22px",
        color: "#ffb84d",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const questionText = scene.add
      .text(0, -PANEL_H / 2 + 100, this.question.question, {
        fontFamily: FONT,
        fontSize: "30px",
        color: "#ffffff",
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: PANEL_W - 80 },
      })
      .setOrigin(0.5, 0);

    const choiceObjs: Phaser.GameObjects.Container[] = [];
    const choiceStartY = -PANEL_H / 2 + 220;
    this.question.choices.forEach((choiceText, idx) => {
      const c = this.makeChoice(idx, choiceText, choiceStartY + idx * 64);
      choiceObjs.push(c);
    });

    this.timerBar = scene.add.graphics();

    this.container = scene.add
      .container(cx, cy, [overlay.setPosition(-cx, -cy), panel, tag, questionText, ...choiceObjs, this.timerBar])
      .setDepth(5000)
      .setScrollFactor(0);

    this.drawTimerBar();

    this.timerEvent = scene.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        this.msLeft -= 50;
        this.drawTimerBar();
        if (this.msLeft <= 0) this.finish("timeout", -1);
      },
    });
  }

  private makeChoice(idx: number, text: string, y: number): Phaser.GameObjects.Container {
    const w = PANEL_W - 80;
    const h = 56;
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x2d3560, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    bg.lineStyle(2, 0x4a5290, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);

    const labelChar = ["①", "②", "③", "④"][idx] ?? `${idx + 1}`;
    const label = this.scene.add
      .text(-w / 2 + 28, 0, labelChar, {
        fontFamily: FONT,
        fontSize: "26px",
        color: "#ffb84d",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    const txt = this.scene.add
      .text(-w / 2 + 70, 0, text, {
        fontFamily: FONT,
        fontSize: "22px",
        color: "#ffffff",
      })
      .setOrigin(0, 0.5);

    const hit = this.scene.add
      .zone(0, 0, w, h)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    hit.on("pointerover", () => {
      if (this.resolved) return;
      bg.clear();
      bg.fillStyle(0x3a4480, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
      bg.lineStyle(2, 0xffb84d, 1);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
    });
    hit.on("pointerout", () => {
      if (this.resolved) return;
      bg.clear();
      bg.fillStyle(0x2d3560, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
      bg.lineStyle(2, 0x4a5290, 1);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
    });
    hit.on("pointerdown", () => {
      if (this.resolved) return;
      this.finish(idx === this.question.answerIndex ? "correct" : "wrong", idx);
    });

    const keyName = ["ONE", "TWO", "THREE", "FOUR"][idx] ?? "";
    if (keyName) {
      this.scene.input.keyboard?.once(`keydown-${keyName}`, () => {
        if (this.resolved) return;
        this.finish(idx === this.question.answerIndex ? "correct" : "wrong", idx);
      });
    }

    return this.scene.add.container(0, y, [bg, label, txt, hit]);
  }

  private drawTimerBar(): void {
    const w = PANEL_W - 80;
    const h = 10;
    const y = PANEL_H / 2 - 40;
    const ratio = Math.max(0, this.msLeft / TIME_LIMIT_MS);
    this.timerBar.clear();
    this.timerBar.fillStyle(0x000000, 0.4);
    this.timerBar.fillRoundedRect(-w / 2, y, w, h, 5);
    const color = ratio > 0.5 ? 0x4caf50 : ratio > 0.25 ? 0xffc107 : 0xff5252;
    this.timerBar.fillStyle(color, 1);
    this.timerBar.fillRoundedRect(-w / 2, y, w * ratio, h, 5);
  }

  private finish(result: QuizResult, _picked: number): void {
    if (this.resolved) return;
    this.resolved = true;
    this.timerEvent.remove(false);
    this.showExplanation(result);
  }

  private showExplanation(result: QuizResult): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.55);
    bg.fillRect(-cx, -cy, GAME_WIDTH, GAME_HEIGHT);

    const headerColor = result === "correct" ? "#4caf50" : "#ff7a59";
    const headerText =
      result === "correct"
        ? "✅ 정답! +50 코인"
        : result === "wrong"
          ? "✖ 오답"
          : "⏱ 시간 초과";

    const W = 880;
    const H = 360;
    const panel = this.scene.add.graphics();
    panel.fillStyle(0x1f2540, 0.98);
    panel.fillRoundedRect(-W / 2, -H / 2, W, H, 24);
    panel.lineStyle(3, result === "correct" ? 0x4caf50 : 0xff7a59, 1);
    panel.strokeRoundedRect(-W / 2, -H / 2, W, H, 24);

    const header = this.scene.add
      .text(0, -H / 2 + 40, headerText, {
        fontFamily: FONT,
        fontSize: "30px",
        color: headerColor,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const correctChoice = `정답: ${["①", "②", "③", "④"][this.question.answerIndex]} ${this.question.choices[this.question.answerIndex]}`;
    const correctText = this.scene.add
      .text(0, -H / 2 + 90, correctChoice, {
        fontFamily: FONT,
        fontSize: "20px",
        color: "#ffb84d",
        align: "center",
        wordWrap: { width: W - 80 },
      })
      .setOrigin(0.5, 0);

    const explain = this.scene.add
      .text(0, -H / 2 + 160, this.question.explanation, {
        fontFamily: FONT,
        fontSize: "18px",
        color: "#dddddd",
        align: "center",
        wordWrap: { width: W - 80 },
      })
      .setOrigin(0.5, 0);

    const source = this.scene.add
      .text(0, H / 2 - 70, `출처: ${this.question.source}`, {
        fontFamily: FONT,
        fontSize: "14px",
        color: "#888888",
      })
      .setOrigin(0.5, 0);

    const cont = this.scene.add
      .text(0, H / 2 - 36, "탭 / Space — 계속", {
        fontFamily: FONT,
        fontSize: "16px",
        color: "#ffffff",
      })
      .setOrigin(0.5, 0);

    this.explanationContainer = this.scene.add
      .container(cx, cy, [bg.setPosition(-cx, -cy), panel, header, correctText, explain, source, cont])
      .setDepth(5100)
      .setScrollFactor(0);

    const close = () => {
      if (!this.explanationContainer) return;
      this.explanationContainer.destroy(true);
      this.explanationContainer = undefined;
      this.container.destroy(true);
      this.onDone(result, this.question);
    };

    this.scene.input.keyboard?.once("keydown-SPACE", close);
    this.scene.input.keyboard?.once("keydown-ENTER", close);
    this.scene.input.once(Phaser.Input.Events.POINTER_DOWN, close);
  }

  public destroy(): void {
    this.timerEvent.remove(false);
    this.container.destroy(true);
    this.explanationContainer?.destroy(true);
  }
}
