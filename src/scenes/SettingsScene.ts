import * as Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "@/config";
import { makeButton } from "@/ui/button";

const FONT = "'Ramche', system-ui, sans-serif";

const LICENSE_TEXT = [
  "── Fonts ──────────────────────────────────────────────",
  "",
  "Ramche (램체)",
  "  © (주)이키나게임즈  |  ikinagames.com",
  "",
  "── Open Source Libraries ──────────────────────────────",
  "",
  "Phaser 4",
  "  © Richard Davey & Photon Storm Ltd.",
  "  MIT License  |  phaser.io",
  "",
  "Vite 8",
  "  © Evan You & Vite Contributors",
  "  MIT License  |  vitejs.dev",
  "",
  "TypeScript 6",
  "  © Microsoft Corporation",
  "  Apache-2.0 License  |  typescriptlang.org",
].join("\n");

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super("SettingsScene");
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x0f0f1a);

    this.add
      .text(cx, 90, "설정", {
        fontFamily: FONT,
        fontSize: "64px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add.rectangle(cx, 140, GAME_WIDTH - 200, 1, 0x334466);

    makeButton(this, 80, 55, "← 뒤로", () => this.scene.start("MainMenuScene"), {
      width: 130,
      height: 42,
      bgColor: 0x1a1a30,
      fontSize: "19px",
      textColor: "#7777aa",
    });

    // placeholder area
    this.add
      .text(cx, cy, "추가 설정 항목은 업데이트 예정입니다", {
        fontFamily: FONT,
        fontSize: "18px",
        color: "#333355",
      })
      .setOrigin(0.5);

    this.add.rectangle(cx, GAME_HEIGHT - 64, GAME_WIDTH - 200, 1, 0x222244);

    makeButton(
      this,
      cx,
      GAME_HEIGHT - 32,
      "Open Source License",
      () => this.openLicenseModal(),
      {
        width: 230,
        height: 34,
        bgColor: 0x0f0f1a,
        fontSize: "15px",
        textColor: "#444466",
      }
    );
  }

  private openLicenseModal(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const PW = 740;
    const PH = 570;

    const dim = this.add
      .rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.82)
      .setInteractive();

    const panel = this.add
      .rectangle(cx, cy, PW, PH, 0x111128)
      .setStrokeStyle(1, 0x334466);

    const titleTxt = this.add
      .text(cx, cy - PH / 2 + 42, "Open Source Licenses", {
        fontFamily: FONT,
        fontSize: "22px",
        color: "#aaaacc",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const divider = this.add.rectangle(
      cx,
      cy - PH / 2 + 72,
      PW - 48,
      1,
      0x334466
    );

    const licenseTxt = this.add
      .text(cx - PW / 2 + 44, cy - PH / 2 + 90, LICENSE_TEXT, {
        fontFamily: FONT,
        fontSize: "14px",
        color: "#8888aa",
        lineSpacing: 5,
      });

    const closeBg = this.add
      .rectangle(cx, cy + PH / 2 - 32, 130, 40, 0x1e1e44)
      .setInteractive({ useHandCursor: true });
    const closeTxt = this.add
      .text(cx, cy + PH / 2 - 32, "닫기", {
        fontFamily: FONT,
        fontSize: "17px",
        color: "#aaaacc",
      })
      .setOrigin(0.5);

    const all = [dim, panel, titleTxt, divider, licenseTxt, closeBg, closeTxt];
    const closeAll = () => all.forEach((o) => o.destroy());

    closeBg.on("pointerover", () => closeBg.setAlpha(0.65));
    closeBg.on("pointerout", () => closeBg.setAlpha(1));
    closeBg.on("pointerup", closeAll);
  }
}
