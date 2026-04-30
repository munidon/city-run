import * as Phaser from "phaser";
import { GAME_ATLAS_ASSETS, GAME_IMAGE_ASSETS } from "@/assets";

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
    this.scene.start("MainMenuScene");
  }
}
