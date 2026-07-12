import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { requireFamilyMembership } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { contentTypeForKey, getStream } from "@/lib/storage";

// Uses fs streams via lib/storage — requires the Node runtime.
export const runtime = "nodejs";

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
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  const membership = await requireFamilyMembership(
    userId,
    media.album.familyId
  );

  if (membership.status === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { stream, size } = await getStream(media.fileUrl);

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": contentTypeForKey(media.fileUrl),
      "Content-Length": String(size),
      // Media is access-controlled and membership is revocable, so bytes
      // must NOT be stored by shared/CDN caches.
      "Cache-Control": "private, no-store",
    },
  });
}
