import type { createClient } from "@/lib/supabase/server";
import type { Comment, User } from "@/lib/database.types";

export type CommentRow = Comment & { user: User };

export type EventInteractions = {
  likeCount: number;
  likedByMe: boolean;
  comments: CommentRow[];
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Fetches like counts + comment threads for a set of activity events in two
 * queries, keyed by event id. Used by both the feed and profile pages so each
 * FeedEvent can render its own reactions/comments. Reactions/comments are
 * publicly readable (migration 0003).
 */
export async function getInteractions(
  supabase: SupabaseServerClient,
  eventIds: string[],
  currentUserId: string
): Promise<Map<string, EventInteractions>> {
  const map = new Map<string, EventInteractions>();
  for (const id of eventIds) {
    map.set(id, { likeCount: 0, likedByMe: false, comments: [] });
  }
  if (eventIds.length === 0) return map;

  const [{ data: reactions }, { data: comments }] = await Promise.all([
    supabase.from("reactions").select("event_id, user_id").in("event_id", eventIds),
    supabase
      .from("comments")
      .select("*, user:users!user_id(*)")
      .in("event_id", eventIds)
      .order("created_at", { ascending: true }),
  ]);

  for (const r of reactions ?? []) {
    const entry = map.get(r.event_id);
    if (!entry) continue;
    entry.likeCount++;
    if (r.user_id === currentUserId) entry.likedByMe = true;
  }

  for (const c of (comments ?? []) as CommentRow[]) {
    map.get(c.event_id)?.comments.push(c);
  }

  return map;
}
