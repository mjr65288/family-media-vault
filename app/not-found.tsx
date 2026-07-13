import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * App-wide 404 page. Next.js automatically renders this for any unmatched
 * route or explicit `notFound()` call.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="max-w-md text-center">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
          Family Media Vault
        </p>
        <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl">
          Page not found
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or may have been
          moved.
        </p>
        <div className="mt-10 flex justify-center">
          <Button asChild size="lg" className="h-12 px-6 text-sm">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
