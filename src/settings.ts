const BGM_VOLUME_KEY = "city-run:bgm-volume";
const DEFAULT_BGM_VOLUME = 0.6;

export function getBgmVolume(): number {
  try {
    const raw = localStorage.getItem(BGM_VOLUME_KEY);
    if (raw === null) return DEFAULT_BGM_VOLUME;
    return clampVolume(Number(raw));
  } catch {
    return DEFAULT_BGM_VOLUME;
  }
}

export function setBgmVolume(value: number): number {
  const next = clampVolume(value);
  try {
    localStorage.setItem(BGM_VOLUME_KEY, String(next));
  } catch {
    // Ignore storage failures; the in-session sound setting still applies.
  }
  return next;
}

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_BGM_VOLUME;
  return Math.max(0, Math.min(1, value));
}
