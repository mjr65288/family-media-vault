import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LoginForm } from "./LoginForm";

/**
 * Login route. Server component checks the session first so a signed-in
 * user is bounced straight to the dashboard instead of seeing the form
 * (also prevents re-submitting credentials while already authenticated).
 */
export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground">
      <div className="mx-auto flex w-full max-w-5xl justify-end">
        <ThemeToggle />
      </div>
      <div className="mx-auto grid min-h-[calc(100vh-9.5rem)] w-full max-w-5xl items-center gap-12 md:grid-cols-[1fr_420px]">
        <section>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
            Welcome back
          </p>
          <h1 className="mt-4 max-w-xl text-4xl font-semibold leading-tight">
            Pick up where your family albums left off.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground">
            Sign in to create family spaces, join an invite, and manage shared
            albums.
          </p>
        </section>
        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="text-2xl font-semibold">Sign in</h2>
          <div className="mt-6">
            <LoginForm />
          </div>
        </section>
      </div>
    </main>
  );
}
