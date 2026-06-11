"use client";

/**
 * BudgetAnalyzerUploads.tsx
 *
 * Goal:
 * - Upload Outstanding Orders PDF -> POST /api/budget-analyzer (kind=outstanding-orders)
 * - Upload Invoices/Credit Notes PDF -> POST /api/budget-analyzer (kind=invoices)
 * - Show both side-by-side and compute simple comparisons on the same page.
 *
 * Notes about backend JSON:
 * Outstanding Orders may come back as:
 *  1) dict map: { "Bidfood": 2471.16, "Direct Seafoods": 254.25 }
 *  2) array:    [ { supplier: "Bidfood", value: "2471.16" }, ... ]
 *  3) array UI: [ { Supplier: "Bidfood", Total: 2471.16 }, ... ]
 *
 * Invoices should come back as:
 *  supplier_totals: [ { supplier, total, credits, difference }, ... ]
 *  grand_total, grand_credits, grand_difference
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
import ProgressInfo from "@/app/components/ProgressInfo";
import { LAYOUT } from "@/app/lib/ui";
import { useAdaptiveProgress } from "@/hooks/useAdaptiveProgress";

/* ----------------------------- Types & Helpers ----------------------------- */

type TotalsRow = {
  Supplier: string;
  Total: number;
};

// Possible shapes returned by the backend for supplier totals (Outstanding Orders)
type SupplierValueRow = { supplier: string; value: number | string };
type ApiTotalsDict = Record<string, number | string>;
type ApiTotalsArrayUi = Array<{ Supplier: string; Total: number | string }>;
type ApiTotalsArraySupplierValue = SupplierValueRow[];
type ApiTotals = ApiTotalsDict | ApiTotalsArrayUi | ApiTotalsArraySupplierValue;

type OutstandingOrdersResponse = {
  centre?: string;
  report_total?: number | string;

  // backend might return either of these keys
  supplier_totals?: ApiTotals;
  totals?: ApiTotals;

  error?: string;
};

type InvoiceRow = {
  Supplier: string;
  Total: number;
  Credits: number;
  Difference: number;
};

type InvoicesResponse = {
  supplier_totals?: Array<{
    supplier: string;
    total: number | string;
    credits: number | string;
    difference: number | string;
  }>;
  grand_total?: number | string;
  grand_credits?: number | string;
  grand_difference?: number | string;
  error?: string;
};

type AnalyzeKind = "outstanding-orders" | "invoices";

type BackendProgress = {
  percent?: number;
  message?: string;
  remainingMs?: number | null;
};

// Currency formatter (same as invoice analyzer)
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

/**
 * Convert backend money values into numbers safely.
 * Supports: 1234.56, "1234.56", "1,234.56", "£1,234.56"
 */
function toMoneyNumber(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const cleaned = v.replace(/£/g, "").replace(/,/g, "").trim();
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/**
 * Normalise supplier labels for UI consistency.
 * Example:
 *  - "Bidfood (food)"  -> "Bidfood (FOOD)"
 *  - "Bidfood (bistro)"-> "Bidfood (BISTRO)"
 */
function normalizeSupplierUiName(name: string): string {
  const s = name.trim();
  if (/^bidfood\s*\(food\)$/i.test(s)) return "Bidfood (FOOD)";
  if (/^bidfood\s*\(bistro\)$/i.test(s)) return "Bidfood (BISTRO)";
  return s;
}

/**
 * Outstanding Orders business rule:
 * If the supplier is Bidfood and the report Centre indicates Food/Bistro,
 * relabel supplier to "Bidfood (FOOD)" or "Bidfood (BISTRO)" for clarity.
 */
function relabelBidfoodFromCentre(
  supplierName: string,
  centre?: string
): string {
  const name = supplierName.trim();
  if (name.toLowerCase() !== "bidfood") return name;

  const c = (centre ?? "").toLowerCase();
  if (c.includes("bistro")) return "Bidfood (BISTRO)";
  if (c.includes("food")) return "Bidfood (FOOD)";
  return "Bidfood";
}

/**
 * Normalise backend totals into UI rows { Supplier, Total }[] for Outstanding Orders.
 * Supports:
 *  - dict map: { "Bidfood": 2471.16 }
 *  - array supplier/value: [ { supplier: "Bidfood", value: "2471.16" } ]
 *  - array UI: [ { Supplier: "Bidfood", Total: 2471.16 } ]
 */
function normalizeOutstandingTotals(
  raw: ApiTotals | undefined,
  centre?: string
): TotalsRow[] {
  const rows: TotalsRow[] = [];
  if (!raw) return rows;

  const pushRow = (supplier: string, totalRaw: unknown) => {
    const labelled = relabelBidfoodFromCentre(supplier, centre);
    const Supplier = normalizeSupplierUiName(labelled);
    const Total = toMoneyNumber(totalRaw);

    if (!Supplier || !Number.isFinite(Total)) return;
    rows.push({ Supplier, Total });
  };

  // Case 1: dict { "Bidfood": 123.45 }
  if (!Array.isArray(raw)) {
    for (const [supplier, total] of Object.entries(raw))
      pushRow(supplier, total);
    return rows;
  }

  // Case 2: array rows
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;

    // backend shape: { supplier, value }
    if ("supplier" in item && "value" in item) {
      pushRow(String(item.supplier ?? ""), item.value);
      continue;
    }

    // UI shape: { Supplier, Total }
    if ("Supplier" in item && "Total" in item) {
      pushRow(String(item.Supplier ?? ""), item.Total);
      continue;
    }
  }

  return rows;
}

/**
 * Supplier ordering (optional). Unknown suppliers will appear after known ones.
 * Keep Bidfood split so it’s obvious which centre the report came from.
 */
const CUSTOM_ORDER = [
  "Direct Seafoods",
  "Town and Country",
  "Vegetarian express",
  "British premium meat",
  "NCB Meat",
  "NCB Veg",
  "Total Produce (Dole)",
  "Dole produce",
  "Bidfood (FOOD)",
  "Bidfood (BISTRO)",
  "Bidfood",
] as const;

function sortRowsBySupplierOrder<T extends { Supplier: string }>(
  rows: T[]
): T[] {
  const rank = new Map<string, number>(CUSTOM_ORDER.map((n, i) => [n, i]));
  return [...rows].sort((a, b) => {
    const ai = rank.get(a.Supplier) ?? 9999;
    const bi = rank.get(b.Supplier) ?? 9999;
    if (ai !== bi) return ai - bi;
    return a.Supplier.localeCompare(b.Supplier);
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizePercent(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const asPercent = value > 0 && value <= 1 ? value * 100 : value;
  return Math.min(100, Math.max(0, asPercent));
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readBackendProgress(value: unknown): BackendProgress | null {
  if (!isRecord(value)) return null;

  const percent = normalizePercent(value.progress ?? value.percent);
  const message =
    stringValue(value.message) ??
    stringValue(value.detail) ??
    stringValue(value.stage) ??
    stringValue(value.status);

  const seconds =
    typeof value.estimatedRemainingSeconds === "number"
      ? value.estimatedRemainingSeconds
      : typeof value.remaining_seconds === "number"
      ? value.remaining_seconds
      : typeof value.eta_seconds === "number"
      ? value.eta_seconds
      : undefined;

  if (percent === undefined && !message && seconds === undefined) return null;

  return {
    percent,
    message,
    remainingMs: seconds === undefined ? undefined : Math.max(0, seconds * 1000),
  };
}

function getJobId(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const id = value.job_id ?? value.jobId ?? value.id;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

function getStatus(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const status = value.status ?? value.state;
  return typeof status === "string" ? status.trim().toLowerCase() : null;
}

function isCompleteStatus(status: string | null) {
  return (
    status === "complete" ||
    status === "completed" ||
    status === "done" ||
    status === "success" ||
    status === "succeeded"
  );
}

function isFailedStatus(status: string | null) {
  return status === "failed" || status === "error" || status === "cancelled";
}

function getErrorMessage(value: unknown, fallback: string) {
  if (!isRecord(value)) return fallback;
  return (
    stringValue(value.error) ??
    stringValue(value.detail) ??
    stringValue(value.message) ??
    fallback
  );
}

function getJobResult<T>(value: unknown): T | null {
  if (!isRecord(value)) return null;
  const result = value.result ?? value.data ?? value.output;
  if (isRecord(result)) return result as T;

  if ("supplier_totals" in value || "totals" in value || "report_total" in value) {
    return value as T;
  }

  return null;
}

/* -------------------------------- Component -------------------------------- */

export default function BudgetAnalyzerUploads() {
  /* -------------------------- Outstanding Orders state -------------------------- */
  const [ooFile, setOoFile] = useState<File | null>(null);
  const ooFileRef = useRef<HTMLInputElement>(null);
  const [ooFileKey, setOoFileKey] = useState(0);

  const [ooBusy, setOoBusy] = useState(false);
  const [ooErr, setOoErr] = useState<string | null>(null);
  const [ooBackendProgress, setOoBackendProgress] =
    useState<BackendProgress | null>(null);
  const {
    remainingMs: ooRemainingMs,
    percent: ooPercent,
    busy: ooProgressBusy,
    runWithETA: runOutstandingWithETA,
  } = useAdaptiveProgress("budget-analyzer:outstanding-orders", 45_000);

  const [ooCentre, setOoCentre] = useState<string | null>(null);
  const [ooTotals, setOoTotals] = useState<TotalsRow[]>([]);
  const [ooReportTotal, setOoReportTotal] = useState<number | null>(null);

  /* ------------------------------ Invoices state ------------------------------ */
  const [invFile, setInvFile] = useState<File | null>(null);
  const invFileRef = useRef<HTMLInputElement>(null);
  const [invFileKey, setInvFileKey] = useState(0);

  const [invBusy, setInvBusy] = useState(false);
  const [invErr, setInvErr] = useState<string | null>(null);
  const [invBackendProgress, setInvBackendProgress] =
    useState<BackendProgress | null>(null);
  const {
    remainingMs: invRemainingMs,
    percent: invPercent,
    busy: invProgressBusy,
    runWithETA: runInvoicesWithETA,
  } = useAdaptiveProgress("budget-analyzer:invoices", 60_000);

  const [invTotals, setInvTotals] = useState<InvoiceRow[]>([]);
  const [invGrandTotal, setInvGrandTotal] = useState<number | null>(null);
  const [invGrandCredits, setInvGrandCredits] = useState<number | null>(null);
  const [invGrandDifference, setInvGrandDifference] = useState<number | null>(
    null
  );

  // --------------------------- Budget analysis inputs ---------------------------

  // Pleo spend you type in manually (cards, adhoc buys etc.)
  const [pleoSpend, setPleoSpend] = useState<string>("");

  // PRPD default (you can keep 11.28 as per your screenshot)
  const [prpd, setPrpd] = useState<string>("11.28");

  // These two drive the monthly budget calculation
  const [residents, setResidents] = useState<string>("");
  const [numDays, setNumDays] = useState<string>("");

  /* -------------------------------- Actions -------------------------------- */

  /**
   * Small helper to POST a file to our Next.js proxy route.
   * Keeps code DRY so both uploads use the exact same transport logic.
   */
  async function pollBudgetAnalyzerJob<T>(
    kind: AnalyzeKind,
    jobId: string,
    onProgress: (progress: BackendProgress | null) => void,
    initialProgress?: unknown
  ): Promise<T> {
    onProgress(readBackendProgress(initialProgress));

    const timeoutAt = Date.now() + 15 * 60_000;
    while (Date.now() < timeoutAt) {
      await sleep(1_500);

      const res = await fetch(
        `/api/budget-analyzer/jobs/${encodeURIComponent(
          jobId
        )}?kind=${encodeURIComponent(kind)}`,
        { cache: "no-store" }
      );
      const json = (await res.json().catch(() => ({}))) as unknown;

      if (!res.ok) {
        throw new Error(getErrorMessage(json, `Job status error (${res.status})`));
      }

      onProgress(readBackendProgress(json));

      const status = getStatus(json);
      if (isFailedStatus(status)) {
        throw new Error(getErrorMessage(json, "Analysis failed"));
      }

      if (isCompleteStatus(status)) {
        const result = getJobResult<T>(json);
        if (result) return result;
        throw new Error("Analysis completed without a result payload.");
      }
    }

    throw new Error("Analysis is taking longer than expected. Please try again.");
  }

  async function postToBudgetAnalyzer<T>(
    kind: AnalyzeKind,
    file: File,
    onProgress: (progress: BackendProgress | null) => void
  ): Promise<T> {
    const fd = new FormData();
    fd.append("kind", kind);
    fd.append("async", "true");
    fd.append("file", file, file.name);

    const res = await fetch("/api/budget-analyzer", {
      method: "POST",
      body: fd,
    });

    const json = (await res.json().catch(() => ({}))) as unknown;
    if (!res.ok) throw new Error(getErrorMessage(json, `Server error (${res.status})`));

    const jobId = getJobId(json);
    if (jobId) return pollBudgetAnalyzerJob<T>(kind, jobId, onProgress, json);

    onProgress(null);
    return json as T;
  }

  async function analyzeOutstandingOrders() {
    if (!ooFile) return;

    setOoBusy(true);
    setOoErr(null);
    setOoBackendProgress(null);

    // reset results
    setOoCentre(null);
    setOoTotals([]);
    setOoReportTotal(null);

    try {
      const json = await runOutstandingWithETA(() =>
        postToBudgetAnalyzer<OutstandingOrdersResponse>(
          "outstanding-orders",
          ooFile,
          setOoBackendProgress
        )
      );

      console.log("Outstanding Orders analysis result:", json);

      const centre = json.centre ?? "";
      // Accept either key: supplier_totals OR totals
      const rawTotals = (json.supplier_totals ?? json.totals) as
        | ApiTotals
        | undefined;

      const rows = sortRowsBySupplierOrder(
        normalizeOutstandingTotals(rawTotals, centre)
      );

      setOoCentre(centre || null);
      setOoTotals(rows);

      // report_total may arrive as number or string, so normalise it
      const reportTotal =
        json.report_total != null ? toMoneyNumber(json.report_total) : null;
      setOoReportTotal(reportTotal);
    } catch (e: unknown) {
      const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      setOoErr(msg);
    } finally {
      setOoBusy(false);
      setOoBackendProgress(null);
    }
  }

  async function analyzeInvoices() {
    if (!invFile) return;

    setInvBusy(true);
    setInvErr(null);
    setInvBackendProgress(null);

    // reset results
    setInvTotals([]);
    setInvGrandTotal(null);
    setInvGrandCredits(null);
    setInvGrandDifference(null);

    try {
      const json = await runInvoicesWithETA(() =>
        postToBudgetAnalyzer<InvoicesResponse>(
          "invoices",
          invFile,
          setInvBackendProgress
        )
      );

      console.log("Invoices analysis result:", json);

      const rows: InvoiceRow[] = (json.supplier_totals ?? []).map((r) => {
        const Supplier = normalizeSupplierUiName(String(r.supplier ?? ""));
        const Total = toMoneyNumber(r.total);
        const Credits = toMoneyNumber(r.credits);
        const Difference = toMoneyNumber(r.difference);

        return { Supplier, Total, Credits, Difference };
      });

      // Keep ordering consistent with Outstanding Orders where possible
      const sorted = sortRowsBySupplierOrder(rows);

      setInvTotals(sorted);
      setInvGrandTotal(
        json.grand_total != null ? toMoneyNumber(json.grand_total) : null
      );
      setInvGrandCredits(
        json.grand_credits != null ? toMoneyNumber(json.grand_credits) : null
      );

      const backendDiff =
        json.grand_difference != null
          ? toMoneyNumber(json.grand_difference)
          : null;

      // If backend didn't provide grand_difference, compute from rows
      setInvGrandDifference(
        backendDiff != null
          ? backendDiff
          : sorted.reduce((acc, r) => acc + (r.Difference ?? 0), 0)
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      setInvErr(msg);
    } finally {
      setInvBusy(false);
      setInvBackendProgress(null);
    }
  }

  function resetOutstandingOrders() {
    setOoFile(null);
    setOoErr(null);
    setOoCentre(null);
    setOoTotals([]);
    setOoReportTotal(null);

    if (ooFileRef.current) ooFileRef.current.value = "";
    setOoFileKey((k) => k + 1); // lets user re-select the same file
  }

  function resetInvoices() {
    setInvFile(null);
    setInvErr(null);
    setInvTotals([]);
    setInvGrandTotal(null);
    setInvGrandCredits(null);
    setInvGrandDifference(null);

    if (invFileRef.current) invFileRef.current.value = "";
    setInvFileKey((k) => k + 1);
  }

  /* ------------------------------ Derived values ------------------------------ */

  const ooSuppliersCount = useMemo(() => ooTotals.length, [ooTotals]);

  const ooTotalFromRows = useMemo(
    () => ooTotals.reduce((acc, r) => acc + (r.Total ?? 0), 0),
    [ooTotals]
  );

  // Prefer the report total (if provided), otherwise fall back to sum of rows
  const ooDisplayedTotal = useMemo(() => {
    if (ooReportTotal != null && Number.isFinite(ooReportTotal))
      return ooReportTotal;
    return ooTotalFromRows;
  }, [ooReportTotal, ooTotalFromRows]);

  const invSuppliersCount = useMemo(() => invTotals.length, [invTotals]);

  // If backend didn't provide grand totals, compute from table
  const invTotalFromRows = useMemo(
    () => invTotals.reduce((acc, r) => acc + (r.Total ?? 0), 0),
    [invTotals]
  );
  const invCreditsFromRows = useMemo(
    () => invTotals.reduce((acc, r) => acc + (r.Credits ?? 0), 0),
    [invTotals]
  );
  const invDifferenceFromRows = useMemo(
    () => invTotals.reduce((acc, r) => acc + (r.Difference ?? 0), 0),
    [invTotals]
  );

  const invDisplayedTotal = invGrandTotal ?? invTotalFromRows;
  const invDisplayedCredits = invGrandCredits ?? invCreditsFromRows;
  const invDisplayedDifference = invGrandDifference ?? invDifferenceFromRows;

  // Simple comparison: outstanding (ordered) vs invoices (net payable)
  const variance = useMemo(() => {
    // "ordered" here is outstanding report total (real-time view of committed spend)
    // "invoiced (net)" is invoices total minus credits
    return ooDisplayedTotal - invDisplayedDifference;
  }, [ooDisplayedTotal, invDisplayedDifference]);

  // --------------------------- Budget analysis derived ---------------------------

  function toNum(s: string): number {
    // allow blanks; strip commas and £ if pasted
    const cleaned = (s ?? "").replace(/£/g, "").replace(/,/g, "").trim();
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  const pleoSpendNum = useMemo(() => toNum(pleoSpend), [pleoSpend]);
  const prpdNum = useMemo(() => toNum(prpd), [prpd]);
  const residentsNum = useMemo(() => toNum(residents), [residents]);
  const numDaysNum = useMemo(() => toNum(numDays), [numDays]);

  // Monthly budget = Residents × PRPD × Number of days
  const monthlyBudget = useMemo(
    () => residentsNum * prpdNum * numDaysNum,
    [residentsNum, prpdNum, numDaysNum]
  );

  // Current spend = Net payable invoices + Pleo
  const currentSpend = useMemo(
    () => (invDisplayedDifference ?? 0) + pleoSpendNum,
    [invDisplayedDifference, pleoSpendNum]
  );

  // % of budget = currentSpend / monthlyBudget
  const pctOfBudget = useMemo(() => {
    if (!monthlyBudget) return 0;
    return (currentSpend / monthlyBudget) * 100;
  }, [currentSpend, monthlyBudget]);

  // Export invoices to Excel
  async function downloadInvoicesExcel() {
    if (!invFile) return;

    setInvErr(null);
    setInvBusy(true);

    try {
      const fd = new FormData();
      fd.append("file", invFile, invFile.name);

      const res = await fetch("/api/budget-analyzer/export-invoices-xlsx", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || `Export failed (${res.status})`);
      }

      const blob = await res.blob();

      // filename (if provided)
      const cd = res.headers.get("content-disposition") || "";
      const match = cd.match(/filename="?(.*?)"?$/i);
      const filename = match?.[1] || "invoices_export.xlsx";

      // download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setInvErr(msg);
    } finally {
      setInvBusy(false);
    }
  }

  return (
    <main
      id="budget-analyzer-print"
      className={[
        "mx-auto max-w-5xl space-y-8",
        LAYOUT.CONTENT_MAX_W,
        LAYOUT.SECTION_GAP,
      ].join(" ")}
    >
      {ooTotals.length > 0 && invTotals.length > 0 && (
        <Button
          id="hidePrintButton"
          variant="secondary"
          onClick={() => window.print()}
          className="cursor-pointer"
        >
          Print summary
        </Button>
      )}

      <Card className="border">
        <CardHeader>
          <CardTitle>Budget Analyzer</CardTitle>
          <CardDescription id="hideTitleDescription">
            Upload Outstanding Orders and Invoices/Credit Notes for comparisons.
          </CardDescription>
        </CardHeader>

        {/* Keep your side-by-side layout (stack on small screens) */}
        <CardContent className="space-y-6 flex flex-col md:flex-row gap-6 w-full">
          {/* Outstanding Orders */}
          <div className="space-y-3 w-full md:w-1/2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">Outstanding Orders</p>
                <p
                  id="hideOrdersDescription"
                  className="text-sm text-muted-foreground"
                >
                  Upload the Outstanding Orders PDF.
                </p>
              </div>
            </div>

            <div
              id="hideUploadorders"
              className="flex flex-col w-full gap-3 items-end"
            >
              <div className="space-y-2 w-full">
                <Label htmlFor="outstanding-orders" className="cursor-pointer">
                  Choose file
                </Label>
                <Input
                  key={ooFileKey}
                  id="outstanding-orders"
                  type="file"
                  accept=".pdf"
                  ref={ooFileRef}
                  onChange={(e) => setOoFile(e.target.files?.[0] ?? null)}
                  className="cursor-pointer font-bold"
                />
              </div>
              <div className="flex w-full">
                <Button
                  size="lg"
                  className="m-0 cursor-pointer"
                  disabled={!ooFile || ooBusy}
                  onClick={analyzeOutstandingOrders}
                >
                  {ooBusy ? "Analyzing…" : "Analyze PDF"}
                </Button>
              </div>
              {ooProgressBusy && (
                <ProgressInfo
                  label="Analyzing outstanding orders"
                  percent={ooBackendProgress?.percent ?? ooPercent}
                  remainingMs={
                    ooBackendProgress
                      ? ooBackendProgress.remainingMs ?? null
                      : ooRemainingMs
                  }
                  message={ooBackendProgress?.message}
                />
              )}
            </div>

            {ooErr && <p className="text-sm text-red-600">{ooErr}</p>}

            {/* Summary tiles */}
            {(ooCentre || ooTotals.length > 0 || ooReportTotal != null) && (
              <>
                <Separator className="my-2" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Card>
                    <CardHeader className="p-3">
                      <CardDescription>Suppliers</CardDescription>
                      <CardTitle className="text-2xl">
                        {ooSuppliersCount}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="p-3">
                      <CardDescription>Report total</CardDescription>
                      <CardTitle className="text-2xl">
                        {fmtGBP(ooDisplayedTotal)}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>
              </>
            )}

            {/* Totals table */}
            {!!ooTotals.length && (
              <div className="rounded-md border mt-4">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ooTotals.map((r, idx) => (
                      <TableRow key={idx} className="hover:bg-muted/40">
                        <TableCell className="whitespace-nowrap">
                          {r.Supplier}
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          {fmtGBP(r.Total)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/40 font-semibold">
                      <TableCell className="whitespace-nowrap">TOTAL</TableCell>
                      <TableCell className="text-center tabular-nums">
                        {fmtGBP(ooDisplayedTotal)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}

            <CardFooter className="p-0">
              <Button
                id="hideResetOrders"
                variant="secondary"
                className="cursor-pointer"
                onClick={resetOutstandingOrders}
              >
                Reset outstanding orders
              </Button>
            </CardFooter>
          </div>

          {/* Invoices / Credit Notes */}
          <div className="space-y-3 w-full md:w-1/2 opacity-90">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">Invoices / Credit Notes</p>
                <p
                  id="hideInvoicesDescription"
                  className="text-sm text-muted-foreground"
                >
                  Upload the invoices/credits PDF.
                </p>
              </div>
            </div>

            <div
              id="hideUploadInvoices"
              className="flex flex-col w-full gap-3 items-end"
            >
              <div className="space-y-2 w-full">
                <Label htmlFor="invoices" className="cursor-pointer">
                  Choose file
                </Label>
                <Input
                  key={invFileKey}
                  id="invoices"
                  type="file"
                  accept=".pdf"
                  ref={invFileRef}
                  onChange={(e) => setInvFile(e.target.files?.[0] ?? null)}
                  className="cursor-pointer font-bold"
                />
              </div>

              <div className="flex gap-2 w-full justify-between">
                <Button
                  size="lg"
                  className="cursor-pointer"
                  disabled={!invFile || invBusy}
                  onClick={analyzeInvoices}
                >
                  {invBusy ? "Analyzing…" : "Analyze"}
                </Button>

                <Button
                  size="lg"
                  variant="secondary"
                  className="cursor-pointer"
                  disabled={!invFile || invBusy}
                  onClick={downloadInvoicesExcel}
                >
                  Download Excel
                </Button>
              </div>
              {invProgressBusy && (
                <ProgressInfo
                  label="Analyzing invoices and credits"
                  percent={invBackendProgress?.percent ?? invPercent}
                  remainingMs={
                    invBackendProgress
                      ? invBackendProgress.remainingMs ?? null
                      : invRemainingMs
                  }
                  message={invBackendProgress?.message}
                />
              )}

              {/* <Button
                size="lg"
                className="sm:ml-3 cursor-pointer"
                disabled={!invFile || invBusy}
                onClick={analyzeInvoices}
              >
                {invBusy ? "Analyzing…" : "Analyze"}
              </Button> */}
            </div>

            {invErr && <p className="text-sm text-red-600">{invErr}</p>}

            {/* Summary tiles */}
            {(invTotals.length > 0 ||
              invGrandTotal != null ||
              invGrandDifference != null) && (
              <>
                <Separator className="my-2" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Card>
                    <CardHeader className="p-3">
                      <CardDescription>Suppliers</CardDescription>
                      <CardTitle className="text-2xl">
                        {invSuppliersCount}
                      </CardTitle>
                    </CardHeader>
                  </Card>

                  <Card>
                    <CardHeader className="p-3">
                      <CardDescription>Net payable</CardDescription>
                      <CardTitle className="text-2xl">
                        {fmtGBP(invDisplayedDifference)}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                {/* <div className="grid gap-3 sm:grid-cols-2">
                  <Card>
                    <CardHeader className="p-3">
                      <CardDescription>Total</CardDescription>
                      <CardTitle className="text-xl">
                        {fmtGBP(invDisplayedTotal)}
                      </CardTitle>
                    </CardHeader>
                  </Card>

                  <Card>
                    <CardHeader className="p-3">
                      <CardDescription>Credits</CardDescription>
                      <CardTitle className="text-xl">
                        {fmtGBP(invDisplayedCredits)}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div> */}
              </>
            )}

            {/* Invoices table */}
            {!!invTotals.length && (
              <div className="rounded-md border mt-4">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">Credits</TableHead>
                      <TableHead className="text-center">Difference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invTotals.map((r, idx) => (
                      <TableRow key={idx} className="hover:bg-muted/40">
                        <TableCell className="whitespace-nowrap">
                          {r.Supplier}
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
                      <TableCell className="text-center tabular-nums">
                        {fmtGBP(invDisplayedTotal)}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {fmtGBP(invDisplayedCredits)}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {fmtGBP(invDisplayedDifference)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}

            <CardFooter className="p-0">
              <Button
                id="hideResetInvoices"
                variant="secondary"
                className="cursor-pointer"
                onClick={resetInvoices}
              >
                Reset invoices
              </Button>
            </CardFooter>
          </div>
        </CardContent>
      </Card>

      {/* Comparison */}
      <Card className="border">
        <CardHeader>
          <CardTitle className="text-base">Comparison</CardTitle>
          <CardDescription>
            Ordered (Outstanding) vs Invoiced (Net payable).
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {ooTotals.length > 0 && invTotals.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <Card>
                <CardHeader className="p-3">
                  <CardDescription>Ordered (Outstanding)</CardDescription>
                  <CardTitle className="text-2xl">
                    {fmtGBP(ooDisplayedTotal)}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="p-3">
                  <CardDescription>Invoiced (Net)</CardDescription>
                  <CardTitle className="text-2xl">
                    {fmtGBP(invDisplayedDifference)}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="p-3">
                  <CardDescription>Variance</CardDescription>
                  <CardTitle className="text-2xl">{fmtGBP(variance)}</CardTitle>
                </CardHeader>
              </Card>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Upload both documents to unlock comparison.
            </p>
          )}
        </CardContent>
      </Card>
      <Card className="border">
        <CardHeader>
          <CardTitle className="text-base">Budget analysis</CardTitle>
          <CardDescription>PRPD = Per-Resident-Per-Day.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Inputs row */}
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="pleo">Pleo card (£)</Label>
              <Input
                id="pleo"
                inputMode="decimal"
                placeholder="Enter Pleo spend"
                value={pleoSpend}
                onChange={(e) => setPleoSpend(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prpd">PRPD (£)</Label>
              <Input
                id="prpd"
                inputMode="decimal"
                value={prpd}
                onChange={(e) => setPrpd(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="residents">Residents</Label>
              <Input
                id="residents"
                inputMode="numeric"
                placeholder="Enter number of residents"
                value={residents}
                onChange={(e) => setResidents(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="days">Number of days</Label>
              <Input
                id="days"
                inputMode="numeric"
                placeholder="Enter number of days"
                value={numDays}
                onChange={(e) => setNumDays(e.target.value)}
              />
            </div>
          </div>

          {/* Metrics table */}
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
                  <TableCell className="whitespace-nowrap">
                    Monthly budget (Residents × PRPD × Number of days)
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtGBP(monthlyBudget)}
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="whitespace-nowrap">
                    Current spend (total of Difference + Pleo)
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtGBP(currentSpend)}
                  </TableCell>
                </TableRow>

                <TableRow className="font-semibold">
                  <TableCell className="whitespace-nowrap">
                    Current % of monthly budget
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {monthlyBudget ? `${pctOfBudget.toFixed(1)}%` : "—"}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
