"use client";

import { Fragment, FormEvent, useEffect, useState } from "react";
import { MealLibraryPagination } from "@/components/meal-library-pagination";
import { MealHistorySkeleton, MealLibrarySkeleton } from "@/components/meal-library-skeleton";

type Dish = {
  id: string;
  name: string;
  dietary_label: string;
  weeks_listed: number;
  first_listed: string | null;
  last_listed: string | null;
};
type Row = Record<string, unknown>;
type Results = { items: Row[]; has_more: boolean; page: number };
type Summary = {
  dishes: number;
  meals: string[];
  courses: string[];
  tables: { name: string; rows: number }[];
};
const control =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm w-full";
const button =
  "rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-40";
const labels: Record<string, string> = {
  dishes: "All dish records",
  entries: "All menu entries",
  menus: "Menu versions",
  sources: "Source files",
  source_versions: "Source history",
  planning_rules: "Menu design rules",
  planning_cycles: "Menu cycles",
  review_issues: "Review notes",
  dish_reviews: "Dish reviews",
  source_choices: "Reference choices",
  planned_weeks: "Planned weeks",
  planned_entries: "Planned choices",
  metadata: "Archive information",
};
const date = (value: unknown) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)
    ? value.slice(0, 10).split("-").reverse().join("/")
    : "Not dated";
const text = (value: unknown) =>
  value == null
    ? "—"
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
const titleCase = (value: unknown) =>
  text(value)
    .replaceAll("_", " ")
    .replace(/^./, (c) => c.toUpperCase());
const recordOf = (row: Row): Row =>
  row.record && typeof row.record === "object" && !Array.isArray(row.record)
    ? (row.record as Row)
    : {};
const columns: Record<string, string[]> = {
  planning_rules: ["area", "strength", "rule_text"],
  dishes: ["name", "dietary_label", "created_at"],
  entries: ["service_date", "meal", "course", "food_text"],
  menus: ["week_start", "variant", "status"],
  sources: ["path", "file_type", "active"],
  source_versions: ["source_id", "imported_at", "parser_version"],
  review_issues: ["code", "detail", "resolution"],
  planning_cycles: ["name", "season", "status"],
  metadata: ["key", "value"],
  dish_reviews: ["preferred_name", "procurement", "notes"],
  source_choices: ["week_start", "source_path", "reason"],
  planned_weeks: ["week_start", "revision", "status"],
  planned_entries: ["weekday", "meal", "menu_wording"],
};

async function read(params: Record<string, string>, signal?: AbortSignal) {
  const response = await fetch(
    `/api/meal-library?${new URLSearchParams(params)}`,
    { cache: "no-store", signal },
  );
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error || "Unable to load the library.");
  return body;
}

function useResultCount(params: Record<string, string> | null) {
  // Exclude the current page so navigation reuses the count for these filters.
  const key = params
    ? JSON.stringify({ ...params, page: "0", count_pages: "true" })
    : "";
  const [count, setCount] = useState<{
    key: string;
    data?: { pages: number; items: number };
    error?: string;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    read(JSON.parse(key), controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setCount({ key, data: { pages: data.total_pages, items: data.total_items } });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setCount({ key, error: error.message });
      });
    return () => controller.abort();
  }, [key, attempt]);
  const current = count?.key === key ? count : undefined;
  return {
    count: current?.data,
    loading: Boolean(key) && !current,
    error: current?.error,
    retry: () => {
      setCount(null);
      setAttempt((value) => value + 1);
    },
  };
}

export default function MealLibrary() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [view, setView] = useState("meals");
  const [query, setQuery] = useState("");
  const [meal, setMeal] = useState("");
  const [course, setCourse] = useState("");
  const [diet, setDiet] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [alternatives, setAlternatives] = useState(false);
  const [section, setSection] = useState("planning_rules");
  const [params, setParams] = useState<Record<string, string>>({
    action: "search",
    page: "0",
    page_size: "10",
  });
  const pageSize = Number(params.page_size || "10");
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Dish | null>(null);
  const [history, setHistory] = useState<Results | null>(null);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyError, setHistoryError] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const resultTotals = useResultCount(params);
  const historyTotals = useResultCount(
    detail
      ? {
          action: "appearances",
          dish_id: detail.id,
          alternatives: params.alternatives || "false",
        }
      : null,
  );
  const resultCount = resultTotals.count;
  const historyCount = historyTotals.count;
  // Reveal the rows and their pagination together, regardless of which request
  // finishes first. A failed count settles too, so it cannot leave a spinner.
  const resultsLoading = loading || (!error && resultTotals.loading);
  const historyLoading = !history || (!historyError && historyTotals.loading);
  const tableColumns = (view === "meals"
    ? ["Dish", "Menu label", "Weeks listed", "Last listed", "History"]
    : [...(columns[params.table] || ["id"]), "Details"]
  ).map(titleCase);

  useEffect(() => {
    const controller = new AbortController();
    read({ action: "summary" }, controller.signal)
      .then(setSummary)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    // Abort older searches so a slow response cannot replace newer results.
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setDetail(null);
    setExpanded(null);
    read(params, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResults(data);
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setError(e.message);
          setResults(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [params]);
  useEffect(() => {
    if (!detail) return;
    document
      .getElementById("meal-history")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    const controller = new AbortController();
    setHistory(null);
    setHistoryError("");
    read(
      {
        action: "appearances",
        dish_id: detail.id,
        page: String(historyPage),
        alternatives: params.alternatives || "false",
      },
      controller.signal,
    )
      .then((data) => {
        if (!controller.signal.aborted) setHistory(data);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setHistoryError(e.message);
      });
    return () => controller.abort();
  }, [detail, historyPage, params.alternatives]);

  function search(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setResults(null);
    setParams(
      view === "meals"
        ? {
            action: "search",
            query,
            meal,
            course,
            diet,
            from,
            to,
            alternatives: String(alternatives),
            page: "0",
            page_size: String(pageSize),
          }
        : {
            action: "records",
            table: section,
            query,
            page: "0",
            page_size: String(pageSize),
          },
    );
  }
  function changeView(next: string) {
    // Clear the old response in the SAME render as the view change. Effects
    // run after rendering, so clearing only inside the fetch effect is too late.
    setResults(null);
    setLoading(true);
    setDetail(null);
    setExpanded(null);
    setView(next);
    setQuery("");
    setParams(
      next === "meals"
        ? { action: "search", page: "0", page_size: String(pageSize) }
        : {
            action: "records",
            table: section,
            page: "0",
            page_size: String(pageSize),
          },
    );
    setMeal("");
    setCourse("");
    setDiet("");
    setFrom("");
    setTo("");
    setAlternatives(false);
  }
  return (
    <main className="space-y-6">
      <section className="surface-panel rounded-xl border p-5 sm:p-6 space-y-2">
        <p className="text-sm text-muted-foreground">HENBROOK HOUSE</p>
        <h1 className="text-3xl font-semibold">Meal Library</h1>
        <p>
          Explore previous weekly menus and find inspiration for the next one.
        </p>
        <p className="text-sm text-muted-foreground">
          {summary ? `${summary.dishes.toLocaleString()} dish records · ` : ""}
          Read-only archive. Creating or downloading a weekly menu does not
          update this library.
        </p>
      </section>
      <div className="flex gap-3" aria-label="Library views">
        <button
          className={`${button} ${view === "meals" ? "bg-primary text-primary-foreground" : ""}`}
          aria-pressed={view === "meals"}
          onClick={() => changeView("meals")}
        >
          Find meals
        </button>
        <button
          className={`${button} ${view === "archive" ? "bg-primary text-primary-foreground" : ""}`}
          aria-pressed={view === "archive"}
          onClick={() => changeView("archive")}
        >
          Browse full archive
        </button>
      </div>
      <form
        onSubmit={search}
        className="rounded-xl border bg-background p-5 space-y-4"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1">
            <span>Search {view === "meals" ? "meals" : "records"}</span>
            <input
              className={control}
              value={query}
              maxLength={240}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                view === "meals"
                  ? "Try chicken, crumble or soup"
                  : "Search within this archive section"
              }
            />
          </label>
          {view === "archive" && (
            <label className="space-y-1">
              <span>Archive section</span>
              <select
                className={control}
                value={section}
                onChange={(e) => setSection(e.target.value)}
              >
                {Object.entries(labels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                    {summary
                      ? ` (${summary.tables.find((t) => t.name === key)?.rows ?? 0})`
                      : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          {view === "meals" && (
            <>
              <label className="space-y-1">
                <span>Meal</span>
                <select
                  className={control}
                  value={meal}
                  onChange={(e) => setMeal(e.target.value)}
                >
                  <option value="">Any meal</option>
                  {summary?.meals.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span>Course</span>
                <select
                  className={control}
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                >
                  <option value="">Any course</option>
                  {summary?.courses.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span>Dietary label on menu</span>
                <select
                  className={control}
                  value={diet}
                  onChange={(e) => setDiet(e.target.value)}
                >
                  <option value="">Any label</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="unlabelled">Unlabelled</option>
                </select>
              </label>
              <label className="space-y-1">
                <span>From</span>
                <input
                  className={control}
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </label>
              <label className="space-y-1">
                <span>To</span>
                <input
                  className={control}
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </label>
            </>
          )}
        </div>
        {view === "meals" && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={alternatives}
              onChange={(e) => setAlternatives(e.target.checked)}
            />
            Include alternative menu versions
          </label>
        )}
        <button
          className={`${button} bg-primary text-primary-foreground`}
          disabled={resultsLoading}
        >
          Search
        </button>
        <p className="text-sm text-muted-foreground">
          {view === "meals"
            ? "Search normally uses the selected reference menus. Dietary labels and allergens are recorded as written, not verified recipes."
            : "All original records are retained here, including earlier versions, source details, planning rules and review notes."}
        </p>
      </form>
      <section aria-label="Library results" aria-busy={resultsLoading} className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div role="status" aria-live="polite" className="min-h-6">
          {resultsLoading
            ? <>
                <span className="sr-only">Loading library results and totals…</span>
                <div aria-hidden="true" className="h-5 w-64 max-w-full rounded bg-muted motion-safe:animate-pulse" />
              </>
            : error ||
              (results?.items.length
                ? `${resultCount ? `${resultCount.items.toLocaleString()} matching records · ` : ""}Page ${results.page + 1}${resultCount ? ` of ${resultCount.pages}` : ""}`
                : Number(params.page) > 0
                  ? `No records on page ${Number(params.page) + 1}. Choose an earlier page.`
                  : "0 matching records. Try a broader search.")}
        </div>
        <label className="flex items-center gap-2 text-sm">
          Rows per page
          <select
            className={`${control} !w-auto`}
            value={pageSize}
            onChange={(e) => {
              setResults(null);
              setLoading(true);
              setParams({ ...params, page: "0", page_size: e.target.value });
            }}
          >
            {[10, 25, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>
      {resultsLoading && (
        <MealLibrarySkeleton
          rows={Math.min(pageSize, results?.items.length || pageSize)}
          columns={tableColumns}
        />
      )}
      {!resultsLoading && results && (
        <section className="space-y-3">
          {resultTotals.error && (
            <div role="status" className="flex flex-wrap items-center gap-2 text-sm">
              <span>Total count unavailable.</span>
              <button type="button" className={button} onClick={resultTotals.retry}>
                Retry totals
              </button>
            </div>
          )}
          <div className="overflow-x-auto rounded-xl border bg-background">
            <table className="w-full text-sm text-left">
              <caption className="sr-only">
                {view === "meals"
                  ? "Meal search results"
                  : labels[params.table]}{" "}
                — page {results.page + 1}
              </caption>
              <thead className="sticky top-0 bg-secondary z-10 text-secondary-foreground">
                <tr>
                  {tableColumns.map((label) => (
                    <th
                      key={label}
                      scope="col"
                      className="px-4 py-3 font-semibold whitespace-nowrap"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {results.items.map((row, index) =>
                  view === "meals" ? (
                    <tr
                      key={String(row.id)}
                      className="hover:bg-secondary/40 even:bg-secondary/15"
                    >
                      <th
                        scope="row"
                        className="px-4 py-3 font-medium min-w-64"
                      >
                        {text(row.name)}
                      </th>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-secondary px-2 py-1 text-xs whitespace-nowrap">
                          {titleCase(row.dietary_label)}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {text(row.weeks_listed)}
                      </td>
                      <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                        {date(row.last_listed)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className={button}
                          aria-label={`View history for ${text(row.name)}`}
                          onClick={() => {
                            if (detail?.id !== row.id || historyPage !== 0) {
                              setHistory(null);
                              setHistoryError("");
                            }
                            setDetail(row as Dish);
                            setHistoryPage(0);
                          }}
                        >
                          View history
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <Fragment key={String(row.row_number)}>
                      <tr className="hover:bg-secondary/40 even:bg-secondary/15">
                        {(columns[params.table] || ["id"]).map((key) => (
                          <td
                            key={key}
                            className="px-4 py-3 align-top min-w-28 max-w-xl break-words"
                          >
                            {text(recordOf(row)[key])}
                          </td>
                        ))}
                        <td className="px-4 py-3 align-top">
                          <button
                            className={button}
                            aria-expanded={expanded === index}
                            aria-controls={`archive-detail-${index}`}
                            onClick={() =>
                              setExpanded(expanded === index ? null : index)
                            }
                          >
                            {expanded === index ? "Hide" : "Details"}
                          </button>
                        </td>
                      </tr>
                      {expanded === index && (
                        <tr id={`archive-detail-${index}`}>
                          <td
                            colSpan={
                              (columns[params.table] || ["id"]).length + 1
                            }
                            className="bg-secondary/25 p-5"
                          >
                            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[180px_1fr]">
                              {Object.entries(recordOf(row)).map(
                                ([key, value]) => (
                                  <Fragment key={key}>
                                    <dt className="font-medium">
                                      {titleCase(key)}
                                    </dt>
                                    <dd className="break-words whitespace-pre-wrap min-w-0">
                                      {text(value)}
                                    </dd>
                                  </Fragment>
                                ),
                              )}
                            </dl>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ),
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-sm text-muted-foreground">
              {results.items.length
                ? `${results.page * pageSize + 1}–${results.page * pageSize + results.items.length}${resultCount ? ` of ${resultCount.items.toLocaleString()} records` : " shown"}`
                : "0 records"}{" "}
              · {pageSize} per page
            </span>
            <MealLibraryPagination
              label="Library results pages"
              page={results.page}
              hasMore={results.has_more}
              totalPages={resultCount?.pages}
              onPageChange={(page) => {
                setLoading(true);
                setParams({ ...params, page: String(page) });
              }}
            />
          </div>
        </section>
      )}
      </section>
      {detail && (
        <section
          id="meal-history"
          aria-label="Menu history"
          aria-busy={historyLoading && !historyError}
          className="rounded-xl border-2 border-primary p-5 space-y-4"
        >
          <div className="flex justify-between gap-3">
            <h2 className="font-semibold text-xl">
              {detail.name} — menu history
            </h2>
            <button className={button} onClick={() => setDetail(null)}>
              Close history
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            These are menu listings, not confirmation that a dish was served.
          </p>
          {historyLoading && (
            historyError ? <p role="status">{historyError}</p> : (
              <>
                <p role="status" className="sr-only">Loading history and totals…</p>
                <MealHistorySkeleton />
              </>
            )
          )}
          {!historyLoading && history?.items.map((row, i) => (
            <article key={i} className="border-t pt-3 space-y-1">
              <p className="font-semibold">
                {date(row.service_date)} · {text(row.meal)} · {text(row.course)}
              </p>
              <p>{text(row.wording)}</p>
              {row.accompaniments ? <p>{text(row.accompaniments)}</p> : null}
              <p className="text-sm">
                Allergens as written: {text(row.allergens_as_written)}
              </p>
              <p className="text-xs text-muted-foreground break-words">
                Source: {text(row.source_path)}
              </p>
            </article>
          ))}
          {!historyLoading && history && (
            <>
              {historyTotals.error && (
                <div role="status" className="flex flex-wrap items-center gap-2 text-sm">
                  <span>Total count unavailable.</span>
                  <button type="button" className={button} onClick={historyTotals.retry}>
                    Retry totals
                  </button>
                </div>
              )}
              {historyCount && (
                <p role="status" className="text-sm text-muted-foreground">
                  {historyCount.items.toLocaleString()} matching menu listings
                  {historyCount.pages > 0
                    ? ` · Page ${historyPage + 1} of ${historyCount.pages}`
                    : ""}
                </p>
              )}
              {!history.items.length && (
                <p role="status" className="text-sm text-muted-foreground">
                  No history on page {historyPage + 1}.
                  {historyPage > 0 ? " Choose an earlier page." : ""}
                </p>
              )}
              <MealLibraryPagination
                label="Menu history pages"
                page={historyPage}
                hasMore={history.has_more}
                totalPages={historyCount?.pages}
                onPageChange={(page) => {
                  setHistory(null);
                  setHistoryPage(page);
                }}
              />
            </>
          )}
        </section>
      )}
    </main>
  );
}
