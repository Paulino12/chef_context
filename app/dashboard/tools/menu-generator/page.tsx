"use client";

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
import { motion, AnimatePresence } from "framer-motion";

/* ---------------- Utilities (unchanged from your version) ----------------- */
const toYMDLocal = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
const fromYMD = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
};
function filenameDate(fileName: string): Date | undefined {
  const m1 = fileName.match(/(\d{2})[-_/](\d{2})[-_/](\d{4})/);
  if (m1) return new Date(+m1[3]!, +m1[2]! - 1, +m1[1]!);
  const m2 = fileName.match(/(\d{4})[-_/](\d{2})[-_/](\d{2})/);
  if (m2) return new Date(+m2[1]!, +m2[2]! - 1, +m2[3]!);
  return undefined;
}
const mondayOf = (d: Date) => {
  const x = new Date(d);
  const delta = (x.getDay() + 6) % 7; // since Monday
  x.setDate(x.getDate() - delta);
  x.setHours(0, 0, 0, 0);
  return x;
};
const weekDays = (mon: Date) =>
  Array.from(
    { length: 7 },
    (_, i) => new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i)
  );
const prettyOption = (d: Date) =>
  `${d.toLocaleDateString(undefined, { weekday: "long" })} – ${toYMDLocal(d)}`;
const filenameFromContentDisposition = (cd: string | null) => {
  if (!cd) return null;
  const m1 = cd.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
  if (m1?.[1]) return decodeURIComponent(m1[1].replace(/^"+|"+$/g, ""));
  const m2 = cd.match(/filename="?([^"]+)"?/i);
  return m2?.[1] ?? null;
};

/* ------------------------------- Component -------------------------------- */

export default function MenuGeneratorPage() {
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

  // When a file is picked, try to infer the week → build Mon..Sun array
  const parsedWeek = useMemo(() => {
    if (!weekly) return undefined;
    const hint = filenameDate(weekly.name);
    if (!hint) return undefined;
    return weekDays(mondayOf(hint));
  }, [weekly]);

  useEffect(() => {
    if (mode === "one" && parsedWeek && !date) {
      setDate(parsedWeek[0]); //Monday
    }
  }, [mode, parsedWeek, date]);

  const submit = async () => {
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

    // Optional: cancel in-flight if component unmounts
    const ctrl = new AbortController();
    setDownloading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        body: fd,
        cache: "no-store", // <-- avoid caching issues
        signal: ctrl.signal,
      });

      if (!res.ok) {
        throw new Error((await res.text()) || "Generation failed");
      }

      // Get filename from Content-Disposition if available
      const cd = res.headers.get("content-disposition");
      const name =
        filenameFromContentDisposition(cd) ??
        (mode === "seven" ? "Henbrook-all-days.zip" : "menus.zip");

      // Buffer the file and trigger a download
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = name;

      // Append to DOM so click is honored by all browsers
      document.body.appendChild(a);
      a.click();
      a.remove();

      // Revoke after a short delay so the browser has consumed the URL
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Generation failed";
      alert(msg);
    } finally {
      setDownloading(false); // <-- reliably flips the button back
    }
  };

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
          "mx-auto w-1/2",
          LAYOUT.CONTENT_MAX_W, // max width scales at lg
          LAYOUT.SECTION_GAP,
        ].join(" ")}
      >
        <h1 className="text-2xl font-semibold">Daily Menu Generator</h1>

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
                We couldn’t detect a date in the filename — please pick a day.
              </p>
            </section>
          ))}

        {/* Generate button: full width on mobile, natural width from sm+ */}
        <Button
          className="w-full cursor-pointer"
          onClick={submit}
          disabled={downloading}
        >
          {downloading ? "Generating…" : "Generate"}
        </Button>
      </motion.main>
    </AnimatePresence>
  );
}
