"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * App-wide error boundary. Next.js requires this to be a Client Component.
 * The thrown error is logged for debugging but never shown to the user —
 * its message or digest could leak internal details.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="max-w-md text-center">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
          Family Media Vault
        </p>
        <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl">
          Something went wrong
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          An unexpected error occurred. You can try again, or head back home.
        </p>
        <div className="mt-10 flex justify-center">
          <Button size="lg" className="h-12 px-6 text-sm" onClick={reset}>
            Try again
          </Button>
        </div>
      </div>
    </main>
  );
}
