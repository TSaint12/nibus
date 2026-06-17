-- Migration 0004: add authors + artists to books, backfill the Tier-1 catalog
--
-- Context: the new /search tab searches by title, ISBN, author, and artist, but
-- books had no creator columns. These are comma-separated free text (like the
-- existing `collects` column). Backfill values for the 4 seeded books below.
--
-- Run this ONCE in the Supabase SQL editor (Dashboard → SQL editor).

alter table public.books add column if not exists authors text;
alter table public.books add column if not exists artists text;

update public.books set authors = 'Stan Lee', artists = 'Steve Ditko, Jack Kirby'
  where title = 'Amazing Spider-Man Omnibus' and volume = 1 and publisher = 'Marvel';

update public.books set authors = 'Stan Lee', artists = 'Steve Ditko, John Romita Sr.'
  where title = 'Amazing Spider-Man Omnibus' and volume = 2 and publisher = 'Marvel';

update public.books set authors = 'Mike W. Barr', artists = 'Alan Davis, Norm Breyfogle'
  where title = 'Batman: The Dark Knight Detective' and volume = 1 and publisher = 'DC';

update public.books set authors = 'Robert Kirkman', artists = 'Tony Moore, Charlie Adlard'
  where title = 'Walking Dead Compendium' and volume = 1 and publisher = 'Image';
