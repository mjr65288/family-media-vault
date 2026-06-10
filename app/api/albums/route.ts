import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, familyId } = await req.json();
  if (!title || !familyId) {
    return NextResponse.json(
      { error: "Title and familyId are required" },
      { status: 400 }
    );
  }

  // Verify the user is an ADMIN of this family
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