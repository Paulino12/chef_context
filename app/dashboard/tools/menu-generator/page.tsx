"use client";
import { useState } from "react";

export default function Home() {
  const [weekly, setWeekly] = useState<File | null>(null);
  const [date, setDate] = useState<string>("");
  const [allDays, setAllDays] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const submit = async () => {
    if (!weekly) return alert("Upload the weekly DOCX first.");
    setDownloading(true);
    const fd = new FormData();
    fd.append("weekly", weekly);
    if (date) fd.append("date", date);
    if (allDays) fd.append("all_days", "true");

    const res = await fetch(`/api/generate`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      setDownloading(false);
      return alert("Generation failed");
    }
    const blob = await res.blob();
    const cd = res.headers.get("content-disposition") ?? "";
    const match = cd.match(/filename\*?=(?:UTF-8''|")?([^";]+)"?/i); // handles RFC5987 too
    const filename = match?.[1] ?? "menus.zip"; // fallback only if header absent

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
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
      <div className="flex gap-4 mb-4">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
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
        disabled={downloading}
        className="px-4 py-2 rounded bg-black text-white"
      >
        {downloading ? "Generating…" : "Generate ZIP"}
      </button>
    </main>
  );
}
