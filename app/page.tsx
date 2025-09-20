"use client";
import { useState } from "react";

export default function Home() {
  const [weekly, setWeekly] = useState<File | null>(null);
  const [date, setDate] = useState<string>("");
  const [allDays, setAllDays] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!weekly) return alert("Upload the weekly DOCX first.");
    setBusy(true);

    const fd = new FormData();
    fd.append("weekly", weekly);
    if (date) fd.append("date", date);
    if (allDays) fd.append("all_days", "true");
    // Optionally append custom templates:
    // fd.append("standard_tpl", file); fd.append("vegan_tpl", file); fd.append("allergens_tpl", file);

    try {
      const res = await fetch("/api/generate", { method: "POST", body: fd });
      if (!res.ok) {
        const msg = await res.text();
        alert(`Generation failed (${res.status}): ${msg}`);
        setBusy(false);
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="?(.*?)"?$/i);
      const filename = match?.[1] ?? "menus.zip";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(`Error: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold mb-4">
        Henbrook Daily Menu Generator
      </h1>

      <label className="block mb-3">
        Weekly menu DOCX
        <input
          type="file"
          accept=".docx"
          onChange={(e) => setWeekly(e.target.files?.[0] ?? null)}
        />
      </label>

      <div className="flex gap-4 items-center mb-4">
        <label>
          Single date:&nbsp;
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={allDays}
            onChange={(e) => setAllDays(e.target.checked)}
          />
          All 7 days
        </label>
      </div>

      <button
        onClick={submit}
        disabled={busy}
        className="px-4 py-2 rounded bg-black text-white"
      >
        {busy ? "Generating…" : "Generate ZIP"}
      </button>
    </main>
  );
}
