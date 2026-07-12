import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { requireFamilyMembership } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { putFile } from "@/lib/storage";

// Route Handlers use fs/streams (via lib/storage) so they require the Node
// runtime — the Edge runtime has no fs access.
export const runtime = "nodejs";

// Single-process buffered-upload safe limits; raise only alongside
// streaming multipart parsing + object storage. request.formData()
// buffers the whole file into memory, so these caps bound the per-request
// memory footprint.
const MAX_PHOTO_BYTES = 15 * 1024 * 1024; // 15 MB
const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200 MB
// Early Content-Length gate, used before we know the file's type.
const MAX_UPLOAD_BYTES = MAX_VIDEO_BYTES;

const PHOTO_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

/**
 * Uploads a Photo or Video into an Album via multipart form data.
 *
 * Requires an authenticated session and membership (any role) in the
 * album's owning family. Stores the file via lib/storage.ts and persists
 * the returned opaque key as Media.fileUrl.
 *
 * Status codes: 401 unauthenticated, 404 album doesn't exist, 403 exists
 * but requester isn't a member of its family, 413 file too large,
 * 415 unsupported MIME type, 400 missing/invalid form data, 201 created.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ albumId: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { albumId } = await params;

  const album = await prisma.album.findUnique({
    where: { id: albumId },
    select: { id: true, familyId: true },
  });

  if (!album) {
    // 404 (doesn't exist) vs. 403 (exists, not a member) — see
    // MembershipResult convention in lib/auth-helpers.ts.
    return NextResponse.json({ error: "Album not found" }, { status: 404 });
  }

  const membership = await requireFamilyMembership(userId, album.familyId);

  if (membership.status === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Membership is verified BEFORE reading the request body (formData()
  // below) — non-members are rejected before we spend any effort parsing
  // or buffering an upload we'd just discard.

  // Content-Length pre-check BEFORE buffering the body — the primary
  // shield against memory exhaustion, since Route Handlers enforce no
  // built-in body cap. Content-Length is client-controllable/absent for
  // chunked encoding, so it is a hint, not a guarantee; the real
  // enforcement is the post-parse file.size check below.
  const contentLength = Number(req.headers.get("content-length"));

  if (!contentLength || contentLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "File exceeds the maximum upload size" },
      { status: 413 }
    );
  }

  let form: FormData;

  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "A file is required" }, { status: 400 });
  }

  let mediaType: "PHOTO" | "VIDEO";

  if (PHOTO_MIME_TYPES.has(file.type)) {
    mediaType = "PHOTO";
  } else if (VIDEO_MIME_TYPES.has(file.type)) {
    mediaType = "VIDEO";
  } else {
    return NextResponse.json(
      { error: "Unsupported file type" },
      { status: 415 }
    );
  }

  const maxBytes = mediaType === "PHOTO" ? MAX_PHOTO_BYTES : MAX_VIDEO_BYTES;

  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: "File exceeds the maximum upload size" },
      { status: 413 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const { key } = await putFile(bytes, {
    type: mediaType,
    mime: file.type,
    size: file.size,
  });

  const media = await prisma.media.create({
    data: {
      fileUrl: key,
      thumbUrl: null,
      type: mediaType,
      albumId: album.id,
      uploadedById: userId,
    },
    select: { id: true, type: true, thumbUrl: true, createdAt: true },
  });

  return NextResponse.json(media, { status: 201 });
}
