import Link from "next/link";
import type { ActivityEvent, Book, User } from "@/lib/database.types";
import { BookCover } from "@/components/library/BookCover";
import { StarRating } from "@/components/library/StarRating";
import { EventInteractions } from "./EventInteractions";
import { timeAgo } from "@/lib/time";
import type { EventInteractions as Interactions } from "@/lib/interactions";

export type FeedEventRow = ActivityEvent & {
  book: Book;
  user: User;
};

/** A single activity card in the feed. The static card renders on the server;
 *  the like/comment controls are a client island (EventInteractions). The event
 *  lifecycle that produces these lives in src/app/reading/actions.ts. */
export function FeedEvent({
  event,
  currentUserId,
  interactions,
}: {
  event: FeedEventRow;
  currentUserId: string;
  interactions: Interactions;
}) {
  const { user, book, payload } = event;
  const total = payload?.total_pages ?? book.pages ?? null;
  const current = payload?.current_page ?? null;
  const pct =
    total && current != null ? Math.round((current / total) * 100) : null;

  return (
    <article className="flex gap-3 border-b border-zinc-200 py-4 dark:border-zinc-800">
      <BookCover book={book} width={48} />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
          <Link href={`/u/${user.handle}`} className="font-semibold hover:underline">
            {user.name}
          </Link>
          <Link href={`/u/${user.handle}`} className="text-zinc-400 hover:underline">
            @{user.handle}
          </Link>
          <span className="text-zinc-300 dark:text-zinc-600">·</span>
          <span className="text-zinc-400">{timeAgo(event.created_at)}</span>
        </div>

        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          {verb(event.type)}{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {book.title}
            {book.volume ? ` · Vol. ${book.volume}` : ""}
          </span>
        </p>

        {event.type === "progress_update" && current != null && (
          <p className="text-xs text-zinc-500">
            Page {current.toLocaleString()}
            {total ? ` of ${total.toLocaleString()}` : ""}
            {pct != null ? ` · ${pct}%` : ""}
          </p>
        )}

        {event.type === "finished" && (
          <div className="mt-0.5 flex flex-col gap-1">
            {payload?.rating != null && (
              <StarRating value={payload.rating} readOnly size={16} />
            )}
            {payload?.review && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                “{payload.review}”
              </p>
            )}
          </div>
        )}

        <EventInteractions
          eventId={event.id}
          currentUserId={currentUserId}
          initialLikeCount={interactions.likeCount}
          initialLikedByMe={interactions.likedByMe}
          initialComments={interactions.comments}
        />
      </div>
    </article>
  );
}

function verb(type: ActivityEvent["type"]): string {
  switch (type) {
    case "started_reading":
      return "started reading";
    case "progress_update":
      return "made progress on";
    case "finished":
      return "finished";
  }
}
