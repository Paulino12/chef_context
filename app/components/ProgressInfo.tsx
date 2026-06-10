"use client";

import { Progress } from "@/components/ui/progress";

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export default function ProgressInfo({
  label = "Working...",
  percent,
  remainingMs,
}: {
  label?: string;
  percent: number;
  remainingMs: number | null;
}) {
  const pct = Math.round(Math.min(100, Math.max(0, percent)));

  return (
    <div
      className="w-full rounded-md border bg-muted/30 p-3"
      role="status"
      aria-live="polite"
    >
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        {typeof remainingMs === "number" && (
          <span className="shrink-0 text-muted-foreground">
            About {formatRemaining(remainingMs)} remaining
          </span>
        )}
      </div>
      <Progress value={pct} aria-label={label} />
    </div>
  );
}
