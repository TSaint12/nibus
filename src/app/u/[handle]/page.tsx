import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FollowButton } from "@/components/follow/FollowButton";
import { FeedEvent, type FeedEventRow } from "@/components/feed/FeedEvent";
import { getInteractions } from "@/lib/interactions";
import type { User } from "@/lib/database.types";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const me = await requireUser();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("handle", handle)
    .maybeSingle<User>();

  if (!profile) notFound();

  const isMe = profile.id === me.id;

  // Follow state + follower/following counts. Counts use head requests.
  const [{ data: followRow }, { count: followers }, { count: following }] =
    await Promise.all([
      isMe
        ? Promise.resolve({ data: null })
        : supabase
            .from("follows")
            .select("follower_id")
            .eq("follower_id", me.id)
            .eq("followee_id", profile.id)
            .maybeSingle(),
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("followee_id", profile.id),
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profile.id),
    ]);

  const isFollowing = Boolean(followRow);

  // Profiles are public — anyone can see a user's activity (RLS allows it).
  const { data: events } = await supabase
    .from("activity_events")
    .select("*, book:books!book_id(*), user:users!user_id(*)")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const activity = (events ?? []) as FeedEventRow[];
  const interactions = await getInteractions(
    supabase,
    activity.map((e) => e.id),
    me.id
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xl font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
          {profile.name.slice(0, 1).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-tight">{profile.name}</h1>
              <p className="text-sm text-zinc-500">@{profile.handle}</p>
            </div>
            {!isMe && (
              <FollowButton
                targetId={profile.id}
                targetHandle={profile.handle}
                initialFollowing={isFollowing}
              />
            )}
          </div>

          {profile.bio && (
            <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{profile.bio}</p>
          )}

          <div className="mt-3 flex gap-4 text-sm">
            <span>
              <span className="font-semibold tabular-nums">{followers ?? 0}</span>{" "}
              <span className="text-zinc-500">followers</span>
            </span>
            <span>
              <span className="font-semibold tabular-nums">{following ?? 0}</span>{" "}
              <span className="text-zinc-500">following</span>
            </span>
          </div>
        </div>
      </header>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        {isMe ? "Your activity" : "Activity"}
      </h2>

      {activity.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No reading activity yet.
        </p>
      ) : (
        <div>
          {activity.map((event) => (
            <FeedEvent
              key={event.id}
              event={event}
              currentUserId={me.id}
              interactions={interactions.get(event.id)!}
            />
          ))}
        </div>
      )}
    </div>
  );
}
