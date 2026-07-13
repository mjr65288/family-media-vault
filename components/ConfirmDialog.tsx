"use client";

import { useEffect, useRef } from "react";

/**
 * Reusable destructive-action confirmation modal, built on the native
 * `<dialog>` element (focus trap, Escape-to-close, and the backdrop all
 * come for free — no extra dependency or portal logic needed).
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  isPending,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      onCancel={onCancel}
      className="fixed inset-0 m-auto h-fit w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-xl backdrop:bg-zinc-950/50"
    >
      <h2 className="text-lg font-semibold text-zinc-950">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-600">
        {description}
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="h-10 cursor-pointer rounded-md border border-zinc-300 px-4 text-sm font-semibold text-zinc-900 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          className="h-10 cursor-pointer rounded-md bg-red-700 px-4 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Deleting..." : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
