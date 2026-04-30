import * as Phaser from "phaser";
import { AssetKey } from "@/assets";

export type ItemKind = "bread" | "lunchbox" | "coin";

interface ItemSpec {
  size: number;
  healPct: number;
  coins: number;
  color: number;
  accent: number;
  label: string;
}

const SPECS: Record<ItemKind, ItemSpec> = {
  bread: { size: 38, healPct: 5, coins: 0, color: 0xf5c98a, accent: 0xb47b3b, label: "B" },
  lunchbox: { size: 48, healPct: 15, coins: 0, color: 0xff7a59, accent: 0xffffff, label: "L" },
  coin: { size: 32, healPct: 0, coins: 1, color: 0xffd73d, accent: 0xb38600, label: "$" },
};

const ASSET_KEYS: Record<ItemKind, string> = {
  bread: AssetKey.ItemBread,
  lunchbox: AssetKey.ItemLunchbox,
  coin: AssetKey.ItemCoin,
};

export class Item extends Phaser.Physics.Arcade.Sprite {
  public readonly kind: ItemKind;
  public readonly healPct: number;
  public readonly coins: number;
  public consumed = false;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: ItemKind) {
    const spec = SPECS[kind];
    const tex = Item.ensureTexture(scene, kind, spec);
    super(scene, x, y, tex);

    this.kind = kind;
    this.healPct = spec.healPct;
    this.coins = spec.coins;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(spec.size, spec.size);
    body.setAllowGravity(false);
    body.setImmovable(true);
    this.setDepth(75);

    scene.tweens.add({
      targets: this,
      scale: 1.08,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private static ensureTexture(scene: Phaser.Scene, kind: ItemKind, spec: ItemSpec): string {
    const assetKey = ASSET_KEYS[kind];
    if (scene.textures.exists(assetKey)) return assetKey;

    const key = `__item_${kind}`;
    if (scene.textures.exists(key)) return key;
    const g = scene.add.graphics({ x: 0, y: 0 });
    const s = spec.size;

    if (kind === "coin") {
      g.fillStyle(spec.accent, 1);
      g.fillCircle(s / 2, s / 2, s / 2);
      g.fillStyle(spec.color, 1);
      g.fillCircle(s / 2, s / 2, s / 2 - 3);
      g.fillStyle(spec.accent, 1);
      g.fillRect(s * 0.45, s * 0.25, s * 0.1, s * 0.5);
    } else if (kind === "bread") {
      g.fillStyle(spec.accent, 1);
      g.fillRoundedRect(0, 0, s, s, 10);
      g.fillStyle(spec.color, 1);
      g.fillRoundedRect(3, 3, s - 6, s - 6, 8);
    } else {
      g.fillStyle(spec.accent, 1);
      g.fillRoundedRect(0, 0, s, s, 6);
      g.fillStyle(spec.color, 1);
      g.fillRoundedRect(3, 3, s - 6, s - 6, 4);
      g.fillStyle(0xffffff, 0.6);
      g.fillRect(s * 0.2, s * 0.45, s * 0.6, 3);
    }

    g.generateTexture(key, s, s);
    g.destroy();
    return key;
  }
}
