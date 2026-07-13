import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { requireFamilyMembership } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";

/**
 * Deletes a Family and everything under it (members, albums, media DB rows
 * cascade via `onDelete: Cascade`). Disk files for every Media row across
 * every Album are removed AFTER the DB delete succeeds, using file keys
 * read beforehand.
 *
 * Requires an authenticated session AND ADMIN role in the family.
 *
 * Status codes: 401 unauthenticated, 404 family doesn't exist, 403 not an
 * admin of that family, 204 deleted.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ familyId: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { familyId } = await params;

  const family = await prisma.family.findUnique({
    where: { id: familyId },
    select: { id: true },
  });

  if (!family) {
    return NextResponse.json({ error: "Family not found" }, { status: 404 });
  }

  const membership = await requireFamilyMembership(userId, familyId);

  if (membership.status !== "ok" || membership.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only family admins can delete a family" },
      { status: 403 }
    );
  }

  const media = await prisma.media.findMany({
    where: { album: { familyId } },
    select: { fileUrl: true },
  });

  await prisma.family.delete({ where: { id: familyId } });

  await Promise.all(media.map((item) => deleteFile(item.fileUrl)));

  return new NextResponse(null, { status: 204 });
}

/**
 * Renames a Family.
 *
 * Requires an authenticated session AND ADMIN role in the family. Name
 * validation mirrors family creation (trim, required, max 100 chars).
 *
 * Status codes: 401 unauthenticated, 404 family doesn't exist, 400
 * missing/invalid name, 403 not an admin of that family, 200 updated.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ familyId: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { familyId } = await params;

  const family = await prisma.family.findUnique({
    where: { id: familyId },
    select: { id: true },
  });

  if (!family) {
    return NextResponse.json({ error: "Family not found" }, { status: 404 });
  }

  const membership = await requireFamilyMembership(userId, familyId);

  if (membership.status !== "ok" || membership.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only family admins can rename a family" },
      { status: 403 }
    );
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name =
    typeof body === "object" &&
    body !== null &&
    "name" in body &&
    typeof body.name === "string"
      ? body.name.trim()
      : "";

  if (!name) {
    return NextResponse.json({ error: "Family name is required" }, { status: 400 });
  }

  if (name.length > 100) {
    return NextResponse.json(
      { error: "Family name must be 100 characters or fewer" },
      { status: 400 }
    );
  }

  const updated = await prisma.family.update({
    where: { id: familyId },
    data: { name },
  });

  return NextResponse.json(updated, { status: 200 });
}
