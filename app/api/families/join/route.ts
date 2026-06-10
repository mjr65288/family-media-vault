import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { inviteCode } = await req.json();
  if (!inviteCode) {
    return NextResponse.json({ error: "Invite code is required" }, { status: 400 });
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