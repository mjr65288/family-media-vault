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

  const family = await prisma.family.create({
    data: {
      name,
      members: {
        create: {
          userId,
          role: "ADMIN",
        },
      },
    },
    include: {
      members: true,
    },
  });

  return NextResponse.json(family, { status: 201 });
}
