-- Migration 0001: rename library_entries.want -> tbr
--
-- Context: "Want" was renamed to "To-Be-Read (TBR)" in the UI. This renames the
-- backing column to match. Existing data is preserved (rename, not drop+add).
--
-- Run this ONCE in the Supabase SQL editor (Dashboard → SQL editor). The app code
-- already references `tbr`, so it will error on TBR writes until this is applied.

alter table public.library_entries rename column want to tbr;
