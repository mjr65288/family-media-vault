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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type MediaItem = {
  id: string;
  type: "PHOTO" | "VIDEO";
  createdAt: string | Date;
};

/** Static placeholder icon shown in place of a thumbnail for video media. */
function VideoPlaceholderIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-10 w-10 text-muted-foreground"
    >
      <path
        d="M4 5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="m10 9 5 3-5 3V9Z" fill="currentColor" />
      <path d="M17 8h4M17 16h4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * Media grid + in-app lightbox for an album. Owns the "which item is open"
 * client state; the album page itself stays a Server Component and just
 * passes the fetched media array down.
 */
export function MediaGrid({
  media,
  isAdmin,
}: {
  media: MediaItem[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const openItem = openIndex !== null ? media[openIndex] : null;

  function closeLightbox() {
    setOpenIndex(null);
    setShowConfirm(false);
    setError("");
  }

  function goPrev() {
    if (openIndex === null) return;
    setOpenIndex((openIndex - 1 + media.length) % media.length);
  }

  function goNext() {
    if (openIndex === null) return;
    setOpenIndex((openIndex + 1) % media.length);
  }

  async function onDelete() {
    if (!openItem) return;

    const mediaId = openItem.id;
    setError("");
    setIsDeleting(true);

    const response = await fetch(`/api/media/${mediaId}`, {
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

    setShowConfirm(false);
    closeLightbox();
    router.refresh();
  }

  if (media.length === 0) {
    return (
      <div className="mt-5 rounded-lg border border-dashed border-border bg-card p-8 text-center">
        <h3 className="text-lg font-semibold">No media yet</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Upload a photo or video to get started.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {media.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setOpenIndex(index)}
            className="block overflow-hidden rounded-lg border border-border bg-card text-left shadow-sm"
          >
            {item.type === "PHOTO" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/media/${item.id}`}
                alt=""
                loading="lazy"
                className="aspect-square w-full object-cover"
              />
            ) : (
              <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 bg-muted">
                <VideoPlaceholderIcon />
                <span className="rounded-md bg-foreground px-2 py-0.5 text-xs font-semibold text-background">
                  VIDEO
                </span>
              </div>
            )}
            <p className="px-2 py-1 text-xs text-muted-foreground">
              {new Date(item.createdAt).toLocaleDateString()}
            </p>
          </button>
        ))}
      </div>

      <Dialog
        open={openItem !== null}
        onOpenChange={(open) => {
          if (!open) closeLightbox();
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {openItem
                ? new Date(openItem.createdAt).toLocaleString()
                : "Media"}
            </DialogTitle>
          </DialogHeader>

          {openItem ? (
            <div className="flex flex-col gap-4">
              {openItem.type === "PHOTO" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/media/${openItem.id}`}
                  alt=""
                  className="max-h-[70vh] w-full rounded-md object-contain"
                />
              ) : (
                <video
                  controls
                  src={`/api/media/${openItem.id}`}
                  className="max-h-[70vh] w-full rounded-md"
                />
              )}

              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-2">
                  {media.length > 1 ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11"
                        onClick={goPrev}
                      >
                        Previous
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11"
                        onClick={goNext}
                      >
                        Next
                      </Button>
                    </>
                  ) : null}
                </div>

                {isAdmin ? (
                  <Button
                    type="button"
                    variant="destructive"
                    className="h-11"
                    onClick={() => setShowConfirm(true)}
                  >
                    Delete
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the file. This cannot be undone.
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
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
