import { AuthForm } from "@/components/auth/AuthForm";
import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SignupPage() {
  if (await getUser()) redirect("/library");

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mb-6 text-sm text-zinc-500">
          Start logging the omnibuses on your shelf.
        </p>
        <AuthForm mode="signup" />
      </div>
    </div>
  );
}
