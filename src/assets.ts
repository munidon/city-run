export const AssetKey = {
  Player: "asset:player",
  PlayerJump: "asset:player:jump",
  PlayerSlide: "asset:player:slide",
  ObstacleSingleBox: "asset:obstacle:single_box",
  ObstacleDoublePillar: "asset:obstacle:double_pillar",
  BackgroundBack: "asset:background:back",
  BackgroundMid: "asset:background:mid",
  Road: "asset:road",
  ItemGimbap: "asset:item:gimbap",
  ItemBento: "asset:item:bento",
  ItemCoin: "asset:item:coin",
  Scroll: "asset:scroll",
  DisasterFire: "asset:disaster:fire",

  TitleLogo: "asset:ui:title-logo",
} as const;

export const GAME_IMAGE_ASSETS: Array<{ key: string; path: string }> = [
  // Obstacles are generated dynamically by Obstacle.ts
  { key: AssetKey.BackgroundBack, path: "assets/environment/bg_far.png" },
  { key: AssetKey.BackgroundMid, path: "assets/environment/bg_mid.png" },
  { key: AssetKey.Road, path: "assets/environment/road.png" },
  { key: AssetKey.ItemGimbap, path: "assets/items/gimbap.png" },
  { key: AssetKey.ItemBento, path: "assets/items/bento.png" },
  { key: AssetKey.ItemCoin, path: "assets/items/coin.png" },
  { key: AssetKey.Scroll, path: "assets/items/scroll.png" },

  { key: AssetKey.TitleLogo, path: "assets/ui/title-logo.png" },
];

export const GAME_ATLAS_ASSETS: Array<{ key: string; texturePath: string; atlasPath: string }> = [
  {
    key: AssetKey.DisasterFire,
    texturePath: "assets/disasters/fire_spirit.png",
    atlasPath: "assets/disasters/fire_spirit.json",
  },
  {
    key: AssetKey.Player,
    texturePath: "assets/player/player_boy.png",
    atlasPath: "assets/player/player_boy.json",
  },
  {
    key: AssetKey.PlayerJump,
    texturePath: "assets/player/player_boy_jump.png",
    atlasPath: "assets/player/player_boy_jump.json",
  },
  {
    key: AssetKey.PlayerSlide,
    texturePath: "assets/player/player_slide_sprites.png",
    atlasPath: "assets/player/player_slide_sprites.json",
  },
];
