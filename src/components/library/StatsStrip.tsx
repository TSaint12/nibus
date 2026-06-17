import type { LibraryEntry } from "@/lib/database.types";

/** Computes and renders the Library stats. Reading-focused: TBR backlog, books
 *  read, and average rating. */
export function StatsStrip({ entries }: { entries: LibraryEntry[] }) {
  const tbr = entries.filter((e) => e.tbr).length;
  const read = entries.filter((e) => e.read).length;

  const rated = entries.filter((e) => e.rating != null);
  const avg =
    rated.length > 0
      ? (rated.reduce((s, e) => s + (e.rating ?? 0), 0) / rated.length).toFixed(1)
      : "—";

  const stats: { label: string; value: string | number; highlight?: boolean }[] = [
    { label: "To-Be-Read", value: tbr, highlight: true },
    { label: "Read", value: read },
    { label: "Avg rating", value: avg },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className={
            "rounded-xl border px-3 py-3 " +
            (s.highlight
              ? "border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10"
              : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900")
          }
        >
          <div className="text-2xl font-semibold tabular-nums">{s.value}</div>
          <div className="text-xs text-zinc-500">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
