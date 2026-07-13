"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Dashboard controls for creating a new family or joining one via invite
 * code. Both forms share a single `pendingAction` state so only one submit
 * can be in flight at a time across the two forms.
 */
export function FamilyActions() {
  const router = useRouter();
  const [createError, setCreateError] = useState("");
  const [joinError, setJoinError] = useState("");
  const [pendingAction, setPendingAction] = useState<"create" | "join" | null>(
    null
  );

  /**
   * Shared submit handler for both forms: posts JSON to `endpoint`, resets
   * the form on success, and refreshes the router so the server-rendered
   * membership list picks up the new/joined family.
   */
  async function submitJson(
    event: FormEvent<HTMLFormElement>,
    endpoint: string,
    payload: Record<string, string>,
    errorSetter: (message: string) => void,
    action: "create" | "join"
  ) {
    event.preventDefault();
    // Captured synchronously: React nulls out event.currentTarget once the
    // event finishes dispatching, so it's gone by the time this resumes
    // after the `await` below.
    const form = event.currentTarget;
    errorSetter("");
    setPendingAction(action);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setPendingAction(null);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      errorSetter(body?.error ?? "Something went wrong.");
      return;
    }

    form.reset();
    router.refresh();
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <form
        onSubmit={(event) => {
          const formData = new FormData(event.currentTarget);
          void submitJson(
            event,
            "/api/families",
            { name: String(formData.get("name") ?? "") },
            setCreateError,
            "create"
          );
        }}
        className="rounded-lg border border-border bg-card p-5 shadow-sm"
      >
        <h2 className="text-lg font-semibold">Create a family</h2>
        <div className="mt-5 space-y-2">
          <Label htmlFor="family-name">Family name</Label>
          <Input
            id="family-name"
            name="name"
            required
            maxLength={100}
            className="h-11"
          />
        </div>
        {createError ? (
          <p className="mt-3 text-sm text-destructive">{createError}</p>
        ) : null}
        <Button
          type="submit"
          disabled={pendingAction !== null}
          className="mt-5 h-11 w-full text-sm"
        >
          {pendingAction === "create" ? "Creating..." : "Create family"}
        </Button>
      </form>

      <form
        onSubmit={(event) => {
          const formData = new FormData(event.currentTarget);
          void submitJson(
            event,
            "/api/families/join",
            { inviteCode: String(formData.get("inviteCode") ?? "") },
            setJoinError,
            "join"
          );
        }}
        className="rounded-lg border border-border bg-card p-5 shadow-sm"
      >
        <h2 className="text-lg font-semibold">Join with invite</h2>
        <div className="mt-5 space-y-2">
          <Label htmlFor="invite-code">Invite code</Label>
          <Input id="invite-code" name="inviteCode" required className="h-11" />
        </div>
        {joinError ? (
          <p className="mt-3 text-sm text-destructive">{joinError}</p>
        ) : null}
        <Button
          type="submit"
          variant="secondary"
          disabled={pendingAction !== null}
          className="mt-5 h-11 w-full text-sm"
        >
          {pendingAction === "join" ? "Joining..." : "Join family"}
        </Button>
      </form>
    </div>
  );
}
