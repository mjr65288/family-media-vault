import { NextResponse } from "next/server";

/**
 * Deprecated stub: this app authenticates via Auth.js Credentials provider,
 * not a custom login endpoint. Always responds 410 Gone, pointing callers
 * to the real sign-in path. No auth or body parsing occurs here.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Use Auth.js credentials sign-in through /api/auth/signin or the next-auth client signIn() helper.",
    },
    { status: 410 }
  );
}
