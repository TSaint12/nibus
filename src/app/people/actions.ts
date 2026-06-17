"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Follow graph mutations. RLS ("Users can manage own follows") already scopes
 * writes to rows where follower_id = auth.uid(); requireUser is the app-layer
 * guard. Following someone makes their activity_events visible to you (via the
 * "Events visible to self and followers" policy), so the feed fills out for free.
 *
 * `targetHandle` is passed only so we can revalidate that profile's path.
 */

export async function followUser(targetId: string, targetHandle: string) {
  const user = await requireUser();
  if (user.id === targetId) throw new Error("You can't follow yourself.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("follows")
    .upsert(
      { follower_id: user.id, followee_id: targetId },
      { onConflict: "follower_id,followee_id", ignoreDuplicates: true }
    );

  if (error) throw new Error(error.message);
  revalidatePaths(targetHandle);
}

export async function unfollowUser(targetId: string, targetHandle: string) {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("followee_id", targetId);

  if (error) throw new Error(error.message);
  revalidatePaths(targetHandle);
}

function revalidatePaths(targetHandle: string) {
  revalidatePath("/people");
  revalidatePath("/feed");
  revalidatePath(`/u/${targetHandle}`);
}
