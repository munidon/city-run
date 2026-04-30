import * as Phaser from "phaser";

const FONT = "'Ramche', system-ui, sans-serif";

export interface ButtonCfg {
  width?: number;
  height?: number;
  bgColor?: number;
  textColor?: string;
  fontSize?: string;
}

export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  cfg: ButtonCfg = {}
): Phaser.GameObjects.Container {
  const w = cfg.width ?? 280;
  const h = cfg.height ?? 58;
  const bg = scene.add
    .rectangle(0, 0, w, h, cfg.bgColor ?? 0x2d2d50)
    .setInteractive({ useHandCursor: true });
  const txt = scene.add
    .text(0, 0, label, {
      fontFamily: FONT,
      fontSize: cfg.fontSize ?? "24px",
      color: cfg.textColor ?? "#ffffff",
    })
    .setOrigin(0.5);
  const ctr = scene.add.container(x, y, [bg, txt]);
  bg.on("pointerover", () => bg.setAlpha(0.7));
  bg.on("pointerout", () => bg.setAlpha(1));
  bg.on("pointerdown", () => bg.setAlpha(0.5));
  bg.on("pointerup", () => {
    bg.setAlpha(1);
    onClick();
  });
  return ctr;
}
