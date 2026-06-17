"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { CommentRow } from "@/lib/interactions";
import { timeAgo } from "@/lib/time";
import { toggleReaction, addComment, deleteComment } from "@/app/feed/actions";

/**
 * Like + comment controls for one feed event. Optimistic: like flips instantly,
 * comments append on server confirm. Server (RLS) is source of truth.
 */
export function EventInteractions({
  eventId,
  currentUserId,
  initialLikeCount,
  initialLikedByMe,
  initialComments,
}: {
  eventId: string;
  currentUserId: string;
  initialLikeCount: number;
  initialLikedByMe: boolean;
  initialComments: CommentRow[];
}) {
  const [liked, setLiked] = useState(initialLikedByMe);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [comments, setComments] = useState<CommentRow[]>(initialComments);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, startPosting] = useTransition();
  const [, startLike] = useTransition();

  function like() {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    startLike(async () => {
      try {
        await toggleReaction(eventId);
      } catch {
        // Roll back on failure.
        setLiked(!next);
        setLikeCount((c) => c + (next ? -1 : 1));
      }
    });
  }

  function post() {
    const text = draft.trim();
    if (!text) return;
    startPosting(async () => {
      const created = await addComment(eventId, text);
      setComments((cs) => [...cs, created]);
      setDraft("");
    });
  }

  function remove(id: string) {
    const prev = comments;
    setComments((cs) => cs.filter((c) => c.id !== id));
    startPosting(async () => {
      try {
        await deleteComment(id);
      } catch {
        setComments(prev);
      }
    });
  }

  return (
    <div className="mt-1.5">
      <div className="flex items-center gap-4 text-xs text-zinc-500">
        <button
          type="button"
          onClick={like}
          aria-pressed={liked}
          className={
            "flex items-center gap-1 transition hover:text-red-500 " +
            (liked ? "text-red-500" : "")
          }
        >
          <Heart filled={liked} />
          {likeCount > 0 && <span className="tabular-nums">{likeCount}</span>}
        </button>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 transition hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          <Bubble />
          {comments.length > 0 ? (
            <span className="tabular-nums">{comments.length}</span>
          ) : (
            <span>Comment</span>
          )}
        </button>
      </div>

      {open && (
        <div className="mt-2 flex flex-col gap-2">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2 text-sm">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/u/${c.user.handle}`}
                  className="font-medium hover:underline"
                >
                  {c.user.name}
                </Link>{" "}
                <span className="text-zinc-700 dark:text-zinc-300">{c.text}</span>
                <span className="ml-1.5 text-xs text-zinc-400">{timeAgo(c.created_at)}</span>
              </div>
              {c.user_id === currentUserId && (
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  className="shrink-0 text-xs text-zinc-400 hover:text-red-500"
                  aria-label="Delete comment"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          <div className="flex items-start gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) post();
              }}
              rows={1}
              placeholder="Add a comment…"
              className="min-h-[2.25rem] w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400"
            />
            <button
              type="button"
              onClick={post}
              disabled={posting || !draft.trim()}
              className="shrink-0 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Post
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function Bubble() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}
