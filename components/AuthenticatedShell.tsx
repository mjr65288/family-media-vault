import Link from "next/link";

import { MobileNav } from "@/components/MobileNav";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV_LINKS = [{ href: "/dashboard", label: "Dashboard" }];

/**
 * Shared header/nav for authenticated pages (dashboard, album detail).
 * Server Component — only `MobileNav` needs client state for the Sheet.
 * Not wired into the root layout: `/`, `/login`, `/register` are
 * unauthenticated and shouldn't show this nav.
 */
export function AuthenticatedShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
          <Link href="/dashboard" className="text-sm font-semibold text-foreground">
            Family Media Vault
          </Link>
          <div className="flex items-center gap-2">
            <nav className="hidden gap-4 sm:flex">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center text-sm font-medium text-muted-foreground transition hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <ThemeToggle />
            <MobileNav links={NAV_LINKS} />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
