"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Client-side form for updating the signed-in user's display name via
 * `PATCH /api/user`.
 */
export function ChangeNameForm({ currentName }: { currentName: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess(false);
    setPending(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const response = await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: String(formData.get("name") ?? "") }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(payload?.error ?? "Unable to update name.");
      setPending(false);
      return;
    }

    setPending(false);
    setSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          maxLength={100}
          defaultValue={currentName}
          className="h-12 text-base"
        />
      </div>
      {error ? (
        <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary">
          Name updated.
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="h-12 w-full text-sm">
        {pending ? "Saving..." : "Save name"}
      </Button>
    </form>
  );
}
