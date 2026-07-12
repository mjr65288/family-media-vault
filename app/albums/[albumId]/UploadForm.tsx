"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

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
      className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
    >
      <h2 className="text-lg font-semibold">Upload media</h2>
      <label htmlFor="media-file" className="mt-5 block text-sm font-medium">
        Photo or video
      </label>
      <input
        id="media-file"
        name="file"
        type="file"
        accept="image/*,video/*"
        required
        className="mt-2 block w-full text-sm text-zinc-700 file:mr-4 file:rounded-md file:border-0 file:bg-zinc-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
      />
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={isUploading}
        className="mt-5 h-11 w-full rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isUploading ? "Uploading..." : "Upload"}
      </button>
    </form>
  );
}
