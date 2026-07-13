import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { requireFamilyMembership } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

/**
 * Removes a member from a family.
 *
 * Requires an authenticated session AND ADMIN role in the family. Rejects
 * removing yourself (use "leave family" flow instead, not implemented here)
 * and rejects removing the last remaining ADMIN, since that would leave the
 * family with no admin able to manage it.
 *
 * Status codes: 401 unauthenticated, 404 family or member doesn't exist,
 * 403 not an admin of that family, 400 removing self or last admin,
 * 204 removed.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ familyId: string; userId: string }> }
) {
  const session = await auth();
  const requesterId = session?.user?.id;

  if (!requesterId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { familyId, userId } = await params;

  const family = await prisma.family.findUnique({
    where: { id: familyId },
    select: { id: true },
  });

  if (!family) {
    return NextResponse.json({ error: "Family not found" }, { status: 404 });
  }

  const membership = await requireFamilyMembership(requesterId, familyId);

  if (membership.status !== "ok" || membership.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only family admins can remove members" },
      { status: 403 }
    );
  }

  const target = await prisma.familyMember.findUnique({
    where: { userId_familyId: { userId, familyId } },
  });

  if (!target) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (userId === requesterId) {
    return NextResponse.json(
      { error: "You cannot remove yourself" },
      { status: 400 }
    );
  }

  if (target.role === "ADMIN") {
    const adminCount = await prisma.familyMember.count({
      where: { familyId, role: "ADMIN" },
    });

    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Cannot remove the last remaining admin" },
        { status: 400 }
      );
    }
  }

  await prisma.familyMember.delete({
    where: { userId_familyId: { userId, familyId } },
  });

  return new NextResponse(null, { status: 204 });
}
