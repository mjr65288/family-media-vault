import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
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

  // Check the family exists
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
