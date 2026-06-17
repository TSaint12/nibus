"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * IMPORTANT — the event rule (see AGENTS plan):
 * Everything in this file writes to `library_entries` ONLY. None of it emits
 * feed events. Toggling TBR/Read is private bookkeeping; rating/reviewing
 * a book with no open reading session is a silent Library update. Feed events
 * are emitted exclusively by the reading lifecycle (built in a later step).
 */

type LibraryPatch = {
  tbr?: boolean;
  read?: boolean;
  rating?: number | null;
  review?: string | null;
};

/** Upsert the current user's library entry for a book with a partial patch. */
async function patchEntry(bookId: string, patch: LibraryPatch) {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from("library_entries").upsert(
    {
      user_id: user.id,
      book_id: bookId,
      ...patch,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,book_id" }
  );

  if (error) throw new Error(error.message);
  revalidatePath("/library");
}

export async function setTbr(bookId: string, value: boolean) {
  await patchEntry(bookId, { tbr: value });
}

export async function setRead(bookId: string, value: boolean) {
  await patchEntry(bookId, { read: value });
}

export async function setRating(bookId: string, rating: number | null) {
  if (rating !== null && (rating < 0.5 || rating > 5 || rating * 2 !== Math.floor(rating * 2))) {
    throw new Error("Rating must be a half-star value between 0.5 and 5.");
  }
  await patchEntry(bookId, { rating });
}

export async function saveReview(bookId: string, review: string) {
  const trimmed = review.trim();
  await patchEntry(bookId, { review: trimmed.length ? trimmed : null });
}
