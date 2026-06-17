import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { User as DbUser } from "@/lib/database.types";

/** Returns the authenticated Supabase auth user, or null. */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Like getUser, but redirects to /login if there is no session. */
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

/** Fetches the public profile row (handle/name/etc.) for the current user. */
export async function getProfile(): Promise<DbUser | null> {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();
  return data as DbUser | null;
}
