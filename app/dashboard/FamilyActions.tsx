"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

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

    event.currentTarget.reset();
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
        className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-lg font-semibold">Create a family</h2>
        <label htmlFor="family-name" className="mt-5 block text-sm font-medium">
          Family name
        </label>
        <input
          id="family-name"
          name="name"
          required
          maxLength={100}
          className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 outline-none transition focus:border-teal-700 focus:ring-4 focus:ring-teal-100"
        />
        {createError ? (
          <p className="mt-3 text-sm text-red-700">{createError}</p>
        ) : null}
        <button
          type="submit"
          disabled={pendingAction !== null}
          className="mt-5 h-11 w-full rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pendingAction === "create" ? "Creating..." : "Create family"}
        </button>
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
        className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-lg font-semibold">Join with invite</h2>
        <label htmlFor="invite-code" className="mt-5 block text-sm font-medium">
          Invite code
        </label>
        <input
          id="invite-code"
          name="inviteCode"
          required
          className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 outline-none transition focus:border-teal-700 focus:ring-4 focus:ring-teal-100"
        />
        {joinError ? (
          <p className="mt-3 text-sm text-red-700">{joinError}</p>
        ) : null}
        <button
          type="submit"
          disabled={pendingAction !== null}
          className="mt-5 h-11 w-full rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pendingAction === "join" ? "Joining..." : "Join family"}
        </button>
      </form>
    </div>
  );
}
