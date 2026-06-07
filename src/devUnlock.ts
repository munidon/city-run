let devToolsUnlocked = false;

export function isDevToolsUnlocked(): boolean {
  return devToolsUnlocked;
}

export function unlockDevTools(): void {
  devToolsUnlocked = true;
}
