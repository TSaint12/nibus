"use client";

import { useState, useTransition } from "react";
import type { Book, ReadingSession } from "@/lib/database.types";
import { StarRating } from "./StarRating";
import { startReading, updateProgress, finishReading, abandonBook } from "@/app/reading/actions";

/**
 * The reading lifecycle UI for one book:
 *   - no session  → a "Currently Reading" button that opens a session
 *   - collapsed   → a compact "Currently Reading · X%" status pill (click to expand)
 *   - expanded    → progress + finish controls
 * Update and Finish drive feed events. Close is purely local: it collapses the
 * panel and discards any page number typed but not saved with Update — the
 * session and its saved progress stay intact. TBR/Read flags above stay event-free.
 */
export function ReadingControls({
  book,
  session,
}: {
  book: Book;
  session: ReadingSession | null;
}) {
  const [pending, startTransition] = useTransition();
  const total = book.pages ?? null;

  // The server's saved page; the input mirrors it but can be edited freely.
  const savedPage = session?.current_page != null ? String(session.current_page) : "";
  const [page, setPage] = useState<string>(savedPage);
  const [open, setOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [review, setReview] = useState("");

  if (!session) {
    // Starting opens a session AND auto-expands so the reader can log a page.
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setOpen(true);
          startTransition(() => startReading(book.id));
        }}
        className="self-start rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
      >
        {pending ? "Starting…" : "Currently Reading"}
      </button>
    );
  }

  const pct =
    total && session.current_page != null
      ? Math.round((session.current_page / total) * 100)
      : null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 self-start rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30 dark:hover:bg-emerald-500/20"
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Currently Reading{pct != null ? ` · ${pct}%` : ""}
      </button>
    );
  }

  function submitProgress() {
    const n = parseInt(page, 10);
    if (Number.isNaN(n)) return;
    startTransition(() => updateProgress(session!.id, n));
  }

  function submitFinish() {
    setFinishOpen(false);
    startTransition(() => finishReading(session!.id, { rating, review }));
  }

  function close() {
    // Collapse without saving: drop unsaved page edits, keep the session as-is.
    setPage(savedPage);
    setFinishOpen(false);
    setOpen(false);
  }

  function abandon() {
    const ok = window.confirm(
      `Abandon "${book.title}"? This removes it from your library and deletes its reading activity from your feed. This can't be undone.`
    );
    if (!ok) return;
    startTransition(() => abandonBook(book.id));
  }

  return (
    <div className="mt-1 flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2.5 dark:border-emerald-500/30 dark:bg-emerald-500/5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Reading
          {pct != null && <span className="text-emerald-600/70">· {pct}%</span>}
        </div>

        <button
          type="button"
          onClick={abandon}
          disabled={pending}
          className="rounded-full bg-red-600/50 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-red-600/70 disabled:opacity-50"
        >
          Abandon Book
        </button>
      </div>

      {total != null && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-emerald-200/60 dark:bg-emerald-500/15">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${pct ?? 0}%` }}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
          Page
          <input
            type="number"
            min={0}
            max={total ?? undefined}
            value={page}
            onChange={(e) => setPage(e.target.value)}
            className="w-20 rounded border border-zinc-300 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
          {total != null && <span className="text-zinc-400">/ {total.toLocaleString()}</span>}
        </label>

        <button
          type="button"
          onClick={submitProgress}
          disabled={pending}
          className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Update
        </button>

        <button
          type="button"
          onClick={() => setFinishOpen((o) => !o)}
          className="rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Finish
        </button>

        <button
          type="button"
          onClick={close}
          disabled={pending}
          className="text-xs text-zinc-400 underline-offset-2 hover:text-zinc-600 hover:underline disabled:opacity-50 dark:hover:text-zinc-300"
        >
          Close
        </button>

        {pending && <span className="text-[10px] text-zinc-400">saving…</span>}
      </div>

      {finishOpen && (
        <div className="flex flex-col gap-2 border-t border-emerald-200/70 pt-2 dark:border-emerald-500/20">
          <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            <span>Rate</span>
            <StarRating value={rating} onChange={setRating} size={18} />
            <span className="text-zinc-400">(optional)</span>
          </div>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={2}
            placeholder="Add a review (optional)"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="button"
            onClick={submitFinish}
            disabled={pending}
            className="self-start rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Mark finished
          </button>
        </div>
      )}
    </div>
  );
}
