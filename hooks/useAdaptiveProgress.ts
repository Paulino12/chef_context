"use client";

import { useMemo, useState } from "react";
import { startCountdown } from "@/lib/countdown";
import { readETA, updateETA } from "@/lib/eta";
import { smoothFinish } from "@/lib/smooth-finish";

export function useAdaptiveProgress(etaKey: string, defaultMs = 60_000) {
  const [expectedMs, setExpectedMs] = useState<number>(() =>
    readETA(etaKey, defaultMs)
  );
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const percent = useMemo(() => {
    if (remainingMs === null || expectedMs <= 0) return 0;
    if (remainingMs <= 0 && busy) return 95;
    return Math.min(
      100,
      Math.max(0, ((expectedMs - remainingMs) / expectedMs) * 100)
    );
  }, [remainingMs, expectedMs, busy]);

  const runWithETA = async <T,>(task: () => Promise<T>): Promise<T> => {
    setBusy(true);
    const eta = readETA(etaKey, defaultMs);
    setExpectedMs(eta);

    const countdown = startCountdown(eta, setRemainingMs);
    try {
      const result = await task();
      const { elapsedMs } = countdown.stop();
      updateETA(etaKey, elapsedMs);
      await smoothFinish(setRemainingMs, setBusy);
      return result;
    } catch (e) {
      countdown.stop();
      await smoothFinish(setRemainingMs, setBusy);
      throw e;
    }
  };

  return { expectedMs, remainingMs, percent, busy, runWithETA };
}
