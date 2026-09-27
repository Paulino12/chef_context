import assert from "node:assert/strict";
import test from "node:test";
import {
  countLibraryResults,
  libraryPageNumbers,
  MAX_LIBRARY_PAGE,
} from "../lib/meal-library-pagination.ts";

test("counts empty, partial, full and large result sets at every supported page size", async () => {
  for (const size of [10, 25, 50]) {
    for (const total of [0, 1, 9, 10, 11, 25, 50, 90, 100, 247, 1000, 123456]) {
      let reads = 0;
      const readPage = async (page) => {
        reads++;
        assert.ok(page >= 0 && page <= MAX_LIBRARY_PAGE);
        const length = Math.max(0, Math.min(size, total - page * size));
        return { items: Array(length).fill(null), has_more: (page + 1) * size < total };
      };
      const result = await countLibraryResults(await readPage(0), size, readPage);
      assert.deepEqual(result, { total_pages: Math.ceil(total / size), total_items: total });
      assert.ok(reads <= 2 * Math.ceil(Math.log2(Math.max(1, total / size))) + 2);
    }
  }
});

test("does not report a partial total when the API page limit is reached", async () => {
  const page = { items: Array(10).fill(null), has_more: true };
  await assert.rejects(countLibraryResults(page, 10, async () => page), /page limit/);
});

test("propagates failed page reads instead of returning an incorrect count", async () => {
  await assert.rejects(countLibraryResults({ items: [1], has_more: true }, 10, async () => {
    throw new Error("Read failed");
  }), /Read failed/);
});

test("shows all page numbers for up to nine pages", () => {
  assert.deepEqual(libraryPageNumbers(0, 1), [0]);
  assert.deepEqual(libraryPageNumbers(0, 9), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
});

test("keeps first, last and nearby pages visible in a compact range", () => {
  assert.deepEqual(libraryPageNumbers(0, 25), [0, 1, 2, 3, 4, 24]);
  assert.deepEqual(libraryPageNumbers(8, 25), [0, 6, 7, 8, 9, 10, 24]);
  assert.deepEqual(libraryPageNumbers(24, 25), [0, 20, 21, 22, 23, 24]);
  for (let page = 0; page < 100; page++) {
    const pages = libraryPageNumbers(page, 100);
    assert.ok(pages.includes(page));
    assert.equal(pages[0], 0);
    assert.equal(pages.at(-1), 99);
    assert.ok(pages.length <= 7);
    assert.deepEqual(pages, [...new Set(pages)].sort((a, b) => a - b));
  }
});
