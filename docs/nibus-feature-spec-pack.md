# Nibus — Feature Build Spec Pack
### Phase: "Letterboxd-for-Comics Core" + mobile-ready foundations

This document is a build brief for Claude Code. It specifies a sequenced set of features to add to the existing Nibus codebase. Implement the phases **in order** — later phases link to routes and data functions created in earlier ones. Each phase is independently testable; run `npm run dev`, verify the acceptance criteria, then move on.

---

## 0. Ground rules for the implementing agent

Before writing any code:

1. **Read `AGENTS.md`.** This Next.js (16.2.x) has breaking changes from older training data. Consult `node_modules/next/dist/docs/` before using framework APIs, and heed deprecation notices.
2. **Types are hand-maintained.** Every schema change is a **three-file change**: `supabase/schema.sql` (source of truth), a new file in `supabase/migrations/`, and `src/lib/database.types.ts`. Never skip the type sync.
3. **Respect the event rule.** Feed events come **only** from the reading lifecycle. After this pack the lifecycle is `started_reading` and `finished` only — `progress_update` becomes dormant (see Phase 4). Library bookkeeping (TBR/Read toggles, silent ratings/reviews) emits **nothing**.
4. **Migrations are append-only.** Last existing migration is `0004`. New work starts at `0005`. Run migrations in order in the Supabase SQL editor.
5. **Never commit secrets.** `.env.local` and `.claude/settings.local.json` stay gitignored.

### Architecture conventions for new code (the mobile-ready pattern)

Nibus is heading toward a single React codebase that ships as a website **and**, later, as a Capacitor-wrapped iOS/Android app. The Capacitor wrapping is a **separate future pack** — do **not** attempt it here. But build new code so that conversion is cheap later:

- **Mutations become client-callable.** New writes (rating, logging a read, TBR toggle, profile edits) go in a thin data layer at `src/lib/data/*.ts` as plain `async` functions that use the **browser** Supabase client (`src/lib/supabase/client.ts`). Row-Level Security is what makes direct client access safe — every policy is scoped by `auth.uid()`.
- **Reads can stay server-rendered for now.** Public/SEO pages (landing `/`, `/u/[handle]`, the new book page, search) and other server components may keep using the server client (`src/lib/supabase/server.ts`). When we do the Capacitor pack, these authenticated pages convert to client components that call the same `src/lib/data` functions — which is why we build the mutations client-callable now.
- **No `revalidatePath` in client data functions.** It's a server-only API. After a client mutation, refresh with `router.refresh()` (re-fetches server components) and/or update local React state optimistically. Server Actions that remain may keep using `revalidatePath`.
- **Existing Server Actions we are modifying** (`src/app/reading/actions.ts`, `src/app/library/actions.ts`) should be migrated into `src/lib/data/` as part of modifying them, since we're touching them anyway and it advances the mobile goal. Leave untouched actions alone.

### The shape of every feature spec below

Each spec names up to four things: **Data layer** (functions + file), **Schema/RLS** (if any), **UI** (components/routes), and **Capacitor** (almost always N/A in this pack), plus concrete **acceptance criteria**.

---

## 1. Consolidated data-model changes (do this first — Phase 0)

All schema changes for the entire pack are collected here so they ship in one migration.

### Migration `supabase/migrations/0005_public_library_pro_synopsis.sql`

```sql
-- 0005 — make library entries public-readable, add Pro flag and book synopsis.

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
```

Also apply the same three structural changes (public-read policy, `is_pro`, `synopsis`) to `supabase/schema.sql` so the canonical schema stays accurate.

### `src/lib/database.types.ts` edits

- `Book`: add `synopsis: string | null;`
- `User`: add `is_pro: boolean;`
- `LibraryEntry`: unchanged.

### Pro gating stub — `src/lib/pro.ts` (new)

```ts
import type { User } from "@/lib/database.types";

/**
 * Central Pro gate. Currently a no-op (everyone passes) so nothing is gated yet,
 * but every Pro-flavored feature must route through THIS function rather than
 * reading `is_pro` directly. When billing ships, we change this one function and
 * all gated features inherit it. Do not inline `user.is_pro` checks elsewhere.
 */
export function canUseProFeature(_user: Pick<User, "is_pro">): boolean {
  return true; // TODO: return _user.is_pro once billing exists.
}
```

### Data-layer scaffolding — create empty modules under `src/lib/data/`

`books.ts`, `library.ts`, `reading.ts`, `feed.ts`, `trending.ts`, `profile.ts`, `social.ts`. Populated by the phases below.

**Acceptance:** migration runs clean in Supabase; `npm run build` typechecks; the existing app still loads and behaves as before (no user-visible change yet).

---

## 2. Build order

| Phase | Feature | Depends on |
|---|---|---|
| 0 | Foundation: migration 0005, types, `pro.ts`, data scaffolding | — |
| 1 | **Book page** (`/book/[id]`) + universal book linking | 0 |
| 2 | Search cleanup (strip inline actions; results link to book page) | 1 |
| 3 | Signup: "Handle" → "Username" + `@username` placeholder | 0 |
| 4 | Reading lifecycle reskin ("+ New Read/Update") + quiet progress | 0, 1 |
| 5 | Home = feed + trending strip; land here after login | 0, 4 |
| 6 | Mobile nav (Letterboxd-style tab bar) + profile dropdown | 1, 5 |
| 7 | Profile editing + avatars + stats + "currently reading" | 0, 6 |
| 8 | Adaptive empty-feed state + forgot-password | 5 |
| 9 | **Parked — do not build** (see §5) | — |

Book page (Phase 1) comes early because search and the feed both link into it.

---

## 3. Feature specs

### Phase 1 — Book page (`/book/[id]`)

**Goal:** A dedicated, Letterboxd-style page for one book that opens from **any** book reference anywhere in the app. It is the single hub where rating/reviewing/logging happen.

**Route/UI:** New server-rendered route `src/app/book/[id]/page.tsx`. Layout, top to bottom:
- Cover (`BookCover`), title, `volume`, `format` (label: omnibus / compendium / DC Absolute), `authors`, `artists`, `year`, `pages`.
- **Brief plot** from `synopsis` (omit gracefully if null).
- **Average rating** across all users (public `library_entries.rating`), shown with count (e.g. "★ 4.1 · 23 ratings").
- **Your rating bar:** reuse `src/components/library/StarRating.tsx`, half-star, in a small **client component** (`src/components/book/YourRating.tsx`) that calls `rateBook` and `saveReview`. Tapping a star here is a **silent** rating — it updates your library/profile and the average, but posts **no feed event** (this is core feature #5).
- **Ratings from people you follow:** list of followed users who have rated this book, with their avatar + score, linking to `/u/[handle]`.
- A primary **"Log this read"** action that opens the "+ New Read/Update" flow (Phase 4) pre-filled with this book.

**Data layer — `src/lib/data/books.ts`:**
- `getBook(id)` → single book row.
- `getBookAggregate(id)` → `{ average: number | null, count: number }` from public `library_entries` where `rating is not null`.
- `getFollowedRatings(bookId, userId)` → followed users' `{ user, rating, review }` for this book (join `follows` → `library_entries` → `users`).

**Data layer — `src/lib/data/library.ts`:**
- `rateBook(bookId, rating | null)` — validate half-star 0.5–5.0; upsert `library_entries` (onConflict `user_id,book_id`); **emits no event**.
- `saveReview(bookId, review)` — trim; null if empty; upsert; **emits no event**.
- `setTbr(bookId, value)`, `setRead(bookId, value)` — migrate from `src/app/library/actions.ts`; **emit no events**.

**Universal linking:** every place a book is rendered (search results, `FeedEvent`, library rows, currently-reading, trending) links to `/book/[id]`.

**Capacitor:** N/A.

**Acceptance:**
- Clicking a book anywhere opens `/book/[id]`.
- Tapping a star on the book page with no active read sets your rating, updates the average, shows on your profile — and produces **no feed card**.
- Followed users' ratings appear; non-followed users' individual ratings do not (only the aggregate average does).

---

### Phase 2 — Search cleanup

**Goal:** Search is purely "find the book." All actions move to the book page.

**UI — `src/components/search/SearchClient.tsx` and `src/app/search/page.tsx`:**
- **Remove** the TBR / Read / Currently-Reading buttons and the inline rating + review controls from search results.
- Each result becomes a compact row/card (cover, title, volume, format, author) that links to `/book/[id]`.
- Keep the existing scope selector (title / ISBN / author / artist).

**Data layer:** keep current in-memory search for now (catalog is small; server-side search is parked, §5).

**Acceptance:** searching shows results with no inline action controls; clicking any result opens its book page.

---

### Phase 3 — Signup label change

**Goal:** Present "handle" as "Username" with an example placeholder. No data-model change — the column stays `handle` and stores the value **without** the `@`.

**UI — `src/components/auth/AuthForm.tsx` (and `src/app/signup/page.tsx`):**
- Change the field label "Handle" → "Username".
- Add faint placeholder text `@username` (styled muted/placeholder).
- On submit, strip a leading `@` if the user typed one before saving to `handle`.

**Acceptance:** signup shows "Username" with a greyed `@username` example; the stored `handle` never contains `@`.

---

### Phase 4 — Reading lifecycle reskin + quiet progress

**Goal:** One entry point — **"+ New Read/Update"** — for all logging. Keep the start → progress → finish lifecycle (Lifecycle A), but **progress updates go quiet** (no feed cards), so a multi-week omnibus doesn't spam followers. Feed cards are produced **only** by `started_reading` and `finished`.

**Entry component — `src/components/reading/NewReadModal.tsx` (client):** opens from (a) the mobile center "+" button, (b) the web "+ New Read/Update" box, and (c) the book page "Log this read" action. Two modes:
- **Start a read:** pick book + start date → creates a `reading_sessions` row and emits a `started_reading` feed event. The user later **Finishes** it (rating + review + finish date) → emits a `finished` event and flips the private `read` flag (merging rating/review).
- **Log a finished read:** book + rating + review + date, recorded complete in one step → single `finished` feed event (and `read` flag set). Use this for one-sitting reads and backfilling something just completed.

**Data layer — `src/lib/data/reading.ts`** (migrate from `src/app/reading/actions.ts`):
- `startRead(bookId, startedAt)` → no-op if an open session exists; insert session; emit `started_reading`.
- `updateProgress(sessionId, currentPage)` → clamp to `[0, pages]`; update `reading_sessions.current_page`; **do NOT emit any event** (this is the change from today).
- `finishRead(sessionId, { rating?, review?, finishedAt? })` → close session; upsert `library_entries` with `read=true` + optional rating/review; emit `finished` with payload `{ total_pages, current_page, rating?, review? }`.
- `logFinishedRead(bookId, { rating?, review?, date })` → create an already-closed session (or insert directly) and emit a single `finished` event; set `read=true`.
- `getCurrentlyReading(userId)` → open sessions (`finished_at is null`) joined to books (used in Phases 5/7).
- Keep `abandonBook(bookId)` behavior; migrate as-is.

**Enum note:** leave `progress_update` in the `activity_event_type` enum (removing a Postgres enum value is disruptive). It simply stops being emitted. `FeedEvent` may keep rendering any historical `progress_update` rows but none are created going forward.

**Capacitor:** N/A now. (Camera barcode scan to add a book is a future plugin — out of scope.)

**Acceptance:**
- "Start a read" posts exactly one `started_reading` card; "Finish" posts exactly one `finished` card with the rating.
- Logging progress changes "currently reading" page count but posts **no** card.
- "Log a finished read" posts exactly one `finished` card.

---

### Phase 5 — Home = feed + trending strip

**Goal:** After login/signup, land on a Home page that is the feed plus a trending strip. Personalized recommendations are parked (§5).

**Routing:**
- `src/app/page.tsx` becomes **adaptive**: logged-out → existing landing/marketing; logged-in → Home (feed + trending).
- Set post-auth redirect to `/` (check `src/app/auth/actions.ts` redirect target).
- The existing feed query in `src/app/feed/page.tsx` moves into the Home composition (keeping `/feed` as an alias is optional).

**UI:**
- **Trending strip** (`src/components/discovery/TrendingStrip.tsx`): horizontal scroll of book covers linking to `/book/[id]`.
- Below it, the existing scoped feed (self + followed users).

**Data layer — `src/lib/data/trending.ts`:**
- `getTrending({ window = '14 days', scope = 'all' })` → books ranked by recent activity. v1: count `finished` + `started_reading` events (and/or new TBR adds) per book in the window, app-wide. Return top N with book rows. Keep the query simple; this is not the parked recommendation algorithm.

**Acceptance:** logging in lands on `/` showing a trending strip above the feed; trending reflects recent activity; tapping a trending cover opens its book page.

---

### Phase 6 — Navigation (Letterboxd-style)

**Goal:** Mobile-first navigation that gives the "+" a home and makes Library/TBR reachable. This is load-bearing for the eventual Capacitor app.

**UI:**
- **Bottom tab bar** (`src/components/nav/TabBar.tsx`), shown on mobile widths: **Home · Search · ➕ · Profile** (optionally an Activity/Notifications slot later). The center **➕** opens the "+ New Read/Update" flow (Phase 4). Style after Letterboxd's clean bottom bar.
- **Profile dropdown** in `src/components/Nav.tsx` (desktop): hovering the profile name reveals **Library** and **TBR** (→ `/library`, `/library/tbr`). Provide a **tap** equivalent for touch (hover doesn't exist on mobile) — e.g. the Profile tab routes to the profile, which surfaces Library/TBR entries.
- Keep desktop nav for wide screens; tab bar for narrow.

**Acceptance:** on a phone-width viewport the bottom tab bar appears with a working center "+"; Library and TBR are reachable from the profile menu on both desktop (hover) and mobile (tap).

---

### Phase 7 — Profile editing, avatars, stats, currently-reading

**Goal:** Make profiles feel alive and editable. The `users.avatar` and `users.bio` columns already exist but are dormant.

**UI:**
- **Settings page** (`src/app/settings/page.tsx`): edit display `name` and `bio`. (Username/`handle` editing optional — flag uniqueness if added.)
- **Avatar fallback** (`src/components/profile/Avatar.tsx`): when `avatar` is null, render the **display name or @username on a generated color block** (mirror the publisher-color logic from the existing cover fallback so it feels consistent — not bare initials). Use this avatar everywhere a user appears (feed cards, followed-ratings, people lists, profile header). *(Real photo upload via Supabase Storage is an easy follow-on, not required here.)*
- **Stats:** wire the existing `src/components/library/StatsStrip.tsx` to real counts — books read, read this year, reviews written, following/followers.
- **Currently reading** (`src/components/profile/CurrentlyReading.tsx`): show open sessions on the profile and Home, using `getCurrentlyReading`. This is what makes Lifecycle A earn its keep for long-format comics.

**Data layer — `src/lib/data/profile.ts`:**
- `updateProfile({ name?, bio? })` — owner-scoped upsert/update on `users`.
- `getProfileStats(userId)` — aggregate counts.

**Acceptance:** a user can change name/bio in settings; every user surface shows a name/username color avatar instead of blank/initials; stats reflect real data; in-progress reads appear on the profile and Home.

---

### Phase 8 — Empty states + forgot password

**Goal:** Survive the cold start, and let people recover accounts.

**UI — adaptive empty feed (in the Home/feed component):**
- If the user **follows no one** → show a **"people to follow"** module (uses `getPeopleToFollow`).
- If the user **follows people but the feed is quiet** → show a **"log or rate your first book"** nudge linking to search / the "+" flow.

**Data layer — `src/lib/data/social.ts`:**
- `getPeopleToFollow(userId, limit)` → users the current user does not yet follow (simple: most-followed or most-recently-active, excluding self and existing follows).

**Forgot password — `src/components/auth/ForgotPassword.tsx` + route:**
- Use Supabase Auth's built-in reset (`resetPasswordForEmail`) and a reset-confirmation page. Link it from the login form.

**Acceptance:** a brand-new user who follows no one sees suggested people, not a blank screen; a "forgot password?" link on login sends a working reset email and completes the reset.

---

## 4. Sanity checklist before calling the pack done

- Schema, a single `0005` migration, and `database.types.ts` are all in sync.
- `npm run build` typechecks; `npm run dev` runs; existing flows (auth, follow, feed, library) still work.
- The **only** feed cards created are `started_reading` and `finished`. Silent ratings/reviews and progress updates create none.
- `library_entries` is publicly **readable** but still only **writable** by its owner (verify with `supabase/rls-check.sql`).
- Every book reference links to `/book/[id]`.
- Any Pro-flavored check routes through `canUseProFeature` (none exist yet, but the pattern is in place).

---

## 5. Parked — explicitly out of scope for this pack

Do **not** build these now. Listed so the intent isn't lost.

- **Capacitor wrapping (iOS/Android) + static export config.** The next dedicated pack. This pack only makes the *web app* feature-complete and the *mutations* client-callable so that conversion is cheap.
- **Personalized recommendations.** Needs genre/tag metadata on `books` (none exists) plus a user base. Trending (Phase 5) is the interim Home discovery surface.
- **Push notifications.** Real project — Capacitor + APNs/FCM + certificates. Deferred.
- **Server-side search at scale.** Current in-memory search is fine until the catalog is large.
- **Pro features themselves** (door is framed via `is_pro` + `canUseProFeature`, but none are built):
  - *Reading achievements / badges* — strongest first real Pro draw; computable from existing data later. Lean "base badges free, prestige flare Pro."
  - *TBR wheel-spin* — cheap and charming; consider shipping **free** as a shareable hook.
  - *Variant covers* — mechanically easy (a `cover_url` override) but the real cost is catalog curation and image rights/moderation; park until the catalog justifies it.
- **Billing** (Stripe on web; Apple/Google in-app purchase on mobile, ~15–30% cut + store rules). Additive when it comes — it just sets `is_pro`, which `canUseProFeature` already reads. No retrofit penalty for deferring.
