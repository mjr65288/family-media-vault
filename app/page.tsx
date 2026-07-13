import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

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
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-5xl justify-end px-6 pt-6">
        <ThemeToggle />
      </div>
      <section className="mx-auto flex min-h-[calc(100vh-4.25rem)] w-full max-w-5xl flex-col justify-center px-6 pb-16">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
            Family Media Vault
          </p>
          <h1 className="mt-5 text-5xl font-semibold leading-tight sm:text-6xl">
            Private albums for the people who were there.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            Create a family space, invite relatives, and start organizing photos
            and videos into shared albums.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 px-6 text-sm">
              <Link href="/register">Create account</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 px-6 text-sm"
            >
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
