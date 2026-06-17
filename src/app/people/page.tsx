import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PeopleList, type PersonRow } from "@/components/follow/PeopleList";
import type { User } from "@/lib/database.types";

export default async function PeoplePage() {
  const user = await requireUser();
  const supabase = await createClient();

  // All other users (profiles are public) + who the current user already follows.
  const [{ data: users }, { data: follows }] = await Promise.all([
    supabase.from("users").select("id, handle, name, bio").neq("id", user.id).order("name"),
    supabase.from("follows").select("followee_id").eq("follower_id", user.id),
  ]);

  const followingIds = new Set((follows ?? []).map((f) => f.followee_id));
  const people: PersonRow[] = ((users ?? []) as Pick<User, "id" | "handle" | "name" | "bio">[]).map(
    (u) => ({ ...u, following: followingIds.has(u.id) })
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">People</h1>
        <p className="text-sm text-zinc-500">Find readers to follow</p>
      </header>

      {people.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No one else is here yet.
        </p>
      ) : (
        <PeopleList people={people} />
      )}
    </div>
  );
}
