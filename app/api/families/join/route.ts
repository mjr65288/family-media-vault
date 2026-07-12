import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

/**
 * Joins the requesting user to a Family via its invite code, as a MEMBER.
 *
 * Requires an authenticated session. Membership itself is established by
 * this endpoint, so no prior membership check applies.
 *
 * Status codes: 401 unauthenticated, 400 missing/invalid invite code,
 * 404 invite code doesn't match any family, 409 already a member, 201 joined.
 */
export async function POST(req: NextRequest) {
  // Auth check happens before body parsing, same pattern used across the
  // mutating routes in this app: reject unauthenticated callers before
  // touching the request body.
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

  const inviteCode =
    typeof body === "object" &&
    body !== null &&
    "inviteCode" in body &&
    typeof body.inviteCode === "string"
      ? body.inviteCode.trim()
      : "";

  if (!inviteCode) {
    return NextResponse.json({ error: "Invite code is required" }, { status: 400 });
  }

  if (inviteCode.length > 128) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 400 });
  }

  // Check the family exists. Note: returning a generic "Invalid invite code"
  // message (rather than a distinct 404) avoids letting callers enumerate
  // which invite codes are valid vs. simply already-joined.
  const family = await prisma.family.findUnique({ where: { inviteCode } });
  if (!family) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  // Check they're not already a member
  const existing = await prisma.familyMember.findUnique({
    where: {
      userId_familyId: { userId, familyId: family.id },
    },
  });
  if (existing) {
    return NextResponse.json({ error: "You are already a member of this family" }, { status: 409 });
  }

  // Add them as a member
  const member = await prisma.familyMember.create({
    data: {
      userId,
      familyId: family.id,
      role: "MEMBER",
    },
  });

  return NextResponse.json(member, { status: 201 });
}
