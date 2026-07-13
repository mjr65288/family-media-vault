"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";

/**
 * Admin-only "delete album" control. Confirms via `ConfirmDialog` since
 * this permanently removes every media item in the album, then redirects
 * back to the dashboard on success (the album page would otherwise 404 on
 * refresh).
 */
export function DeleteAlbumButton({
  albumId,
  albumTitle,
}: {
  albumId: string;
  albumTitle: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function onDelete() {
    setError("");
    setIsDeleting(true);

    const response = await fetch(`/api/albums/${albumId}`, {
      method: "DELETE",
    });

    setIsDeleting(false);

    if (!response.ok) {
      setShowConfirm(false);
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Something went wrong.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="h-10 cursor-pointer rounded-md border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100"
      >
        Delete album
      </button>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      <ConfirmDialog
        open={showConfirm}
        title={`Delete "${albumTitle}"?`}
        description="This permanently deletes all its media. This cannot be undone."
        confirmLabel="Delete album"
        isPending={isDeleting}
        onConfirm={() => void onDelete()}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
