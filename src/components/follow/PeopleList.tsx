"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FollowButton } from "./FollowButton";

export type PersonRow = {
  id: string;
  handle: string;
  name: string;
  bio: string | null;
  following: boolean;
};

/** Searchable list of users with follow buttons. Search filters by name/handle. */
export function PeopleList({ people }: { people: PersonRow[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return people;
    return people.filter(
      (p) =>
        p.handle.toLowerCase().includes(term) ||
        p.name.toLowerCase().includes(term)
    );
  }, [q, people]);

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name or @handle"
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400"
      />

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">No people found.</p>
      ) : (
        <ul className="flex flex-col">
          {filtered.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 border-b border-zinc-200 py-3 dark:border-zinc-800"
            >
              <Link
                href={`/u/${p.handle}`}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
              >
                {p.name.slice(0, 1).toUpperCase()}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/u/${p.handle}`} className="block">
                  <div className="truncate text-sm font-medium hover:underline">{p.name}</div>
                  <div className="truncate text-xs text-zinc-500">@{p.handle}</div>
                </Link>
              </div>
              <FollowButton
                targetId={p.id}
                targetHandle={p.handle}
                initialFollowing={p.following}
                size="sm"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
