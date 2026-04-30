import * as Phaser from "phaser";
import { GAME_ATLAS_ASSETS, GAME_IMAGE_ASSETS } from "@/assets";
import { GAME_HEIGHT, GAME_WIDTH } from "@/config";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    for (const asset of GAME_ATLAS_ASSETS) {
      this.load.atlas(asset.key, asset.texturePath, asset.atlasPath);
    }

    for (const asset of GAME_IMAGE_ASSETS) {
      this.load.image(asset.key, asset.path);
    }
  }

  create(): void {
    const dot = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "•", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "40px",
        color: "#334466",
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: dot,
      alpha: { from: 0.15, to: 0.7 },
      duration: 450,
      yoyo: true,
      repeat: -1,
    });

    // 게임 애셋 로드 완료 후 폰트까지 준비되면 메인 메뉴 진입
    document.fonts.load("72px 'Ramche'").finally(() => {
      this.scene.start("MainMenuScene");
    });
  }
}
