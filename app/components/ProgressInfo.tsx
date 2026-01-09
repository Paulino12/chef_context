"use client";

export default function ProgressInfo({
  label = "Downloading…",
  percent,
}: {
  label?: string;
  percent: number; // 0..100
  remainingMs: number | null; // pass null to hide ETA
}) {
  const pct = Math.round(Math.min(100, Math.max(0, percent)));
  return (
    <div className="relative p-2 flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all ">
      <span>{label}</span>
      {/* {typeof remainingMs === "number" &&
        `(Estimated time remaining: ${formatRemainingVerbose(remainingMs)})`} */}
      <div
        className="absolute rounded-md p-2 inset-y-0 left-0 bg-primary/10 transition-[width] duration-100"
        style={{ width: `${pct}%` }}
      ></div>
    </div>
  );
}
