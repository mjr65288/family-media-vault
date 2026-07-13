"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";

/**
 * Admin-only "delete family" control. Confirms via `ConfirmDialog` since
 * this is destructive and cascades to every album/media under the family.
 */
export function DeleteFamilyButton({
  familyId,
  familyName,
}: {
  familyId: string;
  familyName: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function onDelete() {
    setError("");
    setIsDeleting(true);

    const response = await fetch(`/api/families/${familyId}`, {
      method: "DELETE",
    });

    setIsDeleting(false);
    setShowConfirm(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Something went wrong.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="h-10 cursor-pointer rounded-md border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100"
      >
        Delete family
      </button>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      <ConfirmDialog
        open={showConfirm}
        title={`Delete "${familyName}"?`}
        description="This permanently deletes all its albums and media. This cannot be undone."
        confirmLabel="Delete family"
        isPending={isDeleting}
        onConfirm={() => void onDelete()}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
