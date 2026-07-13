"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Inline "rename family" control. Displays the family name as a heading by
 * default; clicking "Rename" swaps it for an editable Input. Enter or blur
 * (via form submit) saves; Escape cancels. Admin-only — the API also
 * enforces this.
 */
export function RenameFamilyForm({
  familyId,
  familyName,
}: {
  familyId: string;
  familyName: string;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Captured synchronously — event.currentTarget is null once the event
    // finishes dispatching, so it must be grabbed before any `await`.
    const form = event.currentTarget;
    setError("");

    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();

    if (!name || name === familyName) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);

    const response = await fetch(`/api/families/${familyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
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
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-semibold">{familyName}</h1>
        <Button
          type="button"
          variant="outline"
          className="h-11 text-sm"
          onClick={() => setIsEditing(true)}
        >
          Rename
        </Button>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={(event) => void onSubmit(event)} className="flex gap-2">
        <label htmlFor={`family-name-${familyId}`} className="sr-only">
          Family name
        </label>
        <Input
          id={`family-name-${familyId}`}
          name="name"
          required
          maxLength={100}
          autoFocus
          defaultValue={familyName}
          disabled={isSaving}
          className="h-11 max-w-sm text-lg font-semibold"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsEditing(false);
            }
          }}
          onBlur={(event) => event.currentTarget.form?.requestSubmit()}
        />
        <Button
          type="submit"
          disabled={isSaving}
          className="h-11 shrink-0 text-sm"
        >
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </form>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
