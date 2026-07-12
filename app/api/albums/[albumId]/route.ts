import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { requireFamilyMembership } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

/**
 * Fetches an Album (with its Media items) by id.
 *
 * Requires an authenticated session and membership in the album's owning
 * family (any role).
 *
 * Status codes: 401 unauthenticated, 404 album doesn't exist, 403 exists
 * but requester isn't a member of its family, 200 ok.
 */
export async function GET(
  _req: NextRequest,
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
    select: {
      id: true,
      title: true,
      createdAt: true,
      familyId: true,
      media: {
        select: {
          id: true,
          fileUrl: true,
          type: true,
          thumbUrl: true,
          uploadedById: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!album) {
    // 404 here (album doesn't exist), distinct from the 403 below (album
    // exists, requester just isn't a member) — see MembershipResult
    // convention in lib/auth-helpers.ts.
    return NextResponse.json({ error: "Album not found" }, { status: 404 });
  }

  const membership = await requireFamilyMembership(userId, album.familyId);

  if (membership.status === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(
    {
      id: album.id,
      title: album.title,
      createdAt: album.createdAt,
      media: album.media,
    },
    { status: 200 }
  );
}
