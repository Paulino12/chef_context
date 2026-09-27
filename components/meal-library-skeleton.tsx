export function MealLibrarySkeleton({
  rows,
  columns,
}: {
  rows: number;
  columns: string[];
}) {
  return (
    <div aria-hidden="true" className="space-y-3 motion-safe:animate-pulse">
      <div className="overflow-x-auto rounded-xl border bg-background">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-secondary text-secondary-foreground">
            <tr>
              {columns.map((column) => (
                <th key={column} className="whitespace-nowrap px-4 py-3 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {Array.from({ length: rows }, (_, row) => (
              <tr key={row} className="even:bg-secondary/15">
                {columns.map((column, index) => (
                  <td key={column} className="h-[62px] px-4 py-3">
                    <div
                      className={`h-4 rounded bg-muted ${index === 0 ? "w-3/4 min-w-32" : "w-2/3 min-w-12"}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="h-4 w-56 rounded bg-muted" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="h-10 w-10 rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function MealHistorySkeleton() {
  return (
    <div aria-hidden="true" className="space-y-4 motion-safe:animate-pulse">
      {[0, 1, 2].map((item) => (
        <div key={item} className="space-y-3 border-t pt-3">
          <div className="h-5 w-1/2 rounded bg-muted" />
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-4 w-2/3 rounded bg-muted" />
          <div className="h-3 w-1/3 rounded bg-muted" />
        </div>
      ))}
      <div className="h-10 w-56 rounded-lg bg-muted" />
    </div>
  );
}
