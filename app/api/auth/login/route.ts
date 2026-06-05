import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  // Look up the user
  const user = await prisma.user.findUnique({ where: { email } });

  // Compare password — note: we check user AND password in one response
  const valid = user && await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  // Issue a JWT
  const token = jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );

  return NextResponse.json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
}