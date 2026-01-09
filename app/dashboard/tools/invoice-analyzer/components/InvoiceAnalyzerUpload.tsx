"use client";

/**
 * InvoiceAnalyzerUpload.tsx
 *
 * - Upload a Pelican ZIP -> POST /api/invoice-analyzer (Next proxy -> FastAPI)
 * - Show summary tiles: Invoices, Credits, Days covered (distinct dates)
 * - Supplier totals table in a custom order + TOTAL (Difference)
 * - Pleo card input (above the table) included in totals/budget, not shown as a row
 * - Chart (Supplier vs Difference) with abbreviated tick labels
 * - Budget analysis: Residents × PRPD × days-in-month, % of budget
 *
 * UI: shadcn/ui, chart: Recharts
 */

import * as React from "react";
import { useMemo, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
} from "recharts";
import { LAYOUT } from "@/app/lib/ui";

/* ----------------------------- Types & Helpers ----------------------------- */

type TotalsRow = {
  Supplier: string;
  "Account Number": string;
  Total: number | null;
  Credits: number | null;
  Difference: number | null;
};

type AnalyzeResponse = {
  summary?: {
    invoices_loaded: number;
    credits_count: number;
    // skipped omitted on purpose (not used in UI anymore)
  };
  totals?: TotalsRow[];
  csv?: string; // henbrook_invoice_analysis.csv (raw text)
  error?: string;
};

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function fmtGBP(v: number | null | undefined) {
  if (v == null) return "";
  return gbp.format(v);
}

/** Requested supplier order for the table */
const CUSTOM_ORDER = [
  "Direct Seafood",
  "Ritter",
  "Vegetarian express",
  "NCB Meat",
  "NCBFresh",
  "Bidfood",
  "Bidfood (BISTRO)",
  "Majestic Wine House",
] as const;

function sortTotals(rows: TotalsRow[]): TotalsRow[] {
  const rank = new Map<string, number>(CUSTOM_ORDER.map((n, i) => [n, i]));
  return [...rows].sort((a, b) => {
    const ai = rank.get(a.Supplier) ?? 9999;
    const bi = rank.get(b.Supplier) ?? 9999;
    if (ai !== bi) return ai - bi;
    const at = a.Total ?? 0;
    const bt = b.Total ?? 0;
    return bt - at;
  });
}

/** Abbreviate long supplier names for the chart tick labels */
function shortName(name: string): string {
  const n = name.toLowerCase();
  if (n.startsWith("vegetarian")) return "Veg Exp";
  if (n.startsWith("majestic")) return "Majestic";
  if (n.startsWith("direct sea")) return "Direct Sea";
  if (n.startsWith("ncbfresh")) return "NCBFresh";
  if (n.startsWith("ncb meat")) return "NCB Meat";
  if (n.startsWith("bidfood (bistro)")) return "Bidfood (Bistro)";
  return name.length > 16 ? name.slice(0, 14) + "…" : name;
}

/** Local utilities */
// function daysInCurrentMonth(): number {
//   const now = new Date();
//   return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
// }

/** Parse "Date" strings to JS Date (supports dd/mm/yyyy and ISO yyyy-mm-dd) */
function parseDateLoose(s: string): Date | null {
  const t = s.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) {
    const d = new Date(t);
    return isNaN(d.getTime()) ? null : d;
  }
  const m = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yyyy = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const d = new Date(yyyy, mm - 1, dd);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Count distinct invoice dates in the CSV ("Date" column), blank-safe.
 * We parse dates loosely and use the ISO date string (yyyy-mm-dd) as Set key.
 */
function countDistinctDatesFromCsv(csvText: string): number {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return 0;

  const headers = lines[0].split(",");
  const dateIdx = headers.findIndex((h) => h.trim().toLowerCase() === "date");
  if (dateIdx === -1) return 0;

  const seen = new Set<string>();
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const raw = (cols[dateIdx] ?? "").trim();
    if (!raw) continue;
    const d = parseDateLoose(raw);
    if (d) seen.add(d.toISOString().slice(0, 10));
  }
  return seen.size;
}

/* --------------------------------- Component -------------------------------- */

export default function InvoiceAnalyzerUpload() {
  // File input
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileKey, setFileKey] = useState(0); // allow reselecting same file after reset

  // Busy/error
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Returned data
  const [csv, setCsv] = useState<string | null>(null);
  const [totals, setTotals] = useState<TotalsRow[]>([]);
  const [summary, setSummary] = useState<AnalyzeResponse["summary"] | null>(
    null
  );

  // Budget inputs
  const [prpd, setPrpd] = useState<number | "">(11.28);
  const [residents, setResidents] = useState<number | "">("");
  const [numberOfDays, setnumberOfDays] = useState<number | "">("");

  // Pleo (manual difference) — added to budget, not a table row
  const [pleoDiff, setPleoDiff] = useState<number | "">("");

  // Days covered (inclusive range), plus extra info for display
  const [daysCovered, setDaysCovered] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<{
    minISO: string;
    maxISO: string;
  } | null>(null);
  const [distinctDays, setDistinctDays] = useState<number | null>(null);
  /** Parse "Date" strings to JS Date (supports dd/mm/yyyy and ISO yyyy-mm-dd) */
  function parseDateLoose(s: string): Date | null {
    const t = s.trim();
    if (!t) return null;
    // ISO first
    if (/^\d{4}-\d{2}-\d{2}/.test(t)) {
      const d = new Date(t);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    // dd/mm/yyyy (or dd-mm-yyyy)
    const m = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) {
      const dd = Number(m[1]);
      const mm = Number(m[2]);
      const yyyy = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
      const d = new Date(yyyy, mm - 1, dd);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  /**
   * Compute coverage from CSV "Date" column:
   *  - rangeDays: inclusive day count between min and max dates
   *  - distinctDays: number of unique dates present
   *  - minISO / maxISO: ISO yyyy-mm-dd strings
   */
  function computeDateCoverageFromCsv(csvText: string): {
    rangeDays: number;
    distinctDays: number;
    minISO: string;
    maxISO: string;
  } {
    const lines = csvText.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2)
      return { rangeDays: 0, distinctDays: 0, minISO: "", maxISO: "" };

    const headers = lines[0].split(",");
    const dateIdx = headers.findIndex((h) => h.trim().toLowerCase() === "date");
    if (dateIdx === -1)
      return { rangeDays: 0, distinctDays: 0, minISO: "", maxISO: "" };

    const dates: Date[] = [];
    const seen = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      const raw = (cols[dateIdx] ?? "").trim();
      if (!raw) continue;
      const d = parseDateLoose(raw);
      if (!d) continue;
      const iso = d.toISOString().slice(0, 10);
      seen.add(iso);
      dates.push(d);
    }

    if (dates.length === 0) {
      return { rangeDays: 0, distinctDays: 0, minISO: "", maxISO: "" };
    }
    // min/max
    const min = new Date(Math.min(...dates.map((d) => d.getTime())));
    const max = new Date(Math.max(...dates.map((d) => d.getTime())));
    // inclusive days (e.g., 01→08 = 8 days)
    const msPerDay = 24 * 60 * 60 * 1000;
    const rangeDays =
      Math.floor((max.getTime() - min.getTime()) / msPerDay) + 1;

    return {
      rangeDays,
      distinctDays: seen.size,
      minISO: min.toISOString().slice(0, 10),
      maxISO: max.toISOString().slice(0, 10),
    };
  }

  // Analyze
  async function onAnalyze() {
    if (!file) return;
    setBusy(true);
    setErr(null);
    setCsv(null);
    setTotals([]);
    setSummary(null);

    try {
      const fd = new FormData();
      fd.append("file", file, file.name);

      const res = await fetch("/api/invoice-analyzer", {
        method: "POST",
        body: fd,
      });
      const json: AnalyzeResponse = await res.json();
      if (!res.ok)
        throw new Error(json?.error || `Server error (${res.status})`);

      const rows = sortTotals(json.totals ?? []);
      setTotals(rows);
      setSummary(json.summary ?? null);
      setCsv(json.csv ?? null);
      // setDaysCovered(json.csv ? countDistinctDatesFromCsv(json.csv) : 0);
      if (json.csv) {
        const cov = computeDateCoverageFromCsv(json.csv);
        setDaysCovered(cov.rangeDays); // <- use inclusive range days for the tile
        setDistinctDays(cov.distinctDays); // optional display
        setDateRange({ minISO: cov.minISO, maxISO: cov.maxISO });
      } else {
        setDaysCovered(0);
        setDistinctDays(0);
        setDateRange(null);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  // Download CSV
  function onDownloadCsv() {
    if (!csv) return;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "henbrook_invoice_analysis.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Reset
  function onReset() {
    setFile(null);
    setTotals([]);
    setSummary(null);
    setCsv(null);
    setErr(null);
    setPrpd(11.28);
    setResidents("");
    setnumberOfDays("");
    setPleoDiff("");
    setDaysCovered(null);
    if (fileRef.current) fileRef.current.value = "";
    setFileKey((k) => k + 1);
  }

  // Numbers helpers
  function parseNumberOrEmpty(s: string): number | "" {
    if (s.trim() === "") return "";
    const n = Number(s);
    return Number.isFinite(n) ? n : "";
  }

  const pleoValue = useMemo(() => {
    const n = typeof pleoDiff === "number" ? pleoDiff : Number(pleoDiff || 0);
    return Number.isFinite(n) ? n : 0;
  }, [pleoDiff]);

  // Total suppliers invoices plus credits
  const totalInclCredits = useMemo(() => {
    const totalSum = totals.reduce((acc, r) => acc + (r.Total ?? 0), 0);
    return totalSum;
  }, [totals]);

  // Total credits returned by suppliers
  const totalCredits = useMemo(() => {
    const creditsSum = totals.reduce((acc, r) => acc + (r.Credits ?? 0), 0);
    return creditsSum;
  }, [totals]);

  // Total invoices less all credits returned plus pleo value
  const totalDifference = useMemo(() => {
    const supplierSum = totals.reduce((acc, r) => acc + (r.Difference ?? 0), 0);
    return supplierSum;
  }, [totals]);

  // Total invoices less all credits returned plus pleo value
  const totalDifferencePlusPleo = useMemo(() => {
    const supplierSum = totals.reduce((acc, r) => acc + (r.Difference ?? 0), 0);
    return supplierSum + pleoValue;
  }, [totals, pleoValue]);

  // const dim = useMemo(() => daysInCurrentMonth(), []);
  const monthlyBudget = useMemo(() => {
    const pp = typeof prpd === "number" ? prpd : Number(prpd); // per resident per day
    const rr = typeof residents === "number" ? residents : Number(residents); // number of residents
    const nn = // number of days
      typeof numberOfDays === "number" ? numberOfDays : Number(numberOfDays);
    if (!rr || !pp || !nn) return 0;
    return rr * pp * nn;
  }, [residents, prpd, numberOfDays]);

  const percentOfBudget = useMemo(() => {
    if (!monthlyBudget) return 0;
    return (totalDifferencePlusPleo / monthlyBudget) * 100;
  }, [monthlyBudget, totalDifferencePlusPleo]);

  // Chart data (suppliers only; Pleo isn’t a supplier row)
  const chartData = useMemo(
    () =>
      totals.map((r) => ({
        supplier: r.Supplier,
        label: shortName(r.Supplier),
        diff: r.Difference ?? 0,
      })),
    [totals]
  );

  return (
    <main
      className={[
        "mx-auto max-w-5xl space-y-8",
        LAYOUT.CONTENT_MAX_W, // max width scales at lg
        LAYOUT.SECTION_GAP,
      ].join(" ")}
    >
      {/* Uploader */}
      <Card className="border">
        <CardHeader>
          <CardTitle>Invoice Analyzer</CardTitle>
          <CardDescription>
            Upload Pelican Pi ZIP of .xlsx invoices.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
            <div className="space-y-2">
              <Label htmlFor="zip" className="cursor-pointer">
                Choose file
              </Label>
              <Input
                key={fileKey}
                id="zip"
                type="file"
                accept=".zip"
                ref={fileRef}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="cursor-pointer font-bold"
              />
            </div>

            <Button
              size="lg"
              className="sm:ml-3 cursor-pointer"
              disabled={!file || busy}
              onClick={onAnalyze}
            >
              {busy ? "Analyzing…" : "Analyze ZIP"}
            </Button>
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}

          {summary && (
            <>
              <Separator className="my-2" />
              <div className="grid gap-3 sm:grid-cols-3">
                <Card>
                  <CardHeader className="p-3">
                    <CardDescription>Invoices</CardDescription>
                    <CardTitle className="text-2xl">
                      {summary?.invoices_loaded ?? 0}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="p-3">
                    <CardDescription>Credits</CardDescription>
                    <CardTitle className="text-2xl">
                      {summary?.credits_count ?? 0}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="p-3">
                    <CardDescription>Days covered</CardDescription>
                    <CardTitle className="text-2xl">
                      {daysCovered ?? 0}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>
            </>
          )}
        </CardContent>

        <CardFooter className="flex gap-3">
          <Button
            variant="secondary"
            className="cursor-pointer"
            onClick={onReset}
          >
            Reset
          </Button>
          {csv && (
            <Button onClick={onDownloadCsv} className="cursor-pointer">
              ⬇️ Download invoice analysis
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Totals + Pleo + Chart + Budget */}
      {!!totals.length && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Top suppliers by amount Number
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-center">
                      Account Number
                    </TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Credits</TableHead>
                    <TableHead className="text-center">Difference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {totals.map((r, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/40">
                      <TableCell className="whitespace-nowrap">
                        {r.Supplier}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-center">
                        {r["Account Number"]}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {fmtGBP(r.Total)}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {fmtGBP(r.Credits)}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {fmtGBP(r.Difference)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/40 font-semibold">
                    <TableCell className="whitespace-nowrap">TOTAL</TableCell>
                    <TableCell className="text-center" />
                    <TableCell className="text-center tabular-nums">
                      {fmtGBP(totalInclCredits)}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {fmtGBP(totalCredits)}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {fmtGBP(totalDifference)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Chart */}
            <Card className="border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Difference by Supplier (chart)
                </CardTitle>
                <CardDescription>
                  Visualising the same order as the table above.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72 w-full">
                  <ResponsiveContainer>
                    <BarChart
                      data={chartData}
                      margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 12 }}
                        interval={0}
                      />
                      <YAxis tickFormatter={(v) => gbp.format(v)} width={80} />
                      <Tooltip
                        formatter={(value: unknown) => {
                          const n =
                            typeof value === "number"
                              ? value
                              : Number(value as unknown);
                          return fmtGBP(Number.isFinite(n) ? n : 0);
                        }}
                        labelFormatter={(label: unknown) =>
                          `Supplier: ${String(label)}`
                        }
                      />
                      <Bar dataKey="diff">
                        <LabelList
                          dataKey="diff"
                          position="top"
                          formatter={(label: React.ReactNode) => {
                            const n =
                              typeof label === "number"
                                ? label
                                : Number(label as unknown);
                            return fmtGBP(Number.isFinite(n) ? n : 0);
                          }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Budget analysis */}
            <Card className="border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Budget analysis</CardTitle>
                <CardDescription>PRPD = Per-Resident-Per-Day.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-4">
                  {/* Pleo input (kept above table) */}
                  <div className="space-y-2">
                    <Label htmlFor="pleo-diff">Pleo card (£)</Label>
                    <Input
                      id="pleo-diff"
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      className="cursor-pointer"
                      value={pleoDiff}
                      onChange={(e) =>
                        setPleoDiff(parseNumberOrEmpty(e.target.value))
                      }
                      placeholder="Enter Pleo spend"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prpd">PRPD (£)</Label>
                    <Input
                      id="prpd"
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      className="cursor-pointer"
                      value={prpd}
                      onChange={(e) =>
                        setPrpd(parseNumberOrEmpty(e.target.value))
                      }
                      placeholder="11.28"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="residents">Residents</Label>
                    <Input
                      id="residents"
                      type="number"
                      min={0}
                      step="1"
                      inputMode="numeric"
                      className="cursor-pointer"
                      value={residents}
                      onChange={(e) =>
                        setResidents(parseNumberOrEmpty(e.target.value))
                      }
                      placeholder="Enter number of residents"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="residents">Number of days</Label>
                    <Input
                      id="numberOfDays"
                      type="number"
                      min={0}
                      step="1"
                      inputMode="numeric"
                      className="cursor-pointer"
                      value={numberOfDays}
                      onChange={(e) =>
                        setnumberOfDays(parseNumberOrEmpty(e.target.value))
                      }
                      placeholder="Enter number of days"
                    />
                  </div>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted">
                        <TableHead>Metric</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>
                          Monthly budget (Residents × PRPD × Number of days)
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtGBP(monthlyBudget)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          Current spend (total of Difference + Pleo)
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtGBP(totalDifferencePlusPleo)}
                        </TableCell>
                      </TableRow>
                      <TableRow className="bg-muted/40 font-semibold">
                        <TableCell>Current % of monthly budget</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {monthlyBudget
                            ? `${percentOfBudget.toFixed(2)}%`
                            : ""}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
