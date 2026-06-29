import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { validateLoginInput } from "@/lib/auth-validation";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const DUMMY_PASSWORD_HASH =
  "$2b$12$8txIB2DMCRIvKYkm5lHCcuVkmaC4IOTPU9TT.GOqIesNglj4L5Htm";

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
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }

      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
