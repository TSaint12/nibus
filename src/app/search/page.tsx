import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SearchClient } from "@/components/search/SearchClient";
import type { Book, LibraryEntry, ReadingSession } from "@/lib/database.types";

export default async function SearchPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // The Tier-1 catalog is small and curated, so we load it all and search in
  // memory for an instant, typo-friendly experience. The user's own entries +
  // open sessions ride along so results stay fully actionable (TBR / reading).
  // library_entries is public-readable (migration 0005) — scope to the user.
  const [{ data: books }, { data: entries }, { data: sessions }] = await Promise.all([
    supabase.from("books").select("*").order("title").order("volume"),
    supabase.from("library_entries").select("*").eq("user_id", user.id),
    supabase.from("reading_sessions").select("*").is("finished_at", null),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <p className="text-sm text-zinc-500">Find editions by title, ISBN, author, or artist</p>
      </header>

      <SearchClient
        books={(books ?? []) as Book[]}
        entries={(entries ?? []) as LibraryEntry[]}
        sessions={(sessions ?? []) as ReadingSession[]}
      />
    </div>
  );
}
