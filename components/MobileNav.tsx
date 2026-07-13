"use client";

import Link from "next/link";
import { MenuIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * Hamburger + slide-in Sheet shown below the `sm` breakpoint. The
 * horizontal nav in AuthenticatedShell handles `sm:` and up — this is the
 * only piece of the shell that needs client-side state (Sheet open/close),
 * so it stays a small leaf rather than making the whole shell a client
 * component.
 */
export function MobileNav({
  links,
}: {
  links: { href: string; label: string }[];
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-11 w-11 sm:hidden">
          <MenuIcon />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>Family Media Vault</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4">
          {links.map((link) => (
            <SheetClose key={link.href} asChild>
              <Link
                href={link.href}
                className="flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-foreground transition hover:bg-accent"
              >
                {link.label}
              </Link>
            </SheetClose>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
