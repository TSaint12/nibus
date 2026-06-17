import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";

export default async function Home() {
  // Logged-in users go straight to their library.
  if (await getUser()) redirect("/library");

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-24">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-bold tracking-tight">Nibus</h1>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
          A log and social layer for the big books on your shelf — omnibuses,
          compendiums, and absolutes.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
