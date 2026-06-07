export const AssetKey = {
  Player: "asset:player",
  PlayerJump: "asset:player:jump",
  PlayerSlide: "asset:player:slide",
  ObstacleSmoke: "asset:obstacle:smoke",
  ObstaclePillar: "asset:obstacle:pillar",
  ObstacleFireSmoke: "asset:obstacle:fire_smoke",
  BackgroundBack: "asset:background:back",
  BackgroundMid: "asset:background:mid",
  BackgroundBackFlood: "asset:background:back:flood",
  BackgroundMidFlood: "asset:background:mid:flood",
  Road: "asset:road",
  Deck: "asset:deck",
  ItemGimbap: "asset:item:gimbap",
  ItemBento: "asset:item:bento",
  ItemCoin: "asset:item:coin",
  ItemEnergyDrink: "asset:item:energy_drink",
  ItemFireExtinguisher: "asset:item:fire_extinguisher",
  ItemGasMask: "asset:item:gas_mask",
  ItemWetTowel: "asset:item:wet_towel",
  Scroll: "asset:scroll",
  DisasterFire: "asset:disaster:fire",

  TitleLogo: "asset:ui:title-logo",
} as const;

export const SoundKey = {
  Bgm: "sound:bgm",
  GameStart: "sound:game_Start",
  DisasterAppear: "sound:disaster_Appear",
  BossHit: "sound:boss_Hit",
  StageClear: "sound:stage_Clear",
  Exit: "sound:exit",
  Settings: "sound:settings",
  Coin: "sound:coin",
  GetScroll: "sound:get_scroll",
} as const;

export const GAME_IMAGE_ASSETS: Array<{ key: string; path: string }> = [
  { key: AssetKey.ObstacleSmoke, path: "assets/obstacles/box.png" },
  { key: AssetKey.ObstaclePillar, path: "assets/obstacles/pillar.png" },
  { key: AssetKey.ObstacleFireSmoke, path: "assets/obstacles/fire_smoke.png" },
  { key: AssetKey.BackgroundBack, path: "assets/environment/bg_far.png" },
  { key: AssetKey.BackgroundMid, path: "assets/environment/bg_mid.png" },
  { key: AssetKey.BackgroundBackFlood, path: "assets/environment/bg_fat_flood.jpg" },
  { key: AssetKey.BackgroundMidFlood, path: "assets/environment/bg_mid_flood.png" },
  { key: AssetKey.Road, path: "assets/environment/road.png" },
  { key: AssetKey.Deck, path: "assets/environment/deck.png" },
  { key: AssetKey.ItemGimbap, path: "assets/items/gimbap.png" },
  { key: AssetKey.ItemBento, path: "assets/items/bento.png" },
  { key: AssetKey.ItemCoin, path: "assets/items/coin.png" },
  { key: AssetKey.ItemEnergyDrink, path: "assets/items/energy_drink.png" },
  { key: AssetKey.ItemFireExtinguisher, path: "assets/items/fire_extinguisher.png" },
  { key: AssetKey.ItemGasMask, path: "assets/items/gas_mask.png" },
  { key: AssetKey.ItemWetTowel, path: "assets/items/wet_towel.png" },
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

export const GAME_AUDIO_ASSETS: Array<{ key: string; path: string }> = [
  { key: SoundKey.Bgm, path: "assets/music/Final_Sprint_to_the_Gates.mp3" },
  { key: SoundKey.GameStart, path: "assets/sound/game_Start.wav" },
  { key: SoundKey.DisasterAppear, path: "assets/sound/disaster_Appear.wav" },
  { key: SoundKey.BossHit, path: "assets/sound/boss_Hit.wav" },
  { key: SoundKey.StageClear, path: "assets/sound/stage_Clear.wav" },
  { key: SoundKey.Exit, path: "assets/sound/exit.wav" },
  { key: SoundKey.Settings, path: "assets/sound/settings.wav" },
  { key: SoundKey.Coin, path: "assets/sound/Coin4.ogg" },
  { key: SoundKey.GetScroll, path: "assets/sound/get_scroll.ogg" },
];
