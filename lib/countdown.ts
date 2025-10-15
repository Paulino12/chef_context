// lib/countdown.ts
const now = () => Date.now();

export type Countdown = {
  stop: () => { elapsedMs: number };
};

export function startCountdown(
  expectedMs: number,
  onTick: (remainingMs: number) => void,
  stepMs = 100
): Countdown {
  const t0 = now();
  onTick(expectedMs);
  const id: ReturnType<typeof setInterval> = setInterval(() => {
    const elapsed = now() - t0;
    const remaining = Math.max(0, expectedMs - elapsed);
    onTick(remaining);
  }, stepMs);

  return {
    stop: () => {
      clearInterval(id);
      return { elapsedMs: now() - t0 };
    },
  };
}
