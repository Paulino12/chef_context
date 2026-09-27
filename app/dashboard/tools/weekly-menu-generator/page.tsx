"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function WeeklyMenuGenerator() {
  const frame = useRef<HTMLIFrameElement>(null);
  const observer = useRef<ResizeObserver | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setReady(false);
    setError("");
    fetch("/api/weekly-menu/health", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.detail);
        if (!controller.signal.aborted) setReady(true);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e.message || "Unable to connect to the weekly generator.");
      });
    return () => {
      controller.abort();
      observer.current?.disconnect();
    };
  }, [attempt]);

  function resizeEditor() {
    // Both the editor and its API use our own origin. Reuse the Python app's
    // tested HTML instead of maintaining a second React implementation.
    const element = frame.current;
    const content = element?.contentDocument?.querySelector("main");
    const window = element?.contentWindow;
    if (!element || !content || !window) return;
    observer.current?.disconnect();
    // Measure the content itself, not body.scrollHeight (which can depend on
    // iframe height and prevent shrinking when fields collapse).
    const fitContent = () => {
      const bottom = content.getBoundingClientRect().bottom + window.scrollY;
      const margin =
        parseFloat(window.getComputedStyle(content).marginBottom) || 0;
      element.style.height = `${Math.max(500, Math.ceil(bottom + margin + 16))}px`;
    };
    observer.current = new ResizeObserver(fitContent);
    observer.current.observe(content);
    fitContent();
  }
  return (
    <main className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Weekly Menu Generator</h1>
        <p className="text-muted-foreground">
          Paste your weekly menu, review the dishes and allergens, then download
          your Word document.
        </p>
      </header>
      {!ready && (
        <section className="rounded-xl border p-6" role="status">
          <p>{error || "Connecting to the weekly generator…"}</p>
          {error && (
            <button
              className="mt-4 rounded-lg border px-4 py-2"
              onClick={() => setAttempt(attempt + 1)}
            >
              Try again
            </button>
          )}
        </section>
      )}
      {ready && (
        <iframe
          ref={frame}
          src="/api/weekly-menu/editor?embedded=1"
          title="Weekly menu editor"
          onLoad={resizeEditor}
          scrolling="no"
          className="w-full rounded-xl border bg-background"
          style={{ height: 900 }}
        />
      )}
    </main>
  );
}
