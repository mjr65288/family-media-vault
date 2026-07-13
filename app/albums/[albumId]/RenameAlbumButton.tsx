"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Admin-only inline "rename album" control. Toggles between a static title
 * display and an inline edit form; on success, refreshes the page data so
 * the new title shows immediately.
 */
export function RenameAlbumButton({
  albumId,
  albumTitle,
}: {
  albumId: string;
  albumTitle: string;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(albumTitle);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    // Capture the current input value before the first await — React nulls
    // event.currentTarget after the event finishes dispatching.
    const trimmed = title.trim();

    if (!trimmed) {
      setError("Title is required.");
      return;
    }

    setIsSaving(true);

    const response = await fetch(`/api/albums/${albumId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    });

    setIsSaving(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Something went wrong.");
      return;
    }

    setIsEditing(false);
    router.refresh();
  }

  if (!isEditing) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setTitle(albumTitle);
          setError("");
          setIsEditing(true);
        }}
        className="h-11 text-sm"
      >
        Rename album
      </Button>
    );
  }

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="flex flex-col gap-2 sm:flex-row sm:items-start"
    >
      <div>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={100}
          autoFocus
          disabled={isSaving}
          className="h-11 text-sm"
          aria-label="Album title"
        />
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isSaving} className="h-11 text-sm">
          {isSaving ? "Saving..." : "Save"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isSaving}
          onClick={() => {
            setError("");
            setIsEditing(false);
          }}
          className="h-11 text-sm"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
