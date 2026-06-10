import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await req.json();
  if (!name) {
    return NextResponse.json({ error: "Family name is required" }, { status: 400 });
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