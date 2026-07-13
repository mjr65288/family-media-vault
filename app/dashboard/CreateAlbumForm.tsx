"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

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
        <input
          id={`album-title-${familyId}`}
          name="title"
          required
          maxLength={100}
          placeholder="New album name"
          className="h-10 flex-1 rounded-md border border-zinc-300 px-3 text-sm outline-none transition focus:border-teal-700 focus:ring-4 focus:ring-teal-100"
        />
        <button
          type="submit"
          disabled={isCreating}
          className="h-10 shrink-0 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCreating ? "Creating..." : "Create album"}
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
    </form>
  );
}
