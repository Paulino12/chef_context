"use client";

/**
 * InvoiceAnalyzerUpload.tsx
 *
 * Front-end uploader for the Invoice Analyzer tool.
 * - Upload .zip -> POST to /api/invoice-analyzer (Next proxy -> FastAPI)
 * - Show summary metrics
 * - Show totals table (custom supplier order) with a final TOTAL row (Difference sum)
 * - NEW: Chart card visualising Supplier vs Difference
 * - Budget analysis card (Residents × PRPD × days-in-month) with % of budget
 *
 * Uses shadcn/ui and Recharts.
 */

import * as React from "react";
import { useMemo, useState, useRef } from "react";
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
import { motion, AnimatePresence } from "framer-motion";
import { LAYOUT } from "@/app/lib/ui";

/* ----------------------------- Types & Helpers ----------------------------- */

/** Row schema returned by the backend for the totals table */
type TotalsRow = {
  Supplier: string;
  "Account Number": string;
  Total: number | null;
  Credits: number | null;
  Difference: number | null;
};

/** JSON shape from the /api/invoice-analyzer route */
type AnalyzeResponse = {
  summary?: {
    invoices_loaded: number;
    credits_count: number;
    skipped: [string, string][];
  };
  totals?: TotalsRow[];
  csv?: string; // raw CSV text for henbrook_invoice_analysis.csv
  error?: string;
};

/** Currency formatter (GBP, 2dp) */
const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format a number as GBP (blank for null/undefined) */
function fmtGBP(v: number | null | undefined) {
  if (v == null) return "";
  return gbp.format(v);
}

/** Supplier order (exact order requested) */
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

/**
 * Sort totals rows by our custom supplier order, then by Total (desc) inside ties.
 * Keeps presentation consistent regardless of backend order.
 */
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

/** Days in the current month (local time) */
function daysInCurrentMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

/* --------------------------------- Component -------------------------------- */

export default function InvoiceAnalyzerUpload() {
  // UI state
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Data returned by analyzer
  const [csv, setCsv] = useState<string | null>(null);
  const [totals, setTotals] = useState<TotalsRow[]>([]);
  const [summary, setSummary] = useState<AnalyzeResponse["summary"] | null>(
    null
  );

  // Budget inputs (front end only)
  const [residents, setResidents] = useState<number | "">("");
  const [prpd, setPrpd] = useState<number | "">(11.28); // default PRPD

  // inside component:
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Analyze: send the ZIP to our Next API route which proxies to the FastAPI backend.
   * Clears previous state, handles errors, and stores CSV + totals + summary.
   */
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

      setCsv(json.csv ?? null);
      setTotals(sortTotals(json.totals ?? []));
      setSummary(json.summary ?? null);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Analysis failed";
      alert(msg);
    } finally {
      setBusy(false);
    }
  }

  /** Download the CSV returned by the backend (button only shows after analysis) */
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

  /** Reset to initial UI state */
  function onReset() {
    setFile(null);
    setTotals([]);
    setCsv(null);
    setSummary(null);
    setErr(null);
    setResidents("");
    setPrpd(11.28);

    // clear the actual <input type="file">
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  /** Sum of the Difference column (ignores nulls) */
  const totalDifference = useMemo(
    () => totals.reduce((acc, r) => acc + (r.Difference ?? 0), 0),
    [totals]
  );

  /** Days in current month (fixed for the current calendar month) */
  const dim = useMemo(() => daysInCurrentMonth(), []);

  /** Monthly budget = Residents × PRPD × DaysInMonth (front-end only, after analysis) */
  const monthlyBudget = useMemo(() => {
    const rr = typeof residents === "number" ? residents : Number(residents);
    const pp = typeof prpd === "number" ? prpd : Number(prpd);
    if (!rr || !pp) return 0;
    return rr * pp * dim;
  }, [residents, prpd, dim]);

  /** Current spend % of budget = totalDifference / monthlyBudget * 100 */
  const percentOfBudget = useMemo(() => {
    if (!monthlyBudget) return 0;
    return (totalDifference / monthlyBudget) * 100;
  }, [monthlyBudget, totalDifference]);

  /** Helpers to bind numeric inputs while allowing empty state */
  function parseNumberOrEmpty(s: string): number | "" {
    if (s.trim() === "") return "";
    const n = Number(s);
    return Number.isFinite(n) ? n : "";
  }

  /** Chart data: Supplier vs Difference (uses current totals order) */
  const chartData = useMemo(
    () =>
      totals.map((r) => ({
        supplier: r.Supplier,
        diff: r.Difference ?? 0,
      })),
    [totals]
  );

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
        // className="mx-auto max-w-5xl space-y-8"
        className={[
          "mx-auto max-w-5xl space-y-8",
          LAYOUT.CONTENT_MAX_W, // max width scales at lg
          LAYOUT.SECTION_GAP,
        ].join(" ")}
      >
        {/* Uploader Card */}
        <Card className="border">
          <CardHeader>
            <CardTitle>Invoice Analyzer</CardTitle>
            <CardDescription>
              Upload Pelican Pi ZIP of .xlsx invoices.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* File chooser + Analyze button */}
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
              <div className="space-y-2">
                <Label htmlFor="zip" className="cursor-pointer">
                  Choose file
                </Label>
                <Input
                  id="zip"
                  type="file"
                  accept=".zip"
                  ref={fileInputRef} // <-- add this
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

            {/* Error message (if any) */}
            {err && <p className="text-sm text-red-600">{err}</p>}

            {/* Summary tiles (only after analysis) */}
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
                      <CardDescription>Skipped files</CardDescription>
                      <CardTitle className="text-2xl">
                        {summary?.skipped?.length ?? 0}
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

            {/* Download is only shown AFTER we have a CSV from analysis */}
            {csv && (
              <Button onClick={onDownloadCsv} className="cursor-pointer">
                ⬇️ Download henbrook_invoice_analysis.csv
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Totals Table (only after analysis) */}
        {!!totals.length && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Top suppliers by amount invoiced
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      {/* Center these headers per request */}
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
                        {/* Center these cells per request */}
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

                    {/* Final total row for Difference */}
                    <TableRow className="bg-muted/40 font-semibold">
                      <TableCell className="whitespace-nowrap">TOTAL</TableCell>
                      <TableCell className="text-center" />
                      <TableCell className="text-center" />
                      <TableCell className="text-center" />
                      <TableCell className="text-center tabular-nums">
                        {fmtGBP(totalDifference)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* --- NEW: Chart Card (Supplier vs Difference) --- */}
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
                        <XAxis dataKey="supplier" tick={{ fontSize: 12 }} />
                        <YAxis
                          tickFormatter={(v) => gbp.format(v)}
                          width={80}
                        />
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
                                  : Number(label);
                              return fmtGBP(Number.isFinite(n) ? n : 0);
                            }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Budget analysis (front end only) */}
              <Card className="border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Budget analysis</CardTitle>
                  <CardDescription>
                    PRPD = Per-Resident-Per-Day. We assume {dim} days in the
                    current month.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Inputs: Residents & PRPD */}
                  <div className="grid gap-3 sm:grid-cols-2">
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
                  </div>

                  {/* Results table */}
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Metric</TableHead>
                          <TableHead className="text-right">Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>
                            Monthly budget (Residents × PRPD × {dim} days)
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {fmtGBP(monthlyBudget)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>
                            Current spend (total of Difference)
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {fmtGBP(totalDifference)}
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
      </motion.main>
    </AnimatePresence>
  );
}
