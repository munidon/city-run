export const AssetKey = {
  Player: "asset:player",
  ObstacleFlame: "asset:obstacle:flame",
  ObstacleFalling: "asset:obstacle:falling",
  ObstacleLowBar: "asset:obstacle:low_bar",
  ItemBread: "asset:item:bread",
  ItemLunchbox: "asset:item:lunchbox",
  ItemCoin: "asset:item:coin",
  Scroll: "asset:scroll",
  BackgroundBack: "asset:background:back",
  BackgroundMid: "asset:background:mid",
  Road: "asset:road",
} as const;

export const GAME_IMAGE_ASSETS: Array<{ key: string; path: string }> = [
  { key: AssetKey.ObstacleFlame, path: "assets/obstacles/flame.svg" },
  { key: AssetKey.ObstacleFalling, path: "assets/obstacles/falling-debris.svg" },
  { key: AssetKey.ObstacleLowBar, path: "assets/obstacles/low-bar.svg" },
  { key: AssetKey.ItemBread, path: "assets/items/bread.svg" },
  { key: AssetKey.ItemLunchbox, path: "assets/items/lunchbox.svg" },
  { key: AssetKey.ItemCoin, path: "assets/items/coin.svg" },
  { key: AssetKey.Scroll, path: "assets/items/scroll.svg" },
  { key: AssetKey.BackgroundBack, path: "assets/environment/back-background.png" },
  { key: AssetKey.BackgroundMid, path: "assets/environment/mid-background.png" },
  { key: AssetKey.Road, path: "assets/environment/road.png" },
];

export const GAME_ATLAS_ASSETS: Array<{ key: string; texturePath: string; atlasPath: string }> = [
  {
    key: AssetKey.Player,
    texturePath: "assets/player/player_cat.png",
    atlasPath: "assets/player/player_cat.json",
  },
];
