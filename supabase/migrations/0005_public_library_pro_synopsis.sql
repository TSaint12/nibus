-- 0005 — make library entries public-readable, add Pro flag and book synopsis.
--
-- Run this ONCE in the Supabase SQL editor (Dashboard → SQL editor).

-- 1) LIBRARY ENTRIES become publicly readable (TBR, read status, ratings, reviews).
--    This is the unlock for book-page averages and "ratings from people you follow".
--    WRITES stay owner-scoped via the existing "Users can manage own library" ALL policy
--    (its USING clause also gates INSERT/UPDATE checks). We only swap the SELECT policy.
drop policy "Users can view own library" on public.library_entries;
create policy "Library entries are viewable by everyone"
  on public.library_entries for select using (true);

-- 2) PRO FLAG (dormant — everyone false until billing exists).
alter table public.users
  add column if not exists is_pro boolean not null default false;

-- 3) BOOK SYNOPSIS (brief plot for the book page; distinct from `collects`).
alter table public.books
  add column if not exists synopsis text;

-- 4) Indexes to support trending + book-page aggregates.
create index if not exists idx_activity_events_type_created
  on public.activity_events(type, created_at desc);
create index if not exists idx_library_entries_rating
  on public.library_entries(book_id) where rating is not null;
create index if not exists idx_library_entries_tbr
  on public.library_entries(book_id) where tbr = true;
