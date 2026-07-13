"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * Admin-only "delete album" control. Confirms via shadcn's AlertDialog
 * since this permanently removes every media item in the album, then
 * redirects back to the dashboard on success (the album page would
 * otherwise 404 on refresh).
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
      <Button
        type="button"
        variant="destructive"
        onClick={() => setShowConfirm(true)}
        className="h-11 text-sm"
      >
        Delete album
      </Button>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{albumTitle}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes all its media. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="h-11">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={() => void onDelete()}
              className="h-11"
            >
              {isDeleting ? "Deleting..." : "Delete album"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
