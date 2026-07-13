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

type Member = {
  id: string;
  role: "ADMIN" | "MEMBER";
  user: { id: string; name: string; email: string };
};

/**
 * Renders the family's member list with name/email/role, and (admin-only,
 * not-self, not-the-last-admin) a "Remove" control per row. Server Component
 * for the list itself; the remove action is a small client leaf, same split
 * pattern as DeleteFamilyButton.
 */
export function MemberList({
  familyId,
  members,
  currentUserId,
  isAdmin,
}: {
  familyId: string;
  members: Member[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const adminCount = members.filter((member) => member.role === "ADMIN").length;

  return (
    <ul className="flex flex-col gap-3">
      {members.map((member) => {
        const isSelf = member.user.id === currentUserId;
        const isLastAdmin = member.role === "ADMIN" && adminCount <= 1;
        const canRemove = isAdmin && !isSelf && !isLastAdmin;

        return (
          <li
            key={member.id}
            className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">
                {member.user.name}
                {isSelf ? (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    (you)
                  </span>
                ) : null}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {member.user.email}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {member.role}
              </span>
              {canRemove ? (
                <RemoveMemberButton
                  familyId={familyId}
                  userId={member.user.id}
                  userName={member.user.name}
                />
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function RemoveMemberButton({
  familyId,
  userId,
  userName,
}: {
  familyId: string;
  userId: string;
  userName: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isRemoving, setIsRemoving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function onRemove() {
    setError("");
    setIsRemoving(true);

    const response = await fetch(
      `/api/families/${familyId}/members/${userId}`,
      { method: "DELETE" }
    );

    setIsRemoving(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Something went wrong.");
      return;
    }

    setShowConfirm(false);
    router.refresh();
  }

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        onClick={() => setShowConfirm(true)}
        className="h-11 text-sm"
      >
        Remove
      </Button>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove &quot;{userName}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes them from the family. They will lose access to all
              its albums and media.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving} className="h-11">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isRemoving}
              onClick={() => void onRemove()}
              className="h-11"
            >
              {isRemoving ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
