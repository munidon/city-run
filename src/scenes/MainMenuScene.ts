import * as Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "@/config";
import { AssetKey, SoundKey } from "@/assets";
import { isDevToolsUnlocked, unlockDevTools } from "@/devUnlock";
import { RunState } from "@/state/RunState";
import { makeButton } from "@/ui/button";

const FONT = "'Ramche', system-ui, sans-serif";
const START_HELP_SKIP_COOKIE = "city_run_skip_start_help";
type StartHelpPage = "rules" | "controls";

export class MainMenuScene extends Phaser.Scene {
  private titleClickCount = 0;
  private devControls?: Phaser.GameObjects.Container;
  private helpModal?: Phaser.GameObjects.Container;
  private skipHelpSelected = false;

  constructor() {
    super("MainMenuScene");
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const titleLogo = this.add
      .image(cx, cy - 70, AssetKey.TitleLogo)
      .setOrigin(0.5)
      .setDisplaySize(1360, 750)
      .setInteractive({ useHandCursor: true });
    titleLogo.on(Phaser.Input.Events.POINTER_UP, () => this.handleTitleClick());

    makeButton(
      this,
      cx,
      cy + 170,
      "▶  게임 시작",
      () => this.requestStartGame(false),
      {
        width: 300,
        height: 64,
        bgColor: 0x2d6a4f,
        fontSize: "28px",
        textColor: "#d8f3dc",
        soundKey: SoundKey.GameStart,
      }
    );

    makeButton(
      this,
      cx,
      cy + 250,
      "⚙  설정",
      () => this.scene.start("SettingsScene"),
      {
        width: 300,
        height: 52,
        bgColor: 0x1e1e38,
        fontSize: "28px",
        textColor: "#8888bb",
      }
    );

    if (isDevToolsUnlocked()) this.createDevControls(cx, cy);

    this.input.keyboard?.on("keydown-SPACE", () => this.requestStartGame());
    this.input.keyboard?.on("keydown-ENTER", () => this.requestStartGame());
  }

  private handleTitleClick(): void {
    if (isDevToolsUnlocked()) return;

    this.titleClickCount += 1;
    if (this.titleClickCount < 10) return;

    unlockDevTools();
    this.createDevControls(GAME_WIDTH / 2, GAME_HEIGHT / 2);
  }

  private createDevControls(cx: number, cy: number): void {
    if (this.devControls) return;

    const mapEditorButton = makeButton(
      this,
      cx,
      cy + 320,
      "🛠  맵 에디터",
      () => this.scene.start("MapEditorScene"),
      {
        width: 300,
        height: 44,
        bgColor: 0x312a5a,
        fontSize: "22px",
        textColor: "#b6aafc",
      }
    );

    const debugLabel = this.add
      .text(GAME_WIDTH - 180, cy + 172, "DEBUG STAGE", {
        fontFamily: "'Ramche', system-ui, sans-serif",
        fontSize: "16px",
        color: "#7f8db8",
      })
      .setOrigin(0.5);

    const fireButton = makeButton(
      this,
      GAME_WIDTH - 180,
      cy + 214,
      "화재 바로 시작",
      () => this.startDebugStage(1),
      {
        width: 210,
        height: 40,
        bgColor: 0x5a2a2a,
        fontSize: "18px",
        textColor: "#ffd8d8",
        soundKey: SoundKey.GameStart,
      }
    );

    const floodButton = makeButton(
      this,
      GAME_WIDTH - 180,
      cy + 264,
      "홍수 바로 시작",
      () => this.startDebugStage(2),
      {
        width: 210,
        height: 40,
        bgColor: 0x1f5f8b,
        fontSize: "18px",
        textColor: "#d7f4ff",
        soundKey: SoundKey.GameStart,
      }
    );

    const finalScoreButton = makeButton(
      this,
      GAME_WIDTH - 180,
      cy + 314,
      "최종 점수 화면",
      () => this.startDebugFinalScore(),
      {
        width: 210,
        height: 40,
        bgColor: 0x1f6f9f,
        fontSize: "18px",
        textColor: "#e8f8ff",
        soundKey: SoundKey.Settings,
      }
    );

    this.devControls = this.add.container(0, 0, [
      mapEditorButton,
      debugLabel,
      fireButton,
      floodButton,
      finalScoreButton,
    ]);
  }

  private requestStartGame(playSound = true): void {
    if (this.helpModal) return;
    if (this.shouldSkipStartHelp()) {
      this.startGame(playSound);
      return;
    }

    if (playSound) this.sound.play(SoundKey.Settings);
    this.skipHelpSelected = false;
    this.showStartHelp("rules");
  }

  private showStartHelp(page: StartHelpPage): void {
    this.helpModal?.destroy();
    this.helpModal = undefined;

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const panelW = 820;
    const panelH = 610;
    const panelTop = cy - panelH / 2;
    const left = cx - panelW / 2 + 58;
    const textW = panelW - 116;
    const buttonY = panelTop + panelH - 46;
    const leftButtonX = cx - 270;
    const centerButtonX = cx;
    const rightButtonX = cx + 270;

    const dim = this.add
      .rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.76)
      .setInteractive();

    const panel = this.add
      .rectangle(cx, cy, panelW, panelH, 0x121326, 0.98)
      .setStrokeStyle(2, 0x405178, 0.9);

    const closeButton = this.makeHelpCloseButton(cx + panelW / 2 - 34, panelTop + 34);

    const title = this.add
      .text(cx, panelTop + 48, page === "rules" ? "도시런에 오신 것을 환영합니다!" : "조작법", {
        fontFamily: FONT,
        fontSize: "31px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const content = page === "rules"
      ? this.createRulesHelpContent(cx, panelTop, left, textW)
      : this.createControlsHelpContent(cx, panelTop, left, textW);

    const skipButton = this.makeHelpToggle(leftButtonX, buttonY);
    const navButton = page === "rules"
      ? makeButton(this, rightButtonX, buttonY, "다음", () => this.showStartHelp("controls"), {
        width: 220,
        height: 48,
        bgColor: 0x1f6f9f,
        fontSize: "24px",
        textColor: "#e8f8ff",
        soundKey: SoundKey.Settings,
      })
      : makeButton(this, centerButtonX, buttonY, "이전", () => this.showStartHelp("rules"), {
        width: 220,
        height: 48,
        bgColor: 0x31375f,
        fontSize: "24px",
        textColor: "#e8e8ff",
        soundKey: SoundKey.Settings,
      });

    const startButton = page === "controls" ? makeButton(this, rightButtonX, buttonY, "시작!", () => {
      if (this.skipHelpSelected) this.setSkipStartHelp();
      this.helpModal?.destroy();
      this.helpModal = undefined;
      this.startGame(false);
    }, {
      width: 220,
      height: 48,
      bgColor: 0x2d6a4f,
      fontSize: "24px",
      textColor: "#e6ffef",
      soundKey: SoundKey.GameStart,
    }) : undefined;

    this.helpModal = this.add
      .container(0, 0, [
        dim,
        panel,
        closeButton,
        title,
        ...content,
        skipButton,
        navButton,
        ...(startButton ? [startButton] : []),
      ])
      .setDepth(2000);
  }

  private createRulesHelpContent(
    cx: number,
    panelTop: number,
    left: number,
    textW: number,
  ): Phaser.GameObjects.GameObject[] {
    const intro = this.add
      .text(left, panelTop + 91, "무사히 완주하기 위해 아래의 핵심 규칙을 기억해 주세요!", {
        fontFamily: FONT,
        fontSize: "19px",
        color: "#d8dcff",
        wordWrap: { width: textW },
      });

    const jumpTitle = this.add
      .text(left, panelTop + 140, "점프와 슬라이드!", {
        fontFamily: FONT,
        fontSize: "22px",
        color: "#ffcf6a",
        fontStyle: "bold",
      });
    const jumpBody = this.add
      .text(left, panelTop + 172, "타이밍에 맞춰 점프와 슬라이드를 통해 눈앞의 장애물을 피하세요!", {
        fontFamily: FONT,
        fontSize: "18px",
        color: "#cbd3f5",
        lineSpacing: 4,
        wordWrap: { width: textW },
      });

    const quizTitle = this.add
      .text(left, panelTop + 225, "재난과 퀴즈!", {
        fontFamily: FONT,
        fontSize: "22px",
        color: "#ff8f66",
        fontStyle: "bold",
      });
    const quizBody = this.add
      .text(left, panelTop + 257, "갑작스러운 재난이 들이닥치면, 맵에 등장하는 두루마리를 획득해 퀴즈를 풀어야 합니다. 획득하지 못하거나, 틀리거나, 제한 시간 내 풀지 못하면 치명적인 피해를 입어요!", {
        fontFamily: FONT,
        fontSize: "18px",
        color: "#cbd3f5",
        lineSpacing: 4,
        wordWrap: { width: textW },
      });

    const scrollSprite = this.add
      .image(cx, panelTop + 357, AssetKey.Scroll)
      .setDisplaySize(100, 100)
      .setOrigin(-1, 0.5);
    const scrollLabel = this.add
      .text(cx, panelTop + 350, "두루마리를 발견하면 꼭 획득하세요 →", {
        fontFamily: FONT,
        fontSize: "20px",
        color: "#9fb8ff",
      })
      .setOrigin(0.75, 0.5);

    const scoreTitle = this.add
      .text(left, panelTop + 400, "최종 스코어", {
        fontFamily: FONT,
        fontSize: "22px",
        color: "#79d27d",
        fontStyle: "bold",
      });
    const scoreBody = this.add
      .text(left, panelTop + 432, "열심히 모은 코인과 도착 시 남은 체력을 합산하여 나의 최종 점수가 결정됩니다.", {
        fontFamily: FONT,
        fontSize: "17px",
        color: "#cbd3f5",
        lineSpacing: 4,
        wordWrap: { width: textW },
      });

    const ready = this.add
      .text(cx, panelTop + 490, "준비되셨나요?", {
        fontFamily: FONT,
        fontSize: "22px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    return [
      intro,
      jumpTitle,
      jumpBody,
      quizTitle,
      quizBody,
      scrollSprite,
      scrollLabel,
      scoreTitle,
      scoreBody,
      ready,
    ];
  }

  private createControlsHelpContent(
    cx: number,
    panelTop: number,
    left: number,
    textW: number,
  ): Phaser.GameObjects.GameObject[] {
    const intro = this.add
      .text(left, panelTop + 92, "상황에 맞는 조작을 빠르게 선택하면 더 오래 생존할 수 있습니다!", {
        fontFamily: FONT,
        fontSize: "19px",
        color: "#d8dcff",
        wordWrap: { width: textW },
      });

    const keyboardTitle = this.add
      .text(left, panelTop + 145, "키보드", {
        fontFamily: FONT,
        fontSize: "24px",
        color: "#ffcf6a",
        fontStyle: "bold",
      });
    const keyboardBody = this.add
      .text(left, panelTop + 183, "점프: Space / ↑ / W\n슬라이드: ↓ / S\n일시정지: ESC / ⏸️", {
        fontFamily: FONT,
        fontSize: "21px",
        color: "#cbd3f5",
        lineSpacing: 9,
        wordWrap: { width: textW },
      });

    const mobileTitle = this.add
      .text(left, panelTop + 330, "모바일 / 터치", {
        fontFamily: FONT,
        fontSize: "24px",
        color: "#79d27d",
        fontStyle: "bold",
      });
    const mobileBody = this.add
      .text(left, panelTop + 368, "점프: 왼쪽 JUMP 버튼\n슬라이드: 오른쪽 SLIDE 버튼\n일시정지: ⏸️", {
        fontFamily: FONT,
        fontSize: "21px",
        color: "#cbd3f5",
        lineSpacing: 9,
        wordWrap: { width: textW },
      });

    const tip = this.add
      .text(cx, panelTop + 492, "점프는 최대 2번까지 연속으로 사용할 수 있습니다.", {
        fontFamily: FONT,
        fontSize: "20px",
        color: "#9fb8ff",
      })
      .setOrigin(0.5);

    return [intro, keyboardTitle, keyboardBody, mobileTitle, mobileBody, tip];
  }

  private makeHelpCloseButton(x: number, y: number): Phaser.GameObjects.Container {
    const bg = this.add
      .rectangle(0, 0, 42, 42, 0x1f233b, 1)
      .setStrokeStyle(1, 0x7f8db8, 0.9)
      .setInteractive({ useHandCursor: true });
    const label = this.add
      .text(0, -1, "X", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "24px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    bg.on(Phaser.Input.Events.POINTER_OVER, () => bg.setFillStyle(0x5a2a2a, 1));
    bg.on(Phaser.Input.Events.POINTER_OUT, () => bg.setFillStyle(0x1f233b, 1));
    bg.on(Phaser.Input.Events.POINTER_UP, () => {
      this.sound.play(SoundKey.Settings);
      this.closeStartHelp();
    });

    return this.add.container(x, y, [bg, label]);
  }

  private makeHelpToggle(x: number, y: number): Phaser.GameObjects.Container {
    const bg = this.add
      .rectangle(0, 0, 220, 48, 0x232844, 1)
      .setStrokeStyle(1, 0x59638f, 0.9)
      .setInteractive({ useHandCursor: true });
    const check = this.add
      .rectangle(-82, 0, 22, 22, 0x111526, 1)
      .setStrokeStyle(2, 0x7f8db8, 1);
    const label = this.add
      .text(-54, 0, "다시보지 않기", {
        fontFamily: FONT,
        fontSize: "19px",
        color: "#cbd3f5",
      })
      .setOrigin(0, 0.5);
    const mark = this.add
      .text(-82, -1, "✓", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "21px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setVisible(false);

    const sync = () => {
      mark.setVisible(this.skipHelpSelected);
      bg.setFillStyle(this.skipHelpSelected ? 0x315f4c : 0x232844, 1);
      check.setFillStyle(this.skipHelpSelected ? 0x2d6a4f : 0x111526, 1);
    };
    bg.on(Phaser.Input.Events.POINTER_UP, () => {
      this.skipHelpSelected = !this.skipHelpSelected;
      sync();
    });

    sync();
    return this.add.container(x, y, [bg, check, mark, label]);
  }

  private closeStartHelp(): void {
    this.helpModal?.destroy();
    this.helpModal = undefined;
    this.skipHelpSelected = false;
  }

  private shouldSkipStartHelp(): boolean {
    return document.cookie
      .split(";")
      .some((cookie) => cookie.trim() === `${START_HELP_SKIP_COOKIE}=1`);
  }

  private setSkipStartHelp(): void {
    document.cookie = `${START_HELP_SKIP_COOKIE}=1; max-age=31536000; path=/; SameSite=Lax`;
  }

  private startGame(playSound = true): void {
    if (playSound) this.sound.play(SoundKey.GameStart);
    this.scene.start("GameScene", { run: new RunState() });
  }

  private startDebugStage(stageIndex: number): void {
    const run = new RunState();
    run.stageIndex = stageIndex;
    this.scene.start("GameScene", { run });
  }

  private startDebugFinalScore(): void {
    const run = new RunState();
    run.stageIndex = 2;
    run.totalCoins = 565;
    this.scene.start("FinalScoreScene", {
      run,
      stageCoins: 314,
      remainingHp: 73,
      maxHp: 100,
    });
  }
}
