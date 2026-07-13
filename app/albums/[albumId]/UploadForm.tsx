"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Client-side pre-check mirrors the server caps for fast UX feedback; the
// server remains authoritative.
const MAX_PHOTO_BYTES = 15 * 1024 * 1024; // 15 MB
const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200 MB

/**
 * Media upload form for a single album. Validates file presence and size
 * client-side for immediate feedback; the server route re-validates
 * authoritatively before writing anything.
 */
export function UploadForm({ albumId }: { albumId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      setError("Please choose a file to upload.");
      return;
    }

    const maxBytes = file.type.startsWith("video/")
      ? MAX_VIDEO_BYTES
      : MAX_PHOTO_BYTES;

    if (file.size > maxBytes) {
      setError("File exceeds the maximum upload size.");
      return;
    }

    setIsUploading(true);

    // Do NOT set Content-Type — the browser sets the multipart boundary
    // automatically.
    const response = await fetch(`/api/albums/${albumId}/media`, {
      method: "POST",
      body: formData,
    });

    setIsUploading(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Something went wrong.");
      return;
    }

    form.reset();
    router.refresh();
  }

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="rounded-lg border border-border bg-card p-5 shadow-sm"
    >
      <h2 className="text-lg font-semibold">Upload media</h2>
      <div className="mt-5 space-y-2">
        <Label htmlFor="media-file">Photo or video</Label>
        <Input
          id="media-file"
          name="file"
          type="file"
          accept="image/*,video/*"
          required
          className="h-auto file:mr-4 file:h-8 file:rounded-md file:border-0 file:bg-primary file:px-3 file:text-sm file:font-semibold file:text-primary-foreground"
        />
      </div>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={isUploading} className="mt-5 h-11 w-full text-sm">
        {isUploading ? "Uploading..." : "Upload"}
      </Button>
    </form>
  );
}
