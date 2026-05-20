import * as Phaser from "phaser";
import { AssetKey } from "@/assets";
import { GAME_HEIGHT, GAME_WIDTH } from "@/config";
import { SEGMENTS } from "@/data/segments";
import { Item, ItemKind } from "@/objects/Item";
import { Obstacle } from "@/objects/Obstacle";
import { Platform } from "@/objects/Platform";
import { Player } from "@/objects/Player";
import { Scroll } from "@/objects/Scroll";
import { makeButton } from "@/ui/button";

const FONT = "'Ramche', system-ui, sans-serif";
const HEADER_H = 82;
const CONTENT_TOP = 118;
const LEFT = 64;
const RIGHT = 64;
const ITEM_GAP_X = 48;
const ITEM_GAP_Y = 64;
const LABEL_H = 28;
const DIM_H = 22;
const MAX_CONTENT_W = GAME_WIDTH - LEFT - RIGHT - 34;

interface PreviewEntry {
  label: string;
  object: BoundableGameObject;
  width: number;
  height: number;
  hasPhysicsBody: boolean;
}

type BoundableGameObject = Phaser.GameObjects.GameObject & {
  x: number;
  y: number;
  getBounds: () => Phaser.Geom.Rectangle;
  setVisible: (value: boolean) => BoundableGameObject;
};

export class AssetPreviewScene extends Phaser.Scene {
  private contentHeight = GAME_HEIGHT;
  private maxScroll = 0;
  private scrollbarThumb?: Phaser.GameObjects.Rectangle;
  private draggingScroll = false;
  private dragStartY = 0;
  private dragStartScrollY = 0;
  private entries: PreviewEntry[] = [];

  constructor() {
    super("AssetPreviewScene");
  }

  create(): void {
    this.physics.world.gravity.y = 0;
    this.entries = [];

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x111122).setScrollFactor(0).setDepth(-30);

    let y = CONTENT_TOP;
    y = this.addSection("캐릭터 / 재해", y, this.createCharacterEntries());
    y = this.addSection("장애물 / 발판 / 두루마리", y, this.createObstacleEntries());
    y = this.addSection("아이템", y, this.createItemEntries());

    this.contentHeight = Math.max(GAME_HEIGHT, y + 72);
    this.maxScroll = Math.max(0, this.contentHeight - GAME_HEIGHT);
    this.add.rectangle(GAME_WIDTH / 2, this.contentHeight / 2, GAME_WIDTH, this.contentHeight, 0x111122).setDepth(-40);
    this.cameras.main.setBounds(0, 0, GAME_WIDTH, this.contentHeight);

    this.createHeader();
    this.createScrollbar();
    this.bindScrolling();
  }

  update(): void {
    // Static preview scene. Sprites may animate, but objects should not run gameplay state updates.
  }

  private createCharacterEntries(): PreviewEntry[] {
    const run = new Player(this, 0, 0);
    this.freezeBody(run);

    const jump = new Player(this, 0, 0);
    jump.jump();
    jump.update();
    this.freezeBody(jump);

    const slide = new Player(this, 0, 0);
    slide.slide();
    this.freezeBody(slide);

    const fire = this.add.sprite(0, 0, AssetKey.DisasterFire, "sprite3").setScale(1.5);
    this.ensureFireAnimation();
    fire.play("fire_spirit_anim");

    return [
      this.makeEntry("Player Run", run),
      this.makeEntry("Player Jump", jump),
      this.makeEntry("Player Slide", slide),
      this.makeEntry("Disaster Fire Spirit (visual)", fire, false),
    ];
  }

  private createObstacleEntries(): PreviewEntry[] {
    const smoke = new Obstacle(this, 0, "smoke");
    this.freezeBody(smoke);

    const pillar = new Obstacle(this, 0, "pillar");
    this.freezeBody(pillar);

    const scroll = new Scroll(this, 0, 0);
    this.tweens.killTweensOf(scroll);
    this.freezeBody(scroll);

    const platformSizes = this.uniquePlatformSizes();
    const platforms = platformSizes.map(({ width, height }) => {
      const platform = new Platform(this, 0, 0, width, height);
      this.freezeBody(platform);
      return this.makeEntry(`Deck ${width}x${height}`, platform);
    });

    return [
      this.makeEntry("Smoke", smoke),
      this.makeEntry("Pillar", pillar),
      ...platforms,
      this.makeEntry("Scroll", scroll),
    ];
  }

  private createItemEntries(): PreviewEntry[] {
    const itemKinds: ItemKind[] = [
      "gimbap",
      "bento",
      "coin",
      "energy_drink",
      "fire_extinguisher",
      "gas_mask",
      "wet_towel",
    ];
    const labels: Record<ItemKind, string> = {
      gimbap: "Gimbap +2%",
      bento: "Bento +5%",
      coin: "Coin",
      energy_drink: "Energy Drink",
      fire_extinguisher: "Fire Ext +12%",
      gas_mask: "Gas Mask +8%",
      wet_towel: "Wet Towel +6%",
    };

    return itemKinds.map((kind) => {
      const item = new Item(this, 0, 0, kind);
      this.tweens.killTweensOf(item);
      this.freezeBody(item);
      return this.makeEntry(labels[kind], item);
    });
  }

  private addSection(title: string, y: number, entries: PreviewEntry[]): number {
    this.add
      .text(LEFT, y, title, {
        fontFamily: FONT,
        fontSize: "22px",
        color: "#ffb84d",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5)
      .setDepth(300);
    this.add.rectangle(GAME_WIDTH / 2, y + 28, GAME_WIDTH - LEFT - RIGHT, 1, 0x334466, 0.9).setDepth(300);

    return this.layoutEntries(entries, y + 58);
  }

  private layoutEntries(entries: PreviewEntry[], startY: number): number {
    let x = LEFT;
    let y = startY;
    let rowH = 0;

    for (const entry of entries) {
      const isLargeEntry = entry.width > 360 || entry.height > 220;
      const labelW = this.labelWidth(entry.label);
      const slotW = Math.min(MAX_CONTENT_W, Math.max(entry.width, labelW, 72));
      const slotH = LABEL_H + entry.height + DIM_H + 18;
      if (x > LEFT && (isLargeEntry || x + slotW > LEFT + MAX_CONTENT_W)) {
        x = LEFT;
        y += rowH + ITEM_GAP_Y;
        rowH = 0;
      }

      const slotX = isLargeEntry ? LEFT + (MAX_CONTENT_W - slotW) / 2 : x;
      const itemX = slotX + slotW / 2 - entry.width / 2;
      const itemY = y + LABEL_H;
      this.addEntryLabel(entry, slotX + slotW / 2, y + 3);
      this.placeEntry(entry, itemX, itemY);
      this.addDimensionLabel(entry, slotX + slotW / 2, itemY + entry.height + 12);
      x = isLargeEntry ? LEFT : x + slotW + ITEM_GAP_X;
      if (isLargeEntry) {
        y += slotH + ITEM_GAP_Y;
        rowH = 0;
        continue;
      }
      rowH = Math.max(rowH, slotH);
    }

    return y + rowH + 58;
  }

  private makeEntry(label: string, object: BoundableGameObject, hasPhysicsBody = true): PreviewEntry {
    const bounds = object.getBounds();
    object.setVisible(false);
    const entry = {
      label,
      object,
      width: Math.ceil(bounds.width),
      height: Math.ceil(bounds.height),
      hasPhysicsBody,
    };
    this.entries.push(entry);
    return entry;
  }

  private placeEntry(entry: PreviewEntry, left: number, top: number): void {
    const current = entry.object.getBounds();
    entry.object.x += left - current.x;
    entry.object.y += top - current.y;
    entry.object.setVisible(true);

    const body = this.physicsBody(entry.object);
    body?.updateFromGameObject();

    if (entry.hasPhysicsBody && body) this.drawPhysicsHitbox(body);
    else this.drawVisualBounds(entry.object);
  }

  private addEntryLabel(entry: PreviewEntry, x: number, y: number): void {
    this.add
      .text(x, y, entry.label, {
        fontFamily: FONT,
        fontSize: "17px",
        color: "#d8dcff",
        align: "center",
      })
      .setOrigin(0.5, 0)
      .setDepth(300);
  }

  private addDimensionLabel(entry: PreviewEntry, x: number, y: number): void {
    const body = this.physicsBody(entry.object);
    const hitbox = body ? ` / hit ${Math.round(body.width)}x${Math.round(body.height)}` : " / no physics hitbox";
    this.add
      .text(x, y, `${entry.width}x${entry.height}${hitbox}`, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "12px",
        color: "#8f95b8",
        align: "center",
      })
      .setOrigin(0.5, 0)
      .setDepth(300);
  }

  private drawPhysicsHitbox(body: Phaser.Physics.Arcade.Body): void {
    this.add
      .rectangle(body.x + body.width / 2, body.y + body.height / 2, body.width, body.height)
      .setStrokeStyle(2, 0xffff00, 0.9)
      .setDepth(350);
  }

  private drawVisualBounds(object: BoundableGameObject): void {
    const bounds = object.getBounds();
    this.add
      .rectangle(bounds.centerX, bounds.centerY, bounds.width, bounds.height)
      .setStrokeStyle(2, 0x66ccff, 0.75)
      .setDepth(350);
  }

  private createHeader(): void {
    this.add
      .rectangle(GAME_WIDTH / 2, HEADER_H / 2, GAME_WIDTH, HEADER_H, 0x0b0d18, 1)
      .setScrollFactor(0)
      .setDepth(1000);
    this.add
      .rectangle(GAME_WIDTH / 2, HEADER_H, GAME_WIDTH, 1, 0x334466)
      .setScrollFactor(0)
      .setDepth(1001);
    this.add
      .text(GAME_WIDTH / 2, 38, "에셋 미리보기", {
        fontFamily: FONT,
        fontSize: "30px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1002);

    const backButton = makeButton(this, 80, 38, "← 뒤로", () => this.scene.start("SettingsScene"), {
      width: 100,
      height: 36,
      bgColor: 0x334466,
      fontSize: "16px",
      textColor: "#ffffff",
    });
    backButton.setScrollFactor(0).setDepth(1002);
    for (const child of backButton.list) {
      const gameObject = child as Phaser.GameObjects.GameObject & {
        setScrollFactor?: (x: number, y?: number) => unknown;
        setDepth?: (value: number) => unknown;
      };
      gameObject.setScrollFactor?.(0);
      gameObject.setDepth?.(1002);
    }
  }

  private createScrollbar(): void {
    const trackH = GAME_HEIGHT - HEADER_H - 28;
    const trackY = HEADER_H + 14;
    const track = this.add
      .rectangle(GAME_WIDTH - 18, trackY, 6, trackH, 0x2b3048, 0.8)
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(1002)
      .setInteractive({ useHandCursor: true });

    const thumbH = Math.max(42, (GAME_HEIGHT / this.contentHeight) * trackH);
    this.scrollbarThumb = this.add
      .rectangle(GAME_WIDTH - 18, trackY, 10, thumbH, 0xffb84d, this.maxScroll > 0 ? 0.95 : 0.25)
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(1003)
      .setInteractive({ useHandCursor: this.maxScroll > 0 });

    track.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.maxScroll <= 0) return;
      const ratio = Phaser.Math.Clamp((pointer.y - trackY) / trackH, 0, 1);
      this.setScrollY(ratio * this.maxScroll);
    });
    this.scrollbarThumb.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.maxScroll <= 0) return;
      this.draggingScroll = true;
      this.dragStartY = pointer.y;
      this.dragStartScrollY = this.cameras.main.scrollY;
    });
    this.updateScrollbar();
  }

  private bindScrolling(): void {
    this.input.on(
      Phaser.Input.Events.POINTER_WHEEL,
      (_pointer: Phaser.Input.Pointer, _targets: unknown, _dx: number, dy: number) => {
        this.scrollBy(dy);
      },
    );
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
      if (!this.draggingScroll || !this.scrollbarThumb) return;
      const trackH = GAME_HEIGHT - HEADER_H - 28;
      const thumbTravel = Math.max(1, trackH - this.scrollbarThumb.height);
      const scrollDelta = ((pointer.y - this.dragStartY) / thumbTravel) * this.maxScroll;
      this.setScrollY(this.dragStartScrollY + scrollDelta);
    });
    this.input.on(Phaser.Input.Events.POINTER_UP, () => {
      this.draggingScroll = false;
    });
    this.input.keyboard?.on("keydown-UP", () => this.scrollBy(-64));
    this.input.keyboard?.on("keydown-DOWN", () => this.scrollBy(64));
  }

  private scrollBy(delta: number): void {
    this.setScrollY(this.cameras.main.scrollY + delta);
  }

  private setScrollY(value: number): void {
    this.cameras.main.scrollY = Phaser.Math.Clamp(value, 0, this.maxScroll);
    this.updateScrollbar();
  }

  private updateScrollbar(): void {
    if (!this.scrollbarThumb) return;
    const trackH = GAME_HEIGHT - HEADER_H - 28;
    const trackY = HEADER_H + 14;
    const thumbTravel = Math.max(0, trackH - this.scrollbarThumb.height);
    const ratio = this.maxScroll > 0 ? this.cameras.main.scrollY / this.maxScroll : 0;
    this.scrollbarThumb.y = trackY + thumbTravel * ratio;
  }

  private freezeBody(object: Phaser.GameObjects.GameObject): void {
    const body = this.physicsBody(object);
    if (!body) return;
    body.setVelocity(0, 0);
    body.setAllowGravity(false);
  }

  private physicsBody(object: Phaser.GameObjects.GameObject): Phaser.Physics.Arcade.Body | null {
    const maybeBody = (object as Phaser.GameObjects.GameObject & { body?: unknown }).body;
    return maybeBody instanceof Phaser.Physics.Arcade.Body ? maybeBody : null;
  }

  private uniquePlatformSizes(): Array<{ width: number; height: number }> {
    const seen = new Set<string>();
    const sizes: Array<{ width: number; height: number }> = [];
    for (const segment of SEGMENTS) {
      for (const platform of segment.platforms) {
        const key = `${platform.width}x${platform.height}`;
        if (seen.has(key)) continue;
        seen.add(key);
        sizes.push({ width: platform.width, height: platform.height });
      }
    }
    return sizes.sort((a, b) => a.width - b.width || a.height - b.height);
  }

  private ensureFireAnimation(): void {
    if (this.anims.exists("fire_spirit_anim")) return;
    this.anims.create({
      key: "fire_spirit_anim",
      frames: this.anims.generateFrameNames(AssetKey.DisasterFire, {
        prefix: "sprite",
        frames: [3, 4, 5, 6, 10, 11, 12, 13],
      }),
      frameRate: 12,
      repeat: -1,
    });
  }

  private labelWidth(text: string): number {
    return Math.max(72, text.length * 9 + 24);
  }
}
