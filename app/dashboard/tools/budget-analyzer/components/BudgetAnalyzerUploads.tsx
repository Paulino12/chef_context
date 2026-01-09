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
import { LAYOUT } from "@/app/lib/ui";

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
  for (const item of raw as any[]) {
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

/* -------------------------------- Component -------------------------------- */

export default function BudgetAnalyzerUploads() {
  /* -------------------------- Outstanding Orders state -------------------------- */
  const [ooFile, setOoFile] = useState<File | null>(null);
  const ooFileRef = useRef<HTMLInputElement>(null);
  const [ooFileKey, setOoFileKey] = useState(0);

  const [ooBusy, setOoBusy] = useState(false);
  const [ooErr, setOoErr] = useState<string | null>(null);

  const [ooCentre, setOoCentre] = useState<string | null>(null);
  const [ooTotals, setOoTotals] = useState<TotalsRow[]>([]);
  const [ooReportTotal, setOoReportTotal] = useState<number | null>(null);

  /* ------------------------------ Invoices state ------------------------------ */
  const [invFile, setInvFile] = useState<File | null>(null);
  const invFileRef = useRef<HTMLInputElement>(null);
  const [invFileKey, setInvFileKey] = useState(0);

  const [invBusy, setInvBusy] = useState(false);
  const [invErr, setInvErr] = useState<string | null>(null);

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
  async function postToBudgetAnalyzer(
    kind: "outstanding-orders" | "invoices",
    file: File
  ) {
    const fd = new FormData();
    fd.append("kind", kind);
    fd.append("file", file, file.name);

    const res = await fetch("/api/budget-analyzer", {
      method: "POST",
      body: fd,
    });

    const json = (await res.json().catch(() => ({}))) as any;
    if (!res.ok) throw new Error(json?.error || `Server error (${res.status})`);
    return json;
  }

  async function analyzeOutstandingOrders() {
    if (!ooFile) return;

    setOoBusy(true);
    setOoErr(null);

    // reset results
    setOoCentre(null);
    setOoTotals([]);
    setOoReportTotal(null);

    try {
      const json = (await postToBudgetAnalyzer(
        "outstanding-orders",
        ooFile
      )) as OutstandingOrdersResponse;

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
    }
  }

  async function analyzeInvoices() {
    if (!invFile) return;

    setInvBusy(true);
    setInvErr(null);

    // reset results
    setInvTotals([]);
    setInvGrandTotal(null);
    setInvGrandCredits(null);
    setInvGrandDifference(null);

    try {
      const json = (await postToBudgetAnalyzer(
        "invoices",
        invFile
      )) as InvoicesResponse;

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
