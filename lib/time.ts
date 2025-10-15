// lib/time.ts
export function formatRemainingVerbose(ms: number): string {
  const totalSecs = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const m = mins === 1 ? "minute" : "minutes";
  const s = secs === 1 ? "second" : "seconds";
  return `${mins} ${m}, ${secs} ${s}`;
}