"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Light/dark toggle. Cycles between "light" and "dark" (skips "system" —
 * one click, one predictable result). Renders a size-matched placeholder
 * until mounted since next-themes can't know the resolved theme during SSR
 * (would otherwise flash the wrong icon).
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // next-themes' documented hydration-safe pattern: resolvedTheme is
    // unknown during SSR, so the real icon can only render after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-11 w-11" aria-hidden />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-11 w-11"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
      <span className="sr-only">
        Switch to {isDark ? "light" : "dark"} theme
      </span>
    </Button>
  );
}
