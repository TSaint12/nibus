-- Migration 0002: make activity_events publicly readable (public profiles)
--
-- Context: profiles are now public (anyone can see a user's reading activity on
-- /u/<handle>), Letterboxd-style. Previously the SELECT policy gated events to
-- "self + followers", and the feed leaned on that gating for its scoping.
--
-- Two things change together (see also src/app/feed/page.tsx, which now filters
-- to self + followed users IN THE QUERY so the feed stays personal even though
-- the rows are publicly readable):
--
-- Run this ONCE in the Supabase SQL editor (Dashboard → SQL editor).

drop policy if exists "Events visible to self and followers" on public.activity_events;

create policy "Events are viewable by everyone"
  on public.activity_events for select using (true);
