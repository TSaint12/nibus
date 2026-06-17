# Nibus

A Letterboxd-style log and social layer for large-format collected comic editions — **omnibuses, compendiums, and DC Absolutes** (Tier 1 at launch).

Two surfaces:
- **Library** — your private shelf: To-Be-Read (TBR) / Read flags, half-star ratings, reviews.
- **Feed** — the social layer: reading activity from people you follow, with likes and comments.

## The core design rule

Feed events come **only** from the reading lifecycle: `started_reading`, `progress_update`, `finished`. Rating or reviewing a book with no open reading session is a silent, Library-only update — it never hits the feed. TBR/Read toggles are private bookkeeping. This keeps the feed about *reading*, not list management.

## Stack

- **Next.js 16** (App Router, Server Actions, Turbopack) + **React 19** + **Tailwind v4**
- **Supabase** — Postgres, Auth, Row-Level Security
- Cover pipeline: Open Library → Google Books → generated publisher-color fallback

## What's built

| Area | Status |
|---|---|
| **Auth** — email/password signup + login, profile auto-created via DB trigger | ✅ |
| **Library** — catalog browse, TBR/Read flags, half-star rating, reviews | ✅ |
| **Reading sessions** — start → log page progress → finish; collapsible panel; "Abandon Book" (full removal) | ✅ |
| **Activity feed** — scoped to self + followed users; cards per event type | ✅ |
| **Public profiles** (`/u/[handle]`) — anyone can view a user's activity; follower/following counts | ✅ |
| **Follow graph** — discover people, follow/unfollow; feed fills from follows | ✅ |
| **Reactions + comments** — like and comment on any feed event (public-readable) | ✅ |
| **Search** (`/search`) — by title / ISBN / author / artist, with a scope selector | ✅ |

### Routes
`/` · `/login` · `/signup` · `/feed` · `/library` · `/library/tbr` · `/search` · `/people` · `/u/[handle]`

## Data model (Supabase)

`users` · `follows` · `books` · `library_entries` · `reading_sessions` · `activity_events` · `reactions` · `comments`

Schema lives in [`supabase/schema.sql`](supabase/schema.sql); incremental changes are in [`supabase/migrations/`](supabase/migrations/) (run them in order in the Supabase SQL editor). RLS makes the catalog, profiles, and social content publicly readable while scoping all writes — and private library state — to the owning user.

## Running locally

See [`SETUP.md`](SETUP.md) for full setup. In short:

```bash
npm install
cp .env.local.example .env.local   # fill in your Supabase URL + keys
npm run dev
```

Seed the catalog with `npm run seed -- --file ./data/catalog-sample.json` (fetches covers automatically).

> **Note:** `.env.local` and `.claude/settings.local.json` are gitignored — never commit Supabase keys.

## What's next (ideas)

- **Step 8 — Polish & admin:** editable profile bio / settings page, avatars, book detail pages, admin tooling to load a real catalog, loading/error states, mobile nav.
- **Catalog growth:** real Tier-1 content; move `/search` from in-memory to server-side queries once the catalog is large.
- **Richer social:** notifications, reply threads, reading goals/stats, shelves or custom lists.
- **Discovery:** trending editions, "readers also read," per-publisher browse.

---

🤖 Built with [Claude Code](https://claude.com/claude-code).
