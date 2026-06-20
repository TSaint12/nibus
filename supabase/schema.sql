-- Nibus — Supabase Schema
-- Run this in the Supabase SQL editor after creating your project.

-- ─────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null,
  name text not null,
  avatar text,
  bio text,
  is_pro boolean not null default false,  -- Pro flag (dormant until billing; gate via src/lib/pro.ts)
  created_at timestamptz default now()
);

alter table public.users enable row level security;

-- Anyone can view profiles
create policy "Public profiles are viewable by everyone"
  on public.users for select using (true);

-- Users can only update their own profile
create policy "Users can update own profile"
  on public.users for update using (auth.uid() = id);

-- Insert happens via trigger on auth.users
create policy "Users can insert own profile"
  on public.users for insert with check (auth.uid() = id);

-- Auto-create profile row when user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, handle, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'handle', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────
-- FOLLOWS
-- ─────────────────────────────────────────────
create table public.follows (
  follower_id uuid not null references public.users(id) on delete cascade,
  followee_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

alter table public.follows enable row level security;

create policy "Follows are viewable by everyone"
  on public.follows for select using (true);

create policy "Users can manage own follows"
  on public.follows for all using (auth.uid() = follower_id);

-- ─────────────────────────────────────────────
-- BOOKS (curated Tier 1 catalog)
-- ─────────────────────────────────────────────
create table public.books (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  volume int,                          -- volume number within a series, if applicable
  publisher text not null,
  format text not null check (format in ('omnibus', 'compendium', 'dc_absolute')),
  year int,
  pages int,
  isbn text,
  collects text,                       -- free-text description of what issues/arcs are collected
  synopsis text,                       -- brief plot for the book page (distinct from collects; migration 0005)
  authors text,                        -- comma-separated writers (free text, added in migration 0004)
  artists text,                        -- comma-separated artists
  cover_url text,
  created_at timestamptz default now(),
  -- Identity for upsert in scripts/seed-books.ts (onConflict: title,volume,publisher).
  -- NB: Postgres treats NULL volumes as distinct, so a title+publisher with no volume
  -- can be inserted more than once — fine for the curated Tier 1 set.
  unique (title, volume, publisher)
);

alter table public.books enable row level security;

-- Catalog is publicly readable
create policy "Books are viewable by everyone"
  on public.books for select using (true);

-- Only service role can insert/update (used by seed script and admin)
-- (no policy needed — service_role bypasses RLS)

-- ─────────────────────────────────────────────
-- LIBRARY ENTRIES (private per-user state)
-- ─────────────────────────────────────────────
create table public.library_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  own boolean not null default false,  -- DEPRECATED: Nibus is reading-focused, not a collection tracker. Column kept dormant; no app code reads or writes it.
  tbr boolean not null default false,  -- "To-Be-Read" (was `want`; renamed in migrations/0001_rename_want_to_tbr.sql)
  read boolean not null default false,
  rating numeric(2,1) check (rating >= 0.5 and rating <= 5.0 and rating * 2 = floor(rating * 2)), -- half-star: 0.5 increments
  review text,
  updated_at timestamptz default now(),
  unique (user_id, book_id)
);

alter table public.library_entries enable row level security;

-- library_entries are publicly readable (book-page averages + followed-user
-- ratings, migration 0005). Writes stay owner-scoped via the ALL policy below;
-- app reads scope to the current user explicitly (RLS no longer does it).
create policy "Library entries are viewable by everyone"
  on public.library_entries for select using (true);

create policy "Users can manage own library"
  on public.library_entries for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- READING SESSIONS
-- ─────────────────────────────────────────────
create table public.reading_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  started_at timestamptz not null default now(),
  current_page int,
  finished_at timestamptz,
  created_at timestamptz default now()
);

alter table public.reading_sessions enable row level security;

create policy "Users can view own sessions"
  on public.reading_sessions for select using (auth.uid() = user_id);

create policy "Users can manage own sessions"
  on public.reading_sessions for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- ACTIVITY EVENTS (the feed)
-- ─────────────────────────────────────────────
create type public.activity_event_type as enum (
  'started_reading',
  'progress_update',
  'finished'
);

create table public.activity_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  type public.activity_event_type not null,
  book_id uuid not null references public.books(id) on delete cascade,
  session_id uuid references public.reading_sessions(id) on delete set null,
  payload jsonb,                       -- { current_page?, total_pages?, rating?, review? }
  created_at timestamptz default now()
);

alter table public.activity_events enable row level security;

-- Activity is public (profiles are public, Letterboxd-style). The FEED scopes
-- to "self + followed users" explicitly in its query (src/app/feed/page.tsx) —
-- it does NOT rely on this policy for that filtering. See migration 0002.
create policy "Events are viewable by everyone"
  on public.activity_events for select using (true);

create policy "Users can insert own events"
  on public.activity_events for insert with check (auth.uid() = user_id);

create policy "Users can delete own events"
  on public.activity_events for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- REACTIONS
-- ─────────────────────────────────────────────
create table public.reactions (
  event_id uuid not null references public.activity_events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null default 'like',
  created_at timestamptz default now(),
  primary key (event_id, user_id)
);

alter table public.reactions enable row level security;

-- Public, matching the public-events model (see migration 0003). Writes are
-- still owner-scoped by "Users can manage own reactions" below.
create policy "Reactions are viewable by everyone"
  on public.reactions for select using (true);

create policy "Users can manage own reactions"
  on public.reactions for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- COMMENTS
-- ─────────────────────────────────────────────
create table public.comments (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.activity_events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  text text not null,
  created_at timestamptz default now()
);

alter table public.comments enable row level security;

-- Public, matching the public-events model (see migration 0003). Writes are
-- still owner-scoped by the insert/delete policies below.
create policy "Comments are viewable by everyone"
  on public.comments for select using (true);

create policy "Users can insert own comments"
  on public.comments for insert with check (auth.uid() = user_id);

create policy "Users can delete own comments"
  on public.comments for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
create index idx_library_entries_user_id on public.library_entries(user_id);
create index idx_library_entries_book_id on public.library_entries(book_id);
create index idx_reading_sessions_user_id on public.reading_sessions(user_id);
create index idx_activity_events_user_id on public.activity_events(user_id);
create index idx_activity_events_created_at on public.activity_events(created_at desc);
create index idx_follows_follower_id on public.follows(follower_id);
create index idx_follows_followee_id on public.follows(followee_id);
create index idx_comments_event_id on public.comments(event_id);
create index idx_reactions_event_id on public.reactions(event_id);

-- Trending + book-page aggregates (migration 0005)
create index idx_activity_events_type_created on public.activity_events(type, created_at desc);
create index idx_library_entries_rating on public.library_entries(book_id) where rating is not null;
create index idx_library_entries_tbr on public.library_entries(book_id) where tbr = true;
