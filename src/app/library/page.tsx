import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatsStrip } from "@/components/library/StatsStrip";
import { LibraryRow } from "@/components/library/LibraryRow";
import type { Book, LibraryEntry, ReadingSession } from "@/lib/database.types";

export default async function LibraryPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // The catalog is public. library_entries is now public-readable too (migration
  // 0005), so scope it to the current user explicitly rather than relying on RLS.
  const [{ data: books }, { data: entries }, { data: sessions }] = await Promise.all([
    supabase.from("books").select("*").order("title").order("volume"),
    supabase.from("library_entries").select("*").eq("user_id", user.id),
    supabase.from("reading_sessions").select("*").is("finished_at", null),
  ]);

  const bookList = (books ?? []) as Book[];
  const entryList = (entries ?? []) as LibraryEntry[];
  const sessionList = (sessions ?? []) as ReadingSession[];
  const entryByBook = new Map(entryList.map((e) => [e.book_id, e]));
  const sessionByBook = new Map(sessionList.map((s) => [s.book_id, s]));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Your Library</h1>
        <p className="text-sm text-zinc-500">
          {bookList.length} editions in the catalog
        </p>
      </header>

      <div className="mb-8">
        <StatsStrip entries={entryList} />
      </div>

      {bookList.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
          The catalog is empty. Seed it with{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">npm run seed</code>.
        </p>
      ) : (
        <div>
          {bookList.map((book) => (
            <LibraryRow
              key={book.id}
              book={book}
              entry={entryByBook.get(book.id) ?? null}
              session={sessionByBook.get(book.id) ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
