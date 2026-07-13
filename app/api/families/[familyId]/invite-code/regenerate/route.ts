import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { auth } from "@/auth";
import { requireFamilyMembership } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

/**
 * Regenerates a Family's invite code, invalidating the old one immediately
 * (anyone still holding it will fail to join afterward).
 *
 * Requires an authenticated session AND ADMIN role in the family. Uses
 * `crypto.randomUUID()` rather than pulling in a cuid2 dependency — the
 * schema's `@default(cuid())` is only used at row-creation time by Prisma
 * internally and isn't callable from application code, and no cuid2 package
 * is already a dependency here.
 *
 * Status codes: 401 unauthenticated, 404 family doesn't exist, 403 not an
 * admin of that family, 200 regenerated.
 */
export async function POST(
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
      { error: "Only family admins can regenerate the invite code" },
      { status: 403 }
    );
  }

  const updated = await prisma.family.update({
    where: { id: familyId },
    data: { inviteCode: randomUUID() },
    select: { inviteCode: true },
  });

  return NextResponse.json(updated, { status: 200 });
}
