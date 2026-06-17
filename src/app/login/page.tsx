import { AuthForm } from "@/components/auth/AuthForm";
import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await getUser()) redirect("/library");
  const { next } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mb-6 text-sm text-zinc-500">Sign in to your Nibus library.</p>
        <AuthForm mode="login" next={next} />
      </div>
    </div>
  );
}
