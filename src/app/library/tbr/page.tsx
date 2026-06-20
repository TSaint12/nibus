import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LibraryRow } from "@/components/library/LibraryRow";
import type { Book, LibraryEntry, ReadingSession } from "@/lib/database.types";

export default async function TbrPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Only books the user has flagged TBR. library_entries is public-readable
  // (migration 0005), so scope to the current user explicitly.
  const [{ data: books }, { data: entries }, { data: sessions }] = await Promise.all([
    supabase.from("books").select("*").order("title").order("volume"),
    supabase.from("library_entries").select("*").eq("user_id", user.id).eq("tbr", true),
    supabase.from("reading_sessions").select("*").is("finished_at", null),
  ]);

  const entryList = (entries ?? []) as LibraryEntry[];
  const entryByBook = new Map(entryList.map((e) => [e.book_id, e]));
  const sessionByBook = new Map(
    ((sessions ?? []) as ReadingSession[]).map((s) => [s.book_id, s])
  );

  // Keep catalog order, narrowed to the TBR set.
  const tbrBooks = ((books ?? []) as Book[]).filter((b) => entryByBook.has(b.id));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Link href="/library" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Library
          </Link>
          <span>/</span>
          <span className="text-zinc-900 dark:text-zinc-100">To-Be-Read</span>
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">To-Be-Read</h1>
        <p className="text-sm text-zinc-500">
          {tbrBooks.length} {tbrBooks.length === 1 ? "edition" : "editions"} on your TBR
        </p>
      </header>

      {tbrBooks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
          Nothing here yet. Mark editions{" "}
          <span className="font-medium text-zinc-700 dark:text-zinc-300">TBR</span> from your{" "}
          <Link href="/library" className="underline underline-offset-2">
            Library
          </Link>{" "}
          to build your reading queue.
        </p>
      ) : (
        <div>
          {tbrBooks.map((book) => (
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
