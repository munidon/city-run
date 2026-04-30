import * as Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "@/config";
import { AssetKey } from "@/assets";
import { RunState } from "@/state/RunState";
import { makeButton } from "@/ui/button";

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super("MainMenuScene");
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.add
      .image(cx, cy, AssetKey.TitleLogo)
      .setOrigin(0.5)
      .setDisplaySize(1360, 750);

    makeButton(
      this,
      cx,
      cy + 80,
      "▶  게임 시작",
      () => this.scene.start("GameScene", { run: new RunState() }),
      {
        width: 300,
        height: 64,
        bgColor: 0x2d6a4f,
        fontSize: "28px",
        textColor: "#d8f3dc",
      }
    );

    makeButton(
      this,
      cx,
      cy + 168,
      "⚙  설정",
      () => this.scene.start("SettingsScene"),
      {
        width: 300,
        height: 52,
        bgColor: 0x1e1e38,
        fontSize: "22px",
        textColor: "#8888bb",
      }
    );

    this.input.keyboard?.on("keydown-SPACE", () =>
      this.scene.start("GameScene", { run: new RunState() })
    );
    this.input.keyboard?.on("keydown-ENTER", () =>
      this.scene.start("GameScene", { run: new RunState() })
    );
  }
}
