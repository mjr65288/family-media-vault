import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Use Auth.js credentials sign-in through /api/auth/signin or the next-auth client signIn() helper.",
    },
    { status: 410 }
  );
}
