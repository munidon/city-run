export const AssetKey = {
  Player: "asset:player",
  PlayerJump: "asset:player:jump",
  PlayerSlide: "asset:player:slide",
  ObstacleSingleBox: "asset:obstacle:single_box",
  ObstacleDoublePillar: "asset:obstacle:double_pillar",
  BackgroundBack: "asset:background:back",
  BackgroundMid: "asset:background:mid",
  Road: "asset:road",
  ItemBread: "asset:item:bread",
  ItemLunchbox: "asset:item:lunchbox",
  ItemCoin: "asset:item:coin",
  Scroll: "asset:scroll",

  TitleLogo: "asset:ui:title-logo",
} as const;

export const GAME_IMAGE_ASSETS: Array<{ key: string; path: string }> = [
  // Obstacles are generated dynamically by Obstacle.ts
  { key: AssetKey.BackgroundBack, path: "assets/environment/bg_far.png" },
  { key: AssetKey.BackgroundMid, path: "assets/environment/bg_mid.png" },
  { key: AssetKey.Road, path: "assets/environment/road.png" },
  { key: AssetKey.ItemBread, path: "assets/items/bread.svg" },
  { key: AssetKey.ItemLunchbox, path: "assets/items/lunchbox.svg" },
  { key: AssetKey.ItemCoin, path: "assets/items/coin.svg" },
  { key: AssetKey.Scroll, path: "assets/items/scroll.svg" },

  { key: AssetKey.TitleLogo, path: "assets/ui/title-logo.png" },
];

export const GAME_ATLAS_ASSETS: Array<{ key: string; texturePath: string; atlasPath: string }> = [
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
