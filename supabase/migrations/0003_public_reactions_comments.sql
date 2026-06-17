-- Migration 0003: make reactions + comments publicly readable
--
-- Context: events are public (migration 0002), so likes and comments on them
-- should be public too — otherwise you'd see an event on a non-followed user's
-- profile but not its likes/comments. Writes stay owner-scoped (the existing
-- "manage own" / insert / delete policies are unchanged).
--
-- Run this ONCE in the Supabase SQL editor (Dashboard → SQL editor).

drop policy if exists "Reactions visible to event viewers" on public.reactions;
create policy "Reactions are viewable by everyone"
  on public.reactions for select using (true);

drop policy if exists "Comments visible to event viewers" on public.comments;
create policy "Comments are viewable by everyone"
  on public.comments for select using (true);
