"use client";

/**
 * MenuGeneratorPage (Daily Menu Generator)
 *
 * PURPOSE
 * - Upload a weekly DOCX grid and generate menus (either for one day or all 7 days).
 * - If the filename contains a date (e.g. "... WC 22-09-2025.docx"), we auto-detect the week
 *   and provide a dropdown containing Mon..Sun of that week.
 *
 * FRONTEND–BACKEND CONTRACT
 * - POST /api/generate (Next.js proxy → FastAPI /generate)
 *   Request (multipart/form-data):
 *     - weekly: File (required, .docx)
 *     - date: YYYY-MM-DD (required if mode === "one")
 *     - all_days: "true" (required if mode === "seven")
 *   Response:
 *     - Body: ZIP
 *     - Headers: Content-Disposition (filename), Cache-Control: no-store
 *
 * UX NOTES
 * - Mode selector: "One day" or "All 7 days".
 * - If we can parse a week from the filename → show a 7-day dropdown.
 * - Otherwise we show a calendar popover for a single date.
 * - Button shows "Generating…" while the download is prepared.
 *
 * TECH NOTES
 * - We use a short timeout before URL.revokeObjectURL so the browser can begin the download.
 * - We set cache: "no-store" to avoid odd caching behavior in production.
 * - Monday is selected by default for the one-day flow when a parsed week is available.
 */

import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { ChevronDownIcon } from "lucide-react";
import { LAYOUT } from "@/app/lib/ui";
import { motion, AnimatePresence, number } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAdaptiveProgress } from "@/hooks/useAdaptieProgress";
import ProgressInfo from "@/app/components/ProgressInfo";

/* -------------------------- Utilities (pure helpers) -------------------------- */

/** Convert a Date to YYYY-MM-DD in local time (avoids TZ drift) */
const toYMDLocal = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
/** Parse YYYY-MM-DD → Date */
const fromYMD = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
};

/** Extract a plausible date from a filename, supports dd-mm-yyyy or yyyy-mm-dd */
function filenameDate(fileName: string): Date | undefined {
  const m1 = fileName.match(/(\d{2})[-_/](\d{2})[-_/](\d{4})/);
  if (m1) return new Date(+m1[3]!, +m1[2]! - 1, +m1[1]!);
  const m2 = fileName.match(/(\d{4})[-_/](\d{2})[-_/](\d{2})/);
  if (m2) return new Date(+m2[1]!, +m2[2]! - 1, +m2[3]!);
  return undefined;
}

/** Get the Monday for a given date */
const mondayOf = (d: Date) => {
  const x = new Date(d);
  const delta = (x.getDay() + 6) % 7; // since Monday
  x.setDate(x.getDate() - delta);
  x.setHours(0, 0, 0, 0);
  return x;
};

/** Build an array of 7 dates from Monday to Sunday */
const weekDays = (mon: Date) =>
  Array.from(
    { length: 7 },
    (_, i) => new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i)
  );

/** e.g., "Wednesday – 2025-09-10" */
const prettyOption = (d: Date) =>
  `${d.toLocaleDateString(undefined, { weekday: "long" })} – ${toYMDLocal(d)}`;

/** Try to read a filename from Content-Disposition for nice downloads */
const filenameFromContentDisposition = (cd: string | null) => {
  if (!cd) return null;
  const m1 = cd.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
  if (m1?.[1]) return decodeURIComponent(m1[1].replace(/^"+|"+$/g, ""));
  const m2 = cd.match(/filename="?([^"]+)"?/i);
  return m2?.[1] ?? null;
};

/* ------------------------------- Component -------------------------------- */

export default function MenuGeneratorPage() {
  /* ------------------------------- Local state ------------------------------- */
  // Uploaded weekly DOCX
  const [weekly, setWeekly] = useState<File | null>(null);

  // Mode: "one" (single day) vs "seven" (all days)
  const [mode, setMode] = useState<"one" | "seven">("one");

  // The chosen day if mode === "one"
  const [date, setDate] = useState<Date | undefined>(undefined);

  // Calendar popover state (fallback if filename had no date)
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Downloading flag
  const [downloading, setDownloading] = useState(false);

  const { remainingMs, percent, busy, runWithETA } = useAdaptiveProgress(
    "eta-generate-zip", // unique key per tool/action
    120_000 // sensible default ETA for prod (2 min)
  );

  /* ----------------------------- Derived week info ---------------------------- */

  /**
   * When a file is selected:
   *  - Try to parse a hint date from the filename
   *  - Build Mon..Sun for the week
   * If parsing fails, parsedWeek is undefined and we fall back to a calendar.
   */
  const parsedWeek = useMemo(() => {
    if (!weekly) return undefined;
    const hint = filenameDate(weekly.name);
    if (!hint) return undefined;
    return weekDays(mondayOf(hint));
  }, [weekly]);

  /**
   * UX: If we’re in one-day mode, and we just parsed a week, pick Monday by default.
   * This makes the Select show a concrete value immediately.
   */

  useEffect(() => {
    if (mode === "one" && parsedWeek && !date) {
      setDate(parsedWeek[0]); //Monday
    }
  }, [mode, parsedWeek, date]);

  /* --------------------------------- Actions --------------------------------- */

  /** Submit to backend, stream a ZIP, and trigger a browser download */
  const submit = () => {
    runWithETA(async () => {
      if (!weekly) return alert("Upload the weekly DOCX first.");

      const fd = new FormData();
      fd.append("weekly", weekly);

      if (mode === "seven") {
        fd.append("all_days", "true");
      } else {
        const chosen = date ?? parsedWeek?.[0];
        if (!chosen) return alert("Pick a date from the list.");
        fd.append("date", toYMDLocal(chosen));
      }
      const res = await fetch("/api/generate", {
        method: "POST",
        body: fd,
        cache: "no-store",
      });
      if (!res.ok) throw new Error((await res.text()) || "Generation failed");
      const cd = res.headers.get("content-disposition");
      const name =
        filenameFromContentDisposition(cd) ??
        (mode === "seven" ? "Henbrook-all-days.zip" : "menus.zip");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }).finally(() => {
      setDownloading(false); // safety reset
    });
  };

  /* ---------------------------------- Render --------------------------------- */

  return (
    <AnimatePresence>
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: 1,
          delay: 0.1,
          ease: "easeInOut",
        }}
        className={[
          "mx-auto max-w-5xl space-y-8",
          LAYOUT.CONTENT_MAX_W, // max width scales at lg
          LAYOUT.SECTION_GAP,
        ].join(" ")}
      >
        <Card className="border">
          <CardHeader>
            <CardTitle>Daily Menu Generator</CardTitle>
            <CardDescription>
              Upload your weekly DOCX and get daily menus in return.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload (full width) */}
            <section className="space-y-2">
              <Label htmlFor="weekly">Weekly menu (.docx)</Label>
              <Input
                id="weekly"
                type="file"
                accept=".docx"
                onChange={(e) => {
                  setWeekly(e.target.files?.[0] ?? null);
                  setDate(undefined);
                }}
                className="w-full cursor-pointer font-semibold"
              />
              <p className="text-xs text-muted-foreground">
                Tip: filenames like <code>...WC 22-09-2025.docx</code> will
                auto-fill the week.
              </p>
            </section>

            {/* Mode selector: responsive 2-up from sm+ */}
            <section className="space-y-2">
              <Label>What would you like to generate?</Label>
              <RadioGroup
                className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                value={mode}
                onValueChange={(v) => setMode(v as "one" | "seven")}
              >
                <div className="flex items-center gap-2 rounded-md border p-2">
                  <RadioGroupItem id="mode-one" value="one" />
                  <Label htmlFor="mode-one" className="cursor-pointer">
                    One day
                  </Label>
                </div>
                <div className="flex items-center gap-2 rounded-md border p-2">
                  <RadioGroupItem id="mode-seven" value="seven" />
                  <Label htmlFor="mode-seven" className="cursor-pointer">
                    All 7 days
                  </Label>
                </div>
              </RadioGroup>
            </section>

            {/* Day picker: dropdown of 7 days OR calendar fallback (only when mode==="one") */}
            {mode === "one" &&
              (parsedWeek ? (
                <section className="space-y-2">
                  <Label>Pick a day (from the uploaded week)</Label>
                  <Select
                    value={
                      date
                        ? toYMDLocal(date)
                        : parsedWeek
                        ? toYMDLocal(parsedWeek[0]) // Show Monday if none picked yet
                        : undefined
                    }
                    onValueChange={(val) => setDate(fromYMD(val))}
                  >
                    <SelectTrigger className="w-full cursor-pointer">
                      <SelectValue placeholder="Choose a date" />
                    </SelectTrigger>
                    <SelectContent>
                      {parsedWeek.map((d) => {
                        const value = toYMDLocal(d);
                        return (
                          <SelectItem
                            key={value}
                            value={value}
                            className="cursor-pointer"
                          >
                            {prettyOption(d)}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </section>
              ) : (
                <section className="space-y-2">
                  <Label>Date (single day)</Label>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full sm:w-60 justify-between font-normal cursor-pointer"
                      >
                        {date ? toYMDLocal(date) : "Select date"}
                        <ChevronDownIcon className="size-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        captionLayout="dropdown"
                        onSelect={(d) => {
                          setDate(d ?? undefined);
                          setCalendarOpen(false);
                        }}
                        className="p-2"
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">
                    We couldn’t detect a date in the filename — please pick a
                    day.
                  </p>
                </section>
              ))}

            {/* Generate button: full width on mobile, natural width from sm+ */}
            {!busy ? (
              <Button className="w-full cursor-pointer" onClick={submit}>
                Generate
              </Button>
            ) : (
              <div className="w-full">
                <ProgressInfo
                  label="Generating..."
                  percent={percent}
                  remainingMs={remainingMs}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.main>
    </AnimatePresence>
  );
}
