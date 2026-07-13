"use client";

import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

/**
 * Signs the current user out and sends them to the login page. Kept as its
 * own client component so the surrounding dashboard header can stay a
 * server component.
 */
export function SignOutButton() {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="h-11 text-sm"
    >
      Sign out
    </Button>
  );
}
