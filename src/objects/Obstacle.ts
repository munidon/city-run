import * as Phaser from "phaser";
import { AssetKey } from "@/assets";
import { GROUND_Y } from "@/config";

export type ObstacleKind = "smoke" | "pillar" | "fire_smoke";

interface ObstacleSpec {
  width: number;
  height: number;
  damagePct: number;
  color: number;
  accent?: number;
  spawnY: number;
  gravity: boolean;
  label: string;
}

const SPECS: Record<ObstacleKind, ObstacleSpec> = {
  smoke: {
    width: 110,
    height: 92,
    damagePct: 5,
    color: 0x8b5a2b,
    accent: 0xa0522d,
    spawnY: GROUND_Y - 46,
    gravity: false,
    label: "📦",
  },
  pillar: {
    width: 92,
    height: 170,
    damagePct: 10,
    color: 0x708090,
    accent: 0xa9a9a9,
    spawnY: GROUND_Y - 85,
    gravity: false,
    label: "🏛",
  },
  fire_smoke: {
    width: 220,
    height: 110,
    damagePct: 12,
    color: 0x2f3038,
    accent: 0xff6a2a,
    spawnY: GROUND_Y - 110,
    gravity: false,
    label: "SMOKE",
  },
};

const ASSET_KEYS: Partial<Record<ObstacleKind, string>> = {
  smoke: AssetKey.ObstacleSmoke,
  pillar: AssetKey.ObstaclePillar,
};

export class Obstacle extends Phaser.Physics.Arcade.Sprite {
  public readonly kind: ObstacleKind;
  public readonly damagePct: number;
  public consumed = false;

  constructor(scene: Phaser.Scene, x: number, kind: ObstacleKind, y?: number) {
    const spec = SPECS[kind];
    const tex = Obstacle.ensureTexture(scene, kind, spec);
    super(scene, x, y ?? spec.spawnY, tex);

    this.kind = kind;
    this.damagePct = spec.damagePct;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    this.setDisplaySize(spec.width, spec.height);
    if (kind === "fire_smoke") {
      body.setSize((spec.width * 0.78) / this.scaleX, (spec.height * 0.6) / this.scaleY, true);
    } else {
      body.setSize((spec.width * 0.6) / this.scaleX, (spec.height * 0.85) / this.scaleY, true);
    }
    body.setAllowGravity(spec.gravity);
    body.setImmovable(!spec.gravity);
    this.setDepth(80);
  }

  private static ensureTexture(scene: Phaser.Scene, kind: ObstacleKind, spec: ObstacleSpec): string {
    const assetKey = ASSET_KEYS[kind];
    if (assetKey && scene.textures.exists(assetKey)) return assetKey;

    const key = `__obs_${kind}`;
    if (scene.textures.exists(key)) return key;
    const g = scene.add.graphics({ x: 0, y: 0 });

    if (kind === "smoke") {
      g.fillStyle(spec.color, 1);
      g.fillRoundedRect(0, 0, spec.width, spec.height, 8);
      g.fillStyle(spec.accent ?? 0xffffff, 1);
      g.fillRoundedRect(4, 4, spec.width - 8, spec.height - 8, 4);
      g.fillStyle(0x000000, 0.2);
      g.fillRect(spec.width * 0.1, spec.height * 0.45, spec.width * 0.8, 4);
      g.fillRect(spec.width * 0.45, spec.height * 0.1, 4, spec.height * 0.8);
    } else if (kind === "pillar") {
      g.fillStyle(spec.color, 1);
      g.fillRoundedRect(0, 0, spec.width, spec.height, 8);
      g.fillStyle(spec.accent ?? 0xffffff, 1);
      g.fillRect(5, 0, spec.width - 10, spec.height);
      g.fillStyle(0x000000, 0.2);
      for (let y = 10; y < spec.height; y += 20) {
        g.fillRect(0, y, spec.width, 4);
      }
    } else if (kind === "fire_smoke") {
      g.fillStyle(0x1f2028, 0.82);
      g.fillCircle(42, 62, 34);
      g.fillCircle(82, 42, 42);
      g.fillCircle(130, 50, 38);
      g.fillCircle(174, 66, 34);
      g.fillRoundedRect(32, 54, spec.width - 58, 44, 24);
      g.fillStyle(0xff7a2f, 0.58);
      g.fillCircle(72, 66, 18);
      g.fillCircle(145, 70, 16);
      g.fillStyle(0xffd166, 0.5);
      g.fillCircle(108, 62, 12);
    }

    g.generateTexture(key, spec.width, spec.height);
    g.destroy();
    return key;
  }
}
