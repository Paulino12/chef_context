"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type AwaitingOrdersResult = {
  order_count: number;
  grand_net: string;
  grand_vat: string;
  grand_total: string;
  supplier_totals: { supplier: string; order_count: number; net_value: string; vat: string; total: string }[];
  orders: { order_number: string; supplier: string; centre: string; order_date: string; delivery_required: string; net_value: string; vat: string; total: string }[];
};

const currency = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const money = (value: string) => currency.format(Number(value));
const supplierName = (name: string) => name.replace(/\((food|bistro)\)/gi, (part) => part.toUpperCase());

export default function AwaitingOrdersUpload({ onResult }: { onResult: (result: AwaitingOrdersResult | null) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AwaitingOrdersResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  function clearResult() {
    setResult(null);
    onResult(null);
    setError(null);
  }

  async function analyze() {
    if (!file || busy) return;
    clearResult();
    setBusy(true);
    try {
      const body = new FormData();
      body.append("kind", "awaiting-orders");
      body.append("file", file, file.name);
      const response = await fetch("/api/budget-analyzer", { method: "POST", body });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || data?.detail || `Analysis failed (${response.status}).`);
      if (!data || !Array.isArray(data.supplier_totals) || !Array.isArray(data.orders) ||
          !Number.isInteger(data.order_count) || data.order_count < 1 ||
          ![data.grand_total, data.grand_net, data.grand_vat].every((value) => typeof value === "string" && /^\d+\.\d{2}$/.test(value))) {
        throw new Error("The analysis response was incomplete. Please try again.");
      }
      setResult(data);
      onResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not analyze this PDF.");
    } finally {
      setBusy(false);
    }
  }

  async function downloadExcel() {
    if (!file || busy || exporting) return;
    setError(null);
    setExporting(true);
    try {
      const body = new FormData();
      body.append("file", file, file.name);
      const response = await fetch("/api/budget-analyzer/export-awaiting-orders-xlsx", { method: "POST", body });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || `Export failed (${response.status}).`);
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "awaiting_orders.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download Excel.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="space-y-3 w-full md:w-1/2 min-w-0" aria-label="Awaiting Orders" aria-busy={busy}>
      <div>
        <p className="font-semibold">Awaiting Orders</p>
        <p className="text-sm text-muted-foreground print:hidden">Upload your awaiting-delivery purchase orders PDF.</p>
      </div>
      <div className="space-y-3 print:hidden">
        <Label htmlFor="awaiting-orders">Choose file</Label>
        <Input id="awaiting-orders" ref={input} type="file" accept=".pdf,application/pdf" disabled={busy || exporting}
          onChange={(event) => { clearResult(); setFile(event.target.files?.[0] ?? null); }} />
        <div className="flex flex-wrap gap-2 justify-between">
        <Button size="lg" disabled={!file || busy || exporting} onClick={analyze}>{busy ? "Analyzing..." : "Analyze PDF"}</Button>
        <Button size="lg" variant="secondary" disabled={!file || busy || exporting} onClick={downloadExcel}>{exporting ? "Downloading..." : "Download Excel"}</Button>
        </div>
        {busy && <p role="status" className="text-sm text-muted-foreground">Reading orders and calculating totals...</p>}
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {result && <>
        <div className="grid gap-3 sm:grid-cols-2" aria-live="polite">
          <Card><CardHeader className="p-3"><CardDescription>Orders / Suppliers</CardDescription><CardTitle className="text-2xl">{result.order_count} / {result.supplier_totals.length}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="p-3"><CardDescription>Awaiting total (incl. VAT)</CardDescription><CardTitle className="text-2xl">{money(result.grand_total)}</CardTitle></CardHeader></Card>
        </div>
        <p className="text-sm text-muted-foreground">Net: {money(result.grand_net)} · VAT: {money(result.grand_vat)}</p>
        <div className="rounded-md border">
          <Table><TableHeader><TableRow><TableHead>Supplier</TableHead><TableHead className="text-right">Orders</TableHead><TableHead className="text-right">Total incl. VAT</TableHead></TableRow></TableHeader>
            <TableBody>{result.supplier_totals.map((row) => <TableRow key={row.supplier}><TableCell>{supplierName(row.supplier)}</TableCell><TableCell className="text-right">{row.order_count}</TableCell><TableCell className="text-right tabular-nums">{money(row.total)}</TableCell></TableRow>)}
              <TableRow className="font-semibold bg-muted/40"><TableCell>TOTAL</TableCell><TableCell className="text-right">{result.order_count}</TableCell><TableCell className="text-right tabular-nums">{money(result.grand_total)}</TableCell></TableRow>
            </TableBody></Table>
        </div>
        <p className="text-xs text-muted-foreground">All uploaded orders are counted as awaiting delivery. Upload a fresh bundle to update this total.</p>
      </>}
      <Button variant="secondary" disabled={busy || exporting} className="print:hidden" onClick={() => { clearResult(); setFile(null); if (input.current) input.current.value = ""; }}>Reset awaiting orders</Button>
    </section>
  );
}
