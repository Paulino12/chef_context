"use client";

import { Fragment, FormEvent, useState } from "react";
import { libraryPageNumbers, MAX_LIBRARY_PAGE } from "@/lib/meal-library-pagination";

const button =
  "rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-40";
// Match the API's zero-based page limit.
const maxPage = MAX_LIBRARY_PAGE;

export function MealLibraryPagination({
  page,
  hasMore,
  onPageChange,
  label,
  totalPages,
}: {
  page: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
  label: string;
  totalPages?: number;
}) {
  const [destination, setDestination] = useState("");
  // The API provides has_more rather than a total. Show only pages already
  // reached and the next available page; the input allows any direct jump.
  const pages = totalPages === undefined ? [...new Set([
    0,
    ...Array.from({ length: 3 }, (_, index) => page - 2 + index),
    ...(hasMore ? [page + 1] : []),
  ])].filter((value) => value >= 0 && value <= maxPage)
    : libraryPageNumbers(page, Math.max(1, totalPages));
  const lastPage = totalPages === undefined ? maxPage : Math.max(0, totalPages - 1);

  function goToPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = Number(destination) - 1;
    if (!Number.isInteger(next) || next < 0 || next > lastPage) return;
    if (next !== page) onPageChange(next);
    setDestination("");
  }

  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={button}
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        {pages.map((value, index) => (
          <Fragment key={value}>
            {index > 0 && value - pages[index - 1] > 1 && (
              <span aria-hidden="true" className="px-1">…</span>
            )}
            <button
              type="button"
              className={`${button} min-w-10 ${value === page ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
              aria-label={`Page ${value + 1}`}
              aria-current={value === page ? "page" : undefined}
              onClick={() => {
                if (value !== page) onPageChange(value);
              }}
            >
              {value + 1}
            </button>
          </Fragment>
        ))}
        <button
          type="button"
          className={button}
          disabled={!hasMore || page >= lastPage}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
      <form onSubmit={goToPage} className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          Go to page
          <input
            type="number"
            min={1}
            max={lastPage + 1}
            step={1}
            required
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <button type="submit" className={button}>Go</button>
      </form>
    </nav>
  );
}
