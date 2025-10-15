// lib/smooth-finish.ts
export async function smoothFinish(
  setRemainingMs: (v: number | null) => void,
  setBusy: (v: boolean) => void,
  dwellMs = 200
) {
  setRemainingMs(0);                 // show 0.0s / 100%
  await new Promise((r) => setTimeout(r, dwellMs));
  setBusy(false);
  setRemainingMs(null);              // reset UI
}
