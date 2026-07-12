import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { requireFamilyMembership } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { contentTypeForKey, getStream } from "@/lib/storage";

// Uses fs streams via lib/storage — requires the Node runtime.
export const runtime = "nodejs";

/**
 * Streams a single Media file's bytes (photo or video) by id.
 *
 * Requires an authenticated session and membership (any role) in the
 * media's owning family — this is the sole authorization boundary in front
 * of the opaque storage key in Media.fileUrl (see lib/storage.ts).
 *
 * Status codes: 401 unauthenticated, 404 media doesn't exist, 403 exists
 * but requester isn't a member of its family, 200 with streamed body.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { mediaId } = await params;

  const media = await prisma.media.findUnique({
    where: { id: mediaId },
    select: {
      id: true,
      fileUrl: true,
      album: { select: { familyId: true } },
    },
  });

  if (!media) {
    // 404 (doesn't exist) vs. 403 below (exists, not a member) — see
    // MembershipResult convention in lib/auth-helpers.ts.
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  const membership = await requireFamilyMembership(
    userId,
    media.album.familyId
  );

  if (membership.status === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Membership is confirmed BEFORE resolving/streaming the file — the
  // opaque fileUrl key alone provides no access control (see lib/storage.ts),
  // so this membership check is the actual authorization boundary.
  const { stream, size } = await getStream(media.fileUrl);

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": contentTypeForKey(media.fileUrl),
      // Content-Length is derived from fs.stat at request time (a real,
      // known size for a streamed read) — not client-supplied, so unlike
      // the Content-Length check in the upload route, this one is exact.
      "Content-Length": String(size),
      // Media is access-controlled and membership is revocable, so bytes
      // must NOT be stored by shared/CDN caches.
      "Cache-Control": "private, no-store",
    },
  });
}
