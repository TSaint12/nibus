"use client";

import { useMemo, useState } from "react";
import type { Book, LibraryEntry, ReadingSession } from "@/lib/database.types";
import { LibraryRow } from "@/components/library/LibraryRow";

type Scope = "all" | "title" | "isbn" | "author" | "artist";

const SCOPES: { value: Scope; label: string }[] = [
  { value: "all", label: "All" },
  { value: "title", label: "Title" },
  { value: "isbn", label: "ISBN" },
  { value: "author", label: "Author" },
  { value: "artist", label: "Artist" },
];

/** Strip everything but digits/X so "978-0-7851..." matches "9780785...". */
function normalizeIsbn(s: string): string {
  return s.toLowerCase().replace(/[^0-9x]/g, "");
}

function matches(book: Book, term: string, scope: Scope): boolean {
  const t = term.toLowerCase();
  const isbnTerm = normalizeIsbn(term);
  const inTitle = book.title.toLowerCase().includes(t);
  // Guard against an empty isbnTerm (e.g. "spider" → "") — "".includes("") is
  // true, which would make every ISBN-having book a match.
  const inIsbn =
    !!book.isbn && isbnTerm.length > 0 && normalizeIsbn(book.isbn).includes(isbnTerm);
  const inAuthor = !!book.authors && book.authors.toLowerCase().includes(t);
  const inArtist = !!book.artists && book.artists.toLowerCase().includes(t);

  switch (scope) {
    case "title":
      return inTitle;
    case "isbn":
      return inIsbn;
    case "author":
      return inAuthor;
    case "artist":
      return inArtist;
    default:
      return inTitle || inIsbn || inAuthor || inArtist;
  }
}

export function SearchClient({
  books,
  entries,
  sessions,
}: {
  books: Book[];
  entries: LibraryEntry[];
  sessions: ReadingSession[];
}) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("all");

  const entryByBook = useMemo(
    () => new Map(entries.map((e) => [e.book_id, e])),
    [entries]
  );
  const sessionByBook = useMemo(
    () => new Map(sessions.map((s) => [s.book_id, s])),
    [sessions]
  );

  const trimmed = query.trim();
  const results = useMemo(() => {
    if (!trimmed) return [];
    return books.filter((b) => matches(b, trimmed, scope));
  }, [books, trimmed, scope]);

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
        placeholder="Search the catalog…"
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {SCOPES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setScope(s.value)}
            aria-pressed={scope === s.value}
            className={
              "rounded-full px-3 py-1 text-xs font-medium transition " +
              (scope === s.value
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700")
            }
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {!trimmed ? (
          <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
            Start typing to search {scope === "all" ? "the catalog" : `by ${scope}`}.
          </p>
        ) : results.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
            No editions match “{trimmed}”
            {scope !== "all" ? ` in ${scope}` : ""}.
          </p>
        ) : (
          <>
            <p className="mb-1 text-xs text-zinc-500">
              {results.length} {results.length === 1 ? "result" : "results"}
            </p>
            {results.map((book) => (
              <LibraryRow
                key={book.id}
                book={book}
                entry={entryByBook.get(book.id) ?? null}
                session={sessionByBook.get(book.id) ?? null}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
