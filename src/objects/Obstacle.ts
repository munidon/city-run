import * as Phaser from "phaser";
import { GROUND_Y } from "@/config";

export type ObstacleKind = "flame" | "falling" | "low_bar";

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
  flame: {
    width: 56,
    height: 84,
    damagePct: 10,
    color: 0xff5a2a,
    accent: 0xffe066,
    spawnY: GROUND_Y - 42,
    gravity: false,
    label: "🔥",
  },
  falling: {
    width: 64,
    height: 64,
    damagePct: 15,
    color: 0x8c715a,
    accent: 0x4a3a2a,
    spawnY: -40,
    gravity: true,
    label: "▣",
  },
  low_bar: {
    width: 110,
    height: 30,
    damagePct: 8,
    color: 0x7a8190,
    accent: 0xfdd835,
    spawnY: GROUND_Y - 110,
    gravity: false,
    label: "═",
  },
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
    body.setSize(spec.width, spec.height);
    body.setAllowGravity(spec.gravity);
    body.setImmovable(!spec.gravity);
    this.setDepth(50);
  }

  private static ensureTexture(scene: Phaser.Scene, kind: ObstacleKind, spec: ObstacleSpec): string {
    const key = `__obs_${kind}`;
    if (scene.textures.exists(key)) return key;
    const g = scene.add.graphics({ x: 0, y: 0 });
    g.fillStyle(spec.color, 1);
    g.fillRoundedRect(0, 0, spec.width, spec.height, 8);

    if (kind === "flame") {
      g.fillStyle(spec.accent ?? 0xffffff, 1);
      g.fillRoundedRect(spec.width * 0.2, spec.height * 0.18, spec.width * 0.6, spec.height * 0.45, 8);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(spec.width * 0.5, spec.height * 0.32, 6);
    } else if (kind === "low_bar") {
      g.fillStyle(spec.accent ?? 0xffffff, 1);
      const stripeW = 18;
      for (let i = 0; i < spec.width; i += stripeW * 2) {
        g.fillRect(i, 0, stripeW, spec.height);
      }
      g.fillStyle(spec.color, 1);
      g.fillRect(0, 0, spec.width, 4);
      g.fillRect(0, spec.height - 4, spec.width, 4);
    } else {
      g.fillStyle(spec.accent ?? 0x000000, 0.4);
      g.fillRect(spec.width * 0.15, spec.height * 0.55, spec.width * 0.7, 6);
      g.fillRect(spec.width * 0.25, spec.height * 0.25, spec.width * 0.5, 6);
    }

    g.generateTexture(key, spec.width, spec.height);
    g.destroy();
    return key;
  }
}
