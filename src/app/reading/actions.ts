"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ActivityEventPayload, ActivityEventType } from "@/lib/database.types";

/**
 * THE EVENT RULE (see project plan) lives here. The reading lifecycle is the ONLY
 * source of feed events:
 *   - startReading     → started_reading
 *   - updateProgress   → progress_update
 *   - finishReading    → finished
 * Library bookkeeping (TBR/Read toggles, rating/reviewing with no open
 * session) emits nothing — that lives in src/app/library/actions.ts.
 *
 * RLS scopes every read/write to the current user; requireUser is the app-layer
 * guard so a logged-out POST can't reach these.
 */

type FinishInput = {
  rating?: number | null;
  review?: string | null;
};

/** Insert a feed event for the current user. Caller owns the lifecycle write. */
async function emitEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  type: ActivityEventType,
  bookId: string,
  sessionId: string,
  payload: ActivityEventPayload
) {
  const { error } = await supabase.from("activity_events").insert({
    user_id: userId,
    type,
    book_id: bookId,
    session_id: sessionId,
    payload,
  });
  if (error) throw new Error(error.message);
}

/**
 * Begin a reading session for a book and emit `started_reading`.
 * No-op (returns the existing session id) if one is already open, so a
 * double-click can't create two concurrent sessions for the same book.
 */
export async function startReading(bookId: string) {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("reading_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("book_id", bookId)
    .is("finished_at", null)
    .maybeSingle();

  if (existing) return;

  const { data: book } = await supabase
    .from("books")
    .select("pages")
    .eq("id", bookId)
    .single();

  const { data: session, error } = await supabase
    .from("reading_sessions")
    .insert({ user_id: user.id, book_id: bookId, current_page: 0 })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await emitEvent(supabase, user.id, "started_reading", bookId, session.id, {
    current_page: 0,
    total_pages: book?.pages ?? undefined,
  });

  revalidatePath("/library");
  revalidatePath("/feed");
}

/**
 * Record progress on the open session and emit `progress_update`.
 * current_page is clamped to [0, total_pages] when the total is known.
 */
export async function updateProgress(sessionId: string, currentPage: number) {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: session, error: fetchError } = await supabase
    .from("reading_sessions")
    .select("id, book_id, finished_at")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  if (session.finished_at) throw new Error("This session is already finished.");

  const { data: book } = await supabase
    .from("books")
    .select("pages")
    .eq("id", session.book_id)
    .single();

  const total = book?.pages ?? null;
  let page = Math.max(0, Math.floor(currentPage));
  if (total != null) page = Math.min(page, total);

  const { error } = await supabase
    .from("reading_sessions")
    .update({ current_page: page })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  await emitEvent(supabase, user.id, "progress_update", session.book_id, sessionId, {
    current_page: page,
    total_pages: total ?? undefined,
  });

  revalidatePath("/library");
  revalidatePath("/feed");
}

/**
 * Close the open session and emit `finished`. Also flips the private Read flag
 * (and records rating/review if supplied) on the library entry — finishing a
 * read is the one lifecycle step that touches library bookkeeping too.
 */
export async function finishReading(sessionId: string, input: FinishInput = {}) {
  const user = await requireUser();
  const supabase = await createClient();

  const rating = input.rating ?? null;
  if (rating !== null && (rating < 0.5 || rating > 5 || rating * 2 !== Math.floor(rating * 2))) {
    throw new Error("Rating must be a half-star value between 0.5 and 5.");
  }
  const review = input.review?.trim() ? input.review.trim() : null;

  const { data: session, error: fetchError } = await supabase
    .from("reading_sessions")
    .select("id, book_id, finished_at")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  if (session.finished_at) throw new Error("This session is already finished.");

  const { data: book } = await supabase
    .from("books")
    .select("pages")
    .eq("id", session.book_id)
    .single();
  const total = book?.pages ?? null;

  const { error: closeError } = await supabase
    .from("reading_sessions")
    .update({ finished_at: new Date().toISOString(), current_page: total })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (closeError) throw new Error(closeError.message);

  // Mark the book read in the private library, merging optional rating/review.
  const entryPatch: Record<string, unknown> = {
    user_id: user.id,
    book_id: session.book_id,
    read: true,
    updated_at: new Date().toISOString(),
  };
  if (rating !== null) entryPatch.rating = rating;
  if (review !== null) entryPatch.review = review;

  const { error: entryError } = await supabase
    .from("library_entries")
    .upsert(entryPatch, { onConflict: "user_id,book_id" });
  if (entryError) throw new Error(entryError.message);

  const payload: ActivityEventPayload = { total_pages: total ?? undefined };
  if (total != null) payload.current_page = total;
  if (rating !== null) payload.rating = rating;
  if (review !== null) payload.review = review;

  await emitEvent(supabase, user.id, "finished", session.book_id, sessionId, payload);

  revalidatePath("/library");
  revalidatePath("/feed");
}

/**
 * Abandon a book entirely (the red "Abandon Book" control). Fully removes the
 * user's relationship with one book: deletes its feed events (which cascades to
 * their reactions/comments), all its reading sessions, and the library entry
 * (TBR/Read/rating/review). Scoped to the current user; emits nothing.
 */
export async function abandonBook(bookId: string) {
  const user = await requireUser();
  const supabase = await createClient();

  // Events first — reading_sessions FK is ON DELETE SET NULL, so dropping the
  // sessions first would orphan the events. Deleting events cascades to their
  // reactions/comments (those FKs are ON DELETE CASCADE).
  const { error: eventsError } = await supabase
    .from("activity_events")
    .delete()
    .eq("user_id", user.id)
    .eq("book_id", bookId);
  if (eventsError) throw new Error(eventsError.message);

  const { error: sessionsError } = await supabase
    .from("reading_sessions")
    .delete()
    .eq("user_id", user.id)
    .eq("book_id", bookId);
  if (sessionsError) throw new Error(sessionsError.message);

  const { error: entryError } = await supabase
    .from("library_entries")
    .delete()
    .eq("user_id", user.id)
    .eq("book_id", bookId);
  if (entryError) throw new Error(entryError.message);

  revalidatePath("/library");
  revalidatePath("/library/tbr");
  revalidatePath("/search");
  revalidatePath("/feed");
}
