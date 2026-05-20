import * as Phaser from "phaser";
import { AssetKey } from "@/assets";
import { GROUND_Y } from "@/config";

export type ObstacleKind = "smoke" | "pillar";

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
};

const ASSET_KEYS: Record<ObstacleKind, string> = {
  smoke: AssetKey.ObstacleSmoke,
  pillar: AssetKey.ObstaclePillar,
};

export class Obstacle extends Phaser.Physics.Arcade.Sprite {
  public readonly kind: ObstacleKind;
  public readonly damagePct: number;
  public consumed = false;

  constructor(scene: Phaser.Scene, x: number, kind: ObstacleKind) {
    const spec = SPECS[kind];
    const tex = Obstacle.ensureTexture(scene, kind, spec);
    super(scene, x, spec.spawnY, tex);

    this.kind = kind;
    this.damagePct = spec.damagePct;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    this.setDisplaySize(spec.width, spec.height);
    body.setSize((spec.width * 0.6) / this.scaleX, (spec.height * 0.85) / this.scaleY, true);
    body.setAllowGravity(spec.gravity);
    body.setImmovable(!spec.gravity);
    this.setDepth(80);
  }

  private static ensureTexture(scene: Phaser.Scene, kind: ObstacleKind, spec: ObstacleSpec): string {
    const assetKey = ASSET_KEYS[kind];
    if (scene.textures.exists(assetKey)) return assetKey;

    const key = `__obs_${kind}`;
    if (scene.textures.exists(key)) return key;
    const g = scene.add.graphics({ x: 0, y: 0 });
    g.fillStyle(spec.color, 1);
    g.fillRoundedRect(0, 0, spec.width, spec.height, 8);

    if (kind === "smoke") {
      g.fillStyle(spec.accent ?? 0xffffff, 1);
      g.fillRoundedRect(4, 4, spec.width - 8, spec.height - 8, 4);
      g.fillStyle(0x000000, 0.2);
      g.fillRect(spec.width * 0.1, spec.height * 0.45, spec.width * 0.8, 4);
      g.fillRect(spec.width * 0.45, spec.height * 0.1, 4, spec.height * 0.8);
    } else if (kind === "pillar") {
      g.fillStyle(spec.accent ?? 0xffffff, 1);
      g.fillRect(5, 0, spec.width - 10, spec.height);
      g.fillStyle(0x000000, 0.2);
      for (let y = 10; y < spec.height; y += 20) {
        g.fillRect(0, y, spec.width, 4);
      }
    }

    g.generateTexture(key, spec.width, spec.height);
    g.destroy();
    return key;
  }
}
