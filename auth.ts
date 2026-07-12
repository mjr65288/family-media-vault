import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { validateLoginInput } from "@/lib/auth-validation";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
// Precomputed bcrypt hash of an arbitrary password, with no matching user.
// Used to run a dummy bcrypt.compare when the email lookup misses, so the
// authorize() timing is roughly the same whether or not the account exists —
// mitigates user-enumeration via response-time side channel.
const DUMMY_PASSWORD_HASH =
  "$2b$12$8txIB2DMCRIvKYkm5lHCcuVkmaC4IOTPU9TT.GOqIesNglj4L5Htm";

/**
 * NextAuth v5 configuration for Credentials + JWT sessions (no DB-backed
 * Session/Account model — see CLAUDE.md). Exported separately from the
 * `NextAuth()` call below so it can be reused/tested without triggering
 * route handler initialization.
 */
export const authConfig = {
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = validateLoginInput(credentials);
        if (!parsed.ok) {
          return null;
        }

        // Rate-limit key combines IP + email so one bad actor can't lock out
        // other users sharing an IP, and a single email can't be brute-forced
        // from rotating IPs beyond this window.
        const rateLimit = checkRateLimit(
          `login:${getClientIp(request)}:${parsed.data.email}`,
          LOGIN_ATTEMPTS,
          LOGIN_WINDOW_MS
        );

        if (!rateLimit.allowed) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user) {
          // Timing-attack mitigation: always pay the bcrypt cost even when
          // there's no user to compare against, so response time doesn't
          // reveal whether the email is registered.
          await bcrypt.compare(parsed.data.password, DUMMY_PASSWORD_HASH);
          return null;
        }

        const validPassword = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        );

        if (!validPassword) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    // `user` is only defined on initial sign-in; persist the id onto the JWT
    // `sub` claim so it survives subsequent requests without a DB lookup.
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }

      return token;
    },
    // Exposes the persisted id on `session.user` (see next-auth.d.ts module
    // augmentation) so route handlers can read it without decoding the JWT.
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }

      return session;
    },
  },
} satisfies NextAuthConfig;

/** NextAuth route handlers and helpers built from {@link authConfig}. */
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
