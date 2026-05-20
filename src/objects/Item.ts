import * as Phaser from "phaser";
import { AssetKey } from "@/assets";

export type ItemKind =
  | "gimbap"
  | "bento"
  | "coin"
  | "energy_drink"
  | "fire_extinguisher"
  | "gas_mask"
  | "wet_towel";

interface ItemSpec {
  size: number;
  hitSize?: number;
  healPct: number;
  coins: number;
  color: number;
  accent: number;
  label: string;
}

const SPECS: Record<ItemKind, ItemSpec> = {
  gimbap: { size: 64, hitSize: 32, healPct: 2, coins: 0, color: 0xf5c98a, accent: 0xb47b3b, label: "G" },
  bento: { size: 64, hitSize: 32, healPct: 5, coins: 0, color: 0xff7a59, accent: 0xffffff, label: "B" },
  coin: { size: 48, hitSize: 24, healPct: 0, coins: 1, color: 0xffd73d, accent: 0xb38600, label: "$" },
  energy_drink: { size: 80, hitSize: 32, healPct: 3, coins: 0, color: 0x2dd4bf, accent: 0xffffff, label: "E" },
  fire_extinguisher: { size: 80, hitSize: 32, healPct: 12, coins: 0, color: 0xdc2626, accent: 0xffffff, label: "F" },
  gas_mask: { size: 80, hitSize: 32, healPct: 8, coins: 0, color: 0x334155, accent: 0xa3e635, label: "M" },
  wet_towel: { size: 80, hitSize: 32, healPct: 6, coins: 0, color: 0x38bdf8, accent: 0xffffff, label: "T" },
};

const ASSET_KEYS: Record<ItemKind, string> = {
  gimbap: AssetKey.ItemGimbap,
  bento: AssetKey.ItemBento,
  coin: AssetKey.ItemCoin,
  energy_drink: AssetKey.ItemEnergyDrink,
  fire_extinguisher: AssetKey.ItemFireExtinguisher,
  gas_mask: AssetKey.ItemGasMask,
  wet_towel: AssetKey.ItemWetTowel,
};

export class Item extends Phaser.Physics.Arcade.Sprite {
  public readonly kind: ItemKind;
  public readonly healPct: number;
  public readonly coins: number;
  public consumed = false;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: ItemKind) {
    const spec = SPECS[kind];
    const assetKey = ASSET_KEYS[kind];
    super(scene, x, y, assetKey);

    this.kind = kind;
    this.healPct = spec.healPct;
    this.coins = spec.coins;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    this.setDisplaySize(spec.size, spec.size);
    const hitSize = spec.hitSize ?? spec.size;
    // const hitOffset = (hitSize - spec.size) / 2;
    // body.setSize(hitSize, hitSize);
    // body.setOffset(-hitOffset, -hitOffset);
    // 1. hitSize를 현재 스케일로 나누어 '원본 텍스처 기준의 물리 바디 크기'를 구합니다.
    const scaledHitSizeX = hitSize / this.scaleX;
    const scaledHitSizeY = hitSize / this.scaleY;

    // 2. 세 번째 인자(center)를 true로 설정하면 복잡한 Offset 계산 없이 자동으로 스프라이트 정중앙에 히트박스가 맞춰집니다.
    body.setSize(scaledHitSizeX, scaledHitSizeY, true);

    body.setAllowGravity(false);
    body.setImmovable(true);
    this.setDepth(75);

    scene.tweens.add({
      targets: this,
      y: y - 6,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

}
