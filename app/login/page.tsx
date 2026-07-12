import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-12 text-zinc-950">
      <div className="mx-auto grid min-h-[calc(100vh-6rem)] w-full max-w-5xl items-center gap-12 md:grid-cols-[1fr_420px]">
        <section>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">
            Welcome back
          </p>
          <h1 className="mt-4 max-w-xl text-4xl font-semibold leading-tight">
            Pick up where your family albums left off.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-zinc-600">
            Sign in to create family spaces, join an invite, and manage shared
            albums.
          </p>
        </section>
        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold">Sign in</h2>
          <div className="mt-6">
            <LoginForm />
          </div>
        </section>
      </div>
    </main>
  );
}
