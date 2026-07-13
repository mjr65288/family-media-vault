"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Inline "create album" form shown on a family card. Only rendered for
 * ADMIN members (the API also enforces this — see POST /api/albums).
 */
export function CreateAlbumForm({ familyId }: { familyId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Captured synchronously — event.currentTarget is null once the event
    // finishes dispatching, so it must be grabbed before any `await`.
    const form = event.currentTarget;
    setError("");
    setIsCreating(true);

    const formData = new FormData(form);
    const title = String(formData.get("title") ?? "");

    const response = await fetch("/api/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, familyId }),
    });

    setIsCreating(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Something went wrong.");
      return;
    }

    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="mt-5">
      <div className="flex gap-2">
        <label htmlFor={`album-title-${familyId}`} className="sr-only">
          New album title
        </label>
        <Input
          id={`album-title-${familyId}`}
          name="title"
          required
          maxLength={100}
          placeholder="New album name"
          className="h-10 flex-1 text-sm"
        />
        <Button
          type="submit"
          disabled={isCreating}
          className="h-10 shrink-0 text-sm"
        >
          {isCreating ? "Creating..." : "Create album"}
        </Button>
      </div>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
