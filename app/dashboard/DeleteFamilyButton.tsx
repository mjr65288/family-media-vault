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
 * Admin-only "delete family" control. Confirms via shadcn's AlertDialog
 * (built on Radix — focus trap, Escape-to-close, and centering come for
 * free) since this is destructive and cascades to every album/media under
 * the family.
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
      <Button
        type="button"
        variant="destructive"
        onClick={() => setShowConfirm(true)}
        className="h-10 text-sm"
      >
        Delete family
      </Button>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{familyName}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes all its albums and media. This cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={() => void onDelete()}
            >
              {isDeleting ? "Deleting..." : "Delete family"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
