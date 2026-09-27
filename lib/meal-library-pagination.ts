// Keep this aligned with the meal-library API's zero-based page limit.
export const MAX_LIBRARY_PAGE = 100000;

type Page = { items: unknown[]; has_more: boolean };

// The archive RPC supports offsets but does not expose a filtered count.
// Find the last page using bounded exponential/binary search, without
// downloading the archive or changing the database's access controls.
export async function countLibraryResults(
  first: Page,
  pageSize: number,
  readPage: (page: number) => Promise<Page>,
): Promise<{ total_pages: number; total_items: number }> {
  const totals = (page: number, result: Page) => ({
    total_pages: page + 1,
    total_items: page * pageSize + result.items.length,
  });
  if (!first.items.length) return { total_pages: 0, total_items: 0 };
  if (!first.has_more) return totals(0, first);

  let lower = 0;
  let upper = 1;
  while (true) {
    const result = await readPage(upper);
    if (!result.items.length) break;
    if (!result.has_more) return totals(upper, result);
    if (upper === MAX_LIBRARY_PAGE) throw new Error("Result count exceeds the page limit.");
    lower = upper;
    upper = Math.min(upper * 2, MAX_LIBRARY_PAGE);
  }

  while (upper - lower > 1) {
    const middle = Math.floor((lower + upper) / 2);
    const result = await readPage(middle);
    if (result.items.length) {
      if (!result.has_more) return totals(middle, result);
      lower = middle;
    } else {
      upper = middle;
    }
  }
  // An exact count requires a stable final page. Avoid reporting a guessed
  // total if the archive changed between reads.
  const last = await readPage(lower);
  if (!last.items.length || last.has_more) throw new Error("Results changed while counting.");
  return totals(lower, last);
}

export function libraryPageNumbers(page: number, totalPages: number): number[] {
  if (totalPages <= 9) {
    return Array.from({ length: totalPages }, (_, index) => index);
  }
  const start = Math.max(0, Math.min(page - 2, totalPages - 5));
  return [...new Set([
    0,
    ...Array.from({ length: 5 }, (_, index) => start + index),
    totalPages - 1,
  ])].sort((a, b) => a - b);
}
