import { handlers } from "@/auth";

/**
 * NextAuth v5 catch-all route: delegates GET/POST to the Auth.js handlers
 * configured in `auth.ts` (Credentials provider, JWT session strategy).
 * Handles the built-in Auth.js endpoints (e.g. /api/auth/signin,
 * /api/auth/session, /api/auth/csrf) — not a custom handler.
 */
export const { GET, POST } = handlers;
