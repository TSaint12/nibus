import Link from "next/link";
import { getProfile } from "@/lib/auth";
import { logout } from "@/app/auth/actions";
import { Logo } from "@/components/brand/Logo";

export async function Nav() {
  const profile = await getProfile();

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <nav className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
        <Link href={profile ? "/library" : "/"} aria-label="Nibus home">
          <Logo layout="horizontal" size={28} />
        </Link>

        {profile ? (
          <div className="flex items-center gap-4 text-sm">
            <Link href="/feed" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
              Feed
            </Link>
            <Link href="/search" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
              Search
            </Link>
            <Link href="/library" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
              Library
            </Link>
            <Link href="/library/tbr" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
              TBR
            </Link>
            <Link href="/people" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
              People
            </Link>
            <Link href={`/u/${profile.handle}`} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
              @{profile.handle}
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
