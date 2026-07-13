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
 * Admin-only "regenerate invite code" control. Confirms via shadcn's
 * AlertDialog since regenerating invalidates the old code immediately for
 * anyone still holding it — same destructive-confirm pattern as
 * DeleteFamilyButton.
 */
export function RegenerateInviteCodeButton({ familyId }: { familyId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null);

  async function onRegenerate() {
    setError("");
    setIsRegenerating(true);

    const response = await fetch(
      `/api/families/${familyId}/invite-code/regenerate`,
      { method: "POST" }
    );

    setIsRegenerating(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Something went wrong.");
      return;
    }

    const body = (await response.json()) as { inviteCode: string };
    setNewCode(body.inviteCode);
    setShowConfirm(false);
    router.refresh();
  }

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        onClick={() => setShowConfirm(true)}
        className="h-11 text-sm"
      >
        Regenerate invite code
      </Button>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      {newCode ? (
        <p className="mt-2 text-sm text-muted-foreground">
          New code generated: <span className="font-mono">{newCode}</span>
        </p>
      ) : null}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate invite code?</AlertDialogTitle>
            <AlertDialogDescription>
              The current invite code will stop working immediately. Anyone
              you shared it with will need the new one to join.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRegenerating} className="h-11">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isRegenerating}
              onClick={() => void onRegenerate()}
              className="h-11"
            >
              {isRegenerating ? "Regenerating..." : "Regenerate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
