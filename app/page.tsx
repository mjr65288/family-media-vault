import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";

/**
 * Public marketing landing page. Renders as a server component so the
 * session check and redirect happen before any HTML reaches the client,
 * avoiding a flash of the marketing page for already-authenticated users.
 */
export default async function Home() {
  const session = await auth();

  // Already-authenticated visitors have no reason to see the marketing page.
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-950">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">
            Family Media Vault
          </p>
          <h1 className="mt-5 text-5xl font-semibold leading-tight sm:text-6xl">
            Private albums for the people who were there.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600">
            Create a family space, invite relatives, and start organizing photos
            and videos into shared albums.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex h-12 items-center justify-center rounded-md bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Create account
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-md border border-zinc-300 px-6 text-sm font-semibold text-zinc-900 transition hover:border-zinc-500"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
