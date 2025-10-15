// lib/eta.ts
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function readETA(key: string, defMs = 60_000): number {
  if (typeof window === "undefined") return defMs;
  const raw = window.localStorage.getItem(key);
  const v = raw ? parseInt(raw, 10) : defMs;
  return clamp(Number.isFinite(v) ? v : defMs, 5_000, 15 * 60_000);
}

export function updateETA(key: string, elapsedMs: number) {
  const prev = readETA(key);
  const ema = Math.round(prev * 0.6 + elapsedMs * 0.4);
  if (typeof window !== "undefined") window.localStorage.setItem(key, String(ema));
}

export function clearETA(key: string) {
  if (typeof window !== "undefined") window.localStorage.removeItem(key);
}
