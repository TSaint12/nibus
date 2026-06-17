import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FeedEvent, type FeedEventRow } from "@/components/feed/FeedEvent";
import { getInteractions } from "@/lib/interactions";

export default async function FeedPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Activity is publicly readable (public profiles), so the feed must scope
  // itself: self + followed users, filtered explicitly in the query. This is
  // what keeps the feed personal rather than a global firehose.
  const { data: follows } = await supabase
    .from("follows")
    .select("followee_id")
    .eq("follower_id", user.id);
  const authorIds = [user.id, ...(follows ?? []).map((f) => f.followee_id)];

  // FK column hints (!book_id / !user_id) are required: reactions and comments
  // also join activity_events↔users, so an un-hinted embed is ambiguous.
  const { data: events } = await supabase
    .from("activity_events")
    .select("*, book:books!book_id(*), user:users!user_id(*)")
    .in("user_id", authorIds)
    .order("created_at", { ascending: false })
    .limit(50);

  const feed = (events ?? []) as FeedEventRow[];
  const interactions = await getInteractions(
    supabase,
    feed.map((e) => e.id),
    user.id
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Feed</h1>
        <p className="text-sm text-zinc-500">Reading activity from you and people you follow</p>
      </header>

      {feed.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
          Your feed is quiet. Start a reading session from your{" "}
          <Link href="/library" className="underline underline-offset-2">
            Library
          </Link>{" "}
          to log activity here.
        </p>
      ) : (
        <div>
          {feed.map((event) => (
            <FeedEvent
              key={event.id}
              event={event}
              currentUserId={user.id}
              interactions={interactions.get(event.id)!}
            />
          ))}
        </div>
      )}
    </div>
  );
}
