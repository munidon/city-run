import * as Phaser from "phaser";
import { SoundKey } from "@/assets";
import { GAME_HEIGHT, GAME_WIDTH } from "@/config";
import { getBgmVolume, setBgmVolume } from "@/settings";
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
  "",
  "── Sound Effects ─────────────────────────────────────",
  "",
  "8-bit / 16-bit Sound Effects (x25) Pack",
  "  Author: JDWasabi",
  "",
  "200 Free SFX",
  "  Author: Kronbits",
].join("\n");
const LICENSE_LINES = LICENSE_TEXT.split("\n");

export class SettingsScene extends Phaser.Scene {
  private returnScene?: string;

  constructor() {
    super("SettingsScene");
  }

  init(data: { returnScene?: string } = {}): void {
    this.returnScene = data.returnScene;
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

    makeButton(this, 80, 55, "← 뒤로", () => this.goBack(), {
      width: 130,
      height: 42,
      bgColor: 0x1a1a30,
      fontSize: "19px",
      textColor: "#7777aa",
    });

    this.createVolumeSlider(cx, cy - 80);

    makeButton(this, cx, cy + 30, "에셋 미리보기", () => this.scene.start("AssetPreviewScene"), {
      width: 200,
      height: 50,
      bgColor: 0x2a3a5a,
      fontSize: "22px",
      textColor: "#ffffff",
    });

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

  private goBack(): void {
    if (this.returnScene) {
      const sceneKey = this.returnScene;
      this.returnScene = undefined;
      this.scene.stop();
      this.scene.bringToTop(sceneKey);
      return;
    }

    this.scene.start("MainMenuScene");
  }

  private createVolumeSlider(cx: number, y: number): void {
    const trackW = 360;
    const trackH = 12;
    let dragging = false;

    this.add
      .text(cx, y - 44, "배경음", {
        fontFamily: FONT,
        fontSize: "24px",
        color: "#ccccff",
      })
      .setOrigin(0.5);

    const track = this.add
      .rectangle(cx, y, trackW, trackH, 0x242448)
      .setStrokeStyle(1, 0x565690)
      .setInteractive({ useHandCursor: true });

    const fill = this.add
      .rectangle(cx - trackW / 2, y, 1, trackH, 0x4dabff)
      .setOrigin(0, 0.5);

    const knob = this.add
      .circle(cx - trackW / 2, y, 15, 0xffffff)
      .setStrokeStyle(3, 0x4dabff)
      .setInteractive({ useHandCursor: true });

    const valueText = this.add
      .text(cx, y + 38, "", {
        fontFamily: FONT,
        fontSize: "18px",
        color: "#aaaacc",
      })
      .setOrigin(0.5);

    const apply = (value: number) => {
      const volume = setBgmVolume(value);
      this.sound.setVolume(volume);
      fill.setDisplaySize(Math.max(1, trackW * volume), trackH);
      knob.setX(cx - trackW / 2 + trackW * volume);
      valueText.setText(`${Math.round(volume * 100)}%`);
    };

    const updateFromX = (x: number) => {
      apply((x - (cx - trackW / 2)) / trackW);
    };

    track.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      dragging = true;
      updateFromX(pointer.x);
    });
    knob.on("pointerdown", () => {
      dragging = true;
    });
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
      if (!dragging) return;
      updateFromX(pointer.x);
    });
    this.input.on(Phaser.Input.Events.POINTER_UP, () => {
      dragging = false;
    });

    apply(getBgmVolume());
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

    const contentX = cx - PW / 2 + 44;
    const contentY = cy - PH / 2 + 94;
    const contentW = PW - 108;
    const contentH = PH - 184;
    const licenseTxt = this.add
      .text(contentX, contentY, "", {
        fontFamily: FONT,
        fontSize: "14px",
        color: "#8888aa",
        lineSpacing: 5,
        wordWrap: { width: contentW - 28 },
      });
    const visibleLineCount = Math.max(1, Math.floor(contentH / 22));
    const maxScroll = Math.max(0, LICENSE_LINES.length - visibleLineCount);
    let scrollLine = 0;
    let draggingThumb = false;
    let dragStartY = 0;
    let dragStartScrollLine = 0;

    const scrollTrack = this.add
      .rectangle(contentX + contentW - 10, contentY, 5, contentH, 0x242448, 0.9)
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: maxScroll > 0 });
    const thumbH = maxScroll > 0 ? Math.max(34, (visibleLineCount / LICENSE_LINES.length) * contentH) : contentH;
    const scrollThumb = this.add
      .rectangle(contentX + contentW - 10, contentY, 10, thumbH, 0x4dabff, maxScroll > 0 ? 0.92 : 0.22)
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: maxScroll > 0 });

    const applyScroll = (value: number) => {
      scrollLine = Math.round(Phaser.Math.Clamp(value, 0, maxScroll));
      licenseTxt.setText(LICENSE_LINES.slice(scrollLine, scrollLine + visibleLineCount).join("\n"));
      const travel = Math.max(0, contentH - scrollThumb.height);
      const ratio = maxScroll > 0 ? scrollLine / maxScroll : 0;
      scrollThumb.setY(contentY + travel * ratio);
    };
    const scrollBy = (delta: number) => applyScroll(scrollLine + delta);
    const wheelHandler = (
      _pointer: Phaser.Input.Pointer,
      _targets: unknown,
      _dx: number,
      dy: number,
    ) => {
      scrollBy(dy / 60);
    };
    const moveHandler = (pointer: Phaser.Input.Pointer) => {
      if (!draggingThumb || maxScroll <= 0) return;
      const travel = Math.max(1, contentH - scrollThumb.height);
      applyScroll(dragStartScrollLine + ((pointer.y - dragStartY) / travel) * maxScroll);
    };
    const upHandler = () => {
      draggingThumb = false;
    };

    scrollTrack.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (maxScroll <= 0) return;
      applyScroll(((pointer.y - contentY) / contentH) * maxScroll);
    });
    scrollThumb.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (maxScroll <= 0) return;
      draggingThumb = true;
      dragStartY = pointer.y;
      dragStartScrollLine = scrollLine;
    });
    this.input.on(Phaser.Input.Events.POINTER_WHEEL, wheelHandler);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, moveHandler);
    this.input.on(Phaser.Input.Events.POINTER_UP, upHandler);
    applyScroll(0);

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

    const all = [
      dim,
      panel,
      titleTxt,
      divider,
      licenseTxt,
      scrollTrack,
      scrollThumb,
      closeBg,
      closeTxt,
    ];
    const closeAll = () => {
      this.input.off(Phaser.Input.Events.POINTER_WHEEL, wheelHandler);
      this.input.off(Phaser.Input.Events.POINTER_MOVE, moveHandler);
      this.input.off(Phaser.Input.Events.POINTER_UP, upHandler);
      all.forEach((o) => o.destroy());
    };

    closeBg.on("pointerover", () => closeBg.setAlpha(0.65));
    closeBg.on("pointerout", () => closeBg.setAlpha(1));
    closeBg.on("pointerup", () => {
      this.sound.play(SoundKey.Settings);
      closeAll();
    });
  }
}
