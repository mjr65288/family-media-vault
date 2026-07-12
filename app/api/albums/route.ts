import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

/**
 * Creates an Album under a given Family.
 *
 * Requires an authenticated session AND that the requester be an ADMIN
 * member of the target family (regular MEMBERs cannot create albums).
 *
 * Status codes: 401 unauthenticated, 400 missing/invalid title or familyId,
 * 403 not an admin of that family, 201 created.
 */
export async function POST(req: NextRequest) {
  // Auth check happens before body parsing — reject unauthenticated callers
  // before reading/parsing the request body.
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title =
    typeof body === "object" &&
    body !== null &&
    "title" in body &&
    typeof body.title === "string"
      ? body.title.trim()
      : "";
  const familyId =
    typeof body === "object" &&
    body !== null &&
    "familyId" in body &&
    typeof body.familyId === "string"
      ? body.familyId.trim()
      : "";

  if (!title || !familyId) {
    return NextResponse.json(
      { error: "Title and familyId are required" },
      { status: 400 }
    );
  }

  if (title.length > 100 || familyId.length > 128) {
    return NextResponse.json(
      { error: "Album title or family id is invalid" },
      { status: 400 }
    );
  }

  // Verify the user is an ADMIN of this family. Note: this route checks the
  // role directly rather than via requireFamilyMembership, since album
  // creation additionally requires ADMIN (not just any membership).
  const membership = await prisma.familyMember.findUnique({
    where: {
      userId_familyId: { userId, familyId },
    },
  });

  if (!membership || membership.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only family admins can create albums" },
      { status: 403 }
    );
  }

  const album = await prisma.album.create({
    data: { title, familyId },
  });

  return NextResponse.json(album, { status: 201 });
}
