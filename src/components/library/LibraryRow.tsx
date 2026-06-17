"use client";

import { useState, useTransition } from "react";
import type { Book, LibraryEntry, ReadingSession } from "@/lib/database.types";
import { BookCover, FORMAT_LABEL } from "./BookCover";
import { StarRating } from "./StarRating";
import { ReadingControls } from "./ReadingControls";
import {
  setTbr,
  setRead,
  setRating,
  saveReview,
} from "@/app/library/actions";

type Entry = Pick<
  LibraryEntry,
  "tbr" | "read" | "rating" | "review"
>;

const EMPTY: Entry = {
  tbr: false,
  read: false,
  rating: null,
  review: null,
};

export function LibraryRow({
  book,
  entry,
  session,
}: {
  book: Book;
  entry: LibraryEntry | null;
  session: ReadingSession | null;
}) {
  // Local optimistic copy so toggles feel instant; server is source of truth.
  const [local, setLocal] = useState<Entry>(entry ?? EMPTY);
  const [pending, startTransition] = useTransition();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewDraft, setReviewDraft] = useState(entry?.review ?? "");

  function toggle(field: "tbr" | "read") {
    const next = !local[field];
    setLocal((p) => ({ ...p, [field]: next }));
    const action = field === "tbr" ? setTbr : setRead;
    startTransition(() => action(book.id, next));
  }

  function changeRating(value: number | null) {
    setLocal((p) => ({ ...p, rating: value }));
    startTransition(() => setRating(book.id, value));
  }

  function submitReview() {
    setLocal((p) => ({ ...p, review: reviewDraft.trim() || null }));
    setReviewOpen(false);
    startTransition(() => saveReview(book.id, reviewDraft));
  }

  return (
    <div className="flex gap-4 border-b border-zinc-200 py-4 dark:border-zinc-800">
      <BookCover book={book} width={64} />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h3 className="font-medium leading-tight">
            {book.title}
            {book.volume ? (
              <span className="text-zinc-500"> · Vol. {book.volume}</span>
            ) : null}
          </h3>
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-800">
            {FORMAT_LABEL[book.format]}
          </span>
        </div>

        <p className="truncate text-xs text-zinc-500">
          {book.publisher}
          {book.year ? ` · ${book.year}` : ""}
          {book.pages ? ` · ${book.pages.toLocaleString()} pp` : ""}
        </p>

        {(book.authors || book.artists) && (
          <p className="truncate text-xs text-zinc-500">
            {book.authors ? book.authors : null}
            {book.authors && book.artists ? " · " : ""}
            {book.artists ? (
              <span className="text-zinc-400">art by {book.artists}</span>
            ) : null}
          </p>
        )}

        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <Flag label="TBR" active={local.tbr} onClick={() => toggle("tbr")} />
          <Flag label="Read" active={local.read} onClick={() => toggle("read")} />

          <span className="ml-1 flex items-center gap-1">
            <StarRating value={local.rating} onChange={changeRating} size={18} />
          </span>

          <button
            type="button"
            onClick={() => setReviewOpen((o) => !o)}
            className="text-xs text-zinc-500 underline-offset-2 hover:underline"
          >
            {local.review ? "Edit review" : "Add review"}
          </button>

          {pending && <span className="text-[10px] text-zinc-400">saving…</span>}
        </div>

        <ReadingControls book={book} session={session} />

        {!reviewOpen && local.review && (
          <p className="mt-1 line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400">
            {local.review}
          </p>
        )}

        {reviewOpen && (
          <div className="mt-1 flex flex-col gap-2">
            <textarea
              value={reviewDraft}
              onChange={(e) => setReviewDraft(e.target.value)}
              rows={3}
              placeholder="What did you think?"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={submitReview}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
              >
                Save review
              </button>
              <button
                type="button"
                onClick={() => {
                  setReviewDraft(local.review ?? "");
                  setReviewOpen(false);
                }}
                className="rounded-lg px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Flag({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "rounded-full px-2.5 py-1 text-xs font-medium transition " +
        (active
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700")
      }
    >
      {label}
    </button>
  );
}
