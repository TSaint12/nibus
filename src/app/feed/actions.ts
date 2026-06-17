"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { CommentRow } from "@/lib/interactions";

/**
 * Social interactions on activity events: a single 'like' reaction per user per
 * event, and a flat comment thread. RLS scopes reads (public) and writes (own);
 * requireUser is the app-layer guard. These run from FeedEvent cards on both
 * /feed and /u/<handle>, so they revalidate /feed (profiles are dynamic and
 * re-fetch on navigation; the client component updates optimistically meanwhile).
 */

/** Toggle the current user's like on an event. Returns the new liked state. */
export async function toggleReaction(eventId: string): Promise<boolean> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("reactions")
    .select("event_id")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("reactions")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
    revalidatePath("/feed");
    return false;
  }

  const { error } = await supabase
    .from("reactions")
    .insert({ event_id: eventId, user_id: user.id });
  if (error) throw new Error(error.message);
  revalidatePath("/feed");
  return true;
}

/** Add a comment and return the created row (joined with its author). */
export async function addComment(eventId: string, text: string): Promise<CommentRow> {
  const user = await requireUser();
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Comment can't be empty.");
  if (trimmed.length > 2000) throw new Error("Comment is too long.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .insert({ event_id: eventId, user_id: user.id, text: trimmed })
    .select("*, user:users!user_id(*)")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/feed");
  return data as CommentRow;
}

export async function deleteComment(commentId: string) {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/feed");
}
