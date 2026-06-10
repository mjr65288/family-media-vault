import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const PUBLIC_ROUTES = [
  "/api/auth/register",
  "/api/auth/login",
];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Let public routes through
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Everything else requires a valid token
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    const res = NextResponse.next();

    // Forward the user id to API routes via header
    res.headers.set("x-user-id", (payload as jwt.JwtPayload).sub!);
    return res;
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }
}

export const config = {
  matcher: ["/api/:path*"],
};