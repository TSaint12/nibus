"use client";

import { useState, useTransition } from "react";
import { followUser, unfollowUser } from "@/app/people/actions";

/** Optimistic follow/unfollow toggle. Server (RLS) is source of truth. */
export function FollowButton({
  targetId,
  targetHandle,
  initialFollowing,
  size = "md",
}: {
  targetId: string;
  targetHandle: string;
  initialFollowing: boolean;
  size?: "sm" | "md";
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [hovering, setHovering] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !following;
    setFollowing(next);
    startTransition(() =>
      next
        ? followUser(targetId, targetHandle)
        : unfollowUser(targetId, targetHandle)
    );
  }

  const pad = size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm";

  // When already following, the button shows "Following" but flips to a red
  // "Unfollow" on hover so the destructive action reads clearly.
  const label = following ? (hovering ? "Unfollow" : "Following") : "Follow";

  return (
    <button
      type="button"
      onClick={toggle}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      disabled={pending}
      aria-pressed={following}
      className={
        "rounded-full font-medium transition disabled:opacity-50 " +
        pad +
        " " +
        (following
          ? hovering
            ? "bg-red-50 text-red-600 ring-1 ring-red-300 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-500/40"
            : "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700"
          : "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300")
      }
    >
      {label}
    </button>
  );
}
