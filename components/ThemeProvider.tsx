"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ComponentProps } from "react";

/**
 * Thin wrapper so app/layout.tsx (a Server Component) can render a client
 * provider without itself becoming "use client". attribute="class" matches
 * the `.dark { ... }` selector shadcn already wrote into globals.css.
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
