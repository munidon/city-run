import * as Phaser from "phaser";
import { SoundKey } from "@/assets";
import { GAME_HEIGHT, GAME_WIDTH } from "@/config";
import { RunState } from "@/state/RunState";
import { makeButton } from "@/ui/button";

const FONT = "'Ramche', system-ui, sans-serif";
const HP_SCORE = 10;

interface FinalScoreSceneData {
  run: RunState;
  stageCoins: number;
  remainingHp: number;
  maxHp: number;
}

export class FinalScoreScene extends Phaser.Scene {
  private run!: RunState;
  private remainingHp = 0;
  private maxHp = 100;

  constructor() {
    super("FinalScoreScene");
  }

  init(data: FinalScoreSceneData): void {
    this.run = data.run;
    this.remainingHp = Math.max(0, Math.ceil(data.remainingHp));
    this.maxHp = data.maxHp;
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

    this.add.graphics().fillStyle(0x07131f, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.add
      .rectangle(cx, GAME_HEIGHT / 2, 760, 470, 0x10253a, 0.94)
      .setStrokeStyle(3, 0x49b7ff, 0.9);

    this.add
      .text(cx, 185, "최종 점수", {
        fontFamily: FONT,
        fontSize: "58px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 245, "수고하셨습니다!", {
        fontFamily: FONT,
        fontSize: "22px",
        color: "#a9dfff",
      })
      .setOrigin(0.5);

    const totalCoins = this.run.totalCoins;
    const coinScore = totalCoins;
    const hpScore = this.remainingHp * HP_SCORE;
    const baseScore = coinScore + hpScore;
    const finalScore = Math.round(baseScore * this.run.scoreMul);

    this.addResultRow(330, "총 획득 코인", `${totalCoins}개`, `+${coinScore}`);

    this.addResultRow(390, "남은 체력", `${this.remainingHp}/${this.maxHp}`, `+${hpScore}`);
    if (this.run.scoreMul !== 1) {
      this.addResultRow(450, "점수 배율", `x${this.run.scoreMul.toFixed(1)}`, `${finalScore}`);
    }

    this.add
      .text(cx, 500, `${finalScore.toLocaleString()} 점`, {
        fontFamily: FONT,
        fontSize: "54px",
        color: "#ffd85c",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    makeButton(this, cx, GAME_HEIGHT - 110, "확인", () => this.goMain(), {
      width: 260,
      height: 64,
      bgColor: 0x1f6f9f,
      fontSize: "28px",
      textColor: "#e8f8ff",
      soundKey: SoundKey.Settings,
    });

    this.input.keyboard?.once("keydown-ENTER", () => this.goMain());
    this.input.keyboard?.once("keydown-SPACE", () => this.goMain());
  }

  private addResultRow(y: number, label: string, value: string, score: string): void {
    this.add
      .text(345, y, label, {
        fontFamily: FONT,
        fontSize: "24px",
        color: "#dcefff",
      })
      .setOrigin(0, 0.5);

    this.add
      .text(685, y, value, {
        fontFamily: FONT,
        fontSize: "26px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(1, 0.5);

    if (!score) return;

    this.add
      .text(820, y, score, {
        fontFamily: FONT,
        fontSize: "24px",
        color: "#ffd85c",
      })
      .setOrigin(1, 0.5);
  }

  private goMain(): void {
    this.scene.start("MainMenuScene");
  }
}
