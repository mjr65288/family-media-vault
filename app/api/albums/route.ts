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
