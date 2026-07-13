import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { RegisterForm } from "./RegisterForm";

/**
 * Registration route. Server component checks the session first so an
 * already-authenticated user is redirected to the dashboard instead of
 * being shown the sign-up form again.
 */
export default async function RegisterPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground">
      <div className="mx-auto grid min-h-[calc(100vh-6rem)] w-full max-w-5xl items-center gap-12 md:grid-cols-[1fr_420px]">
        <section>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
            Start the vault
          </p>
          <h1 className="mt-4 max-w-xl text-4xl font-semibold leading-tight">
            Create a private family space in a minute.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground">
            Your account is the identity Auth.js uses to issue the session
            cookie that protects the dashboard and API routes.
          </p>
        </section>
        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="text-2xl font-semibold">Create account</h2>
          <div className="mt-6">
            <RegisterForm />
          </div>
        </section>
      </div>
    </main>
  );
}
