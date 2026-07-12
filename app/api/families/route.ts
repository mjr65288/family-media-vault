import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

/**
 * Creates a new Family and adds the requesting user as its ADMIN member.
 *
 * Requires an authenticated session; no family membership is needed since
 * this is how a family comes into existence.
 *
 * Status codes: 401 unauthenticated, 400 missing/invalid name, 201 created.
 */
export async function POST(req: NextRequest) {
  // Auth check happens before body parsing — an unauthenticated caller is
  // rejected without the cost/risk of reading and parsing the request body.
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
