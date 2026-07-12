import { type DefaultSession } from "next-auth";

/**
 * Module augmentation adding `id` to `session.user`.
 *
 * NextAuth's default `Session["user"]` has no `id` field. The `session`
 * callback in auth.ts sets it from the JWT `sub` claim, but without this
 * augmentation TypeScript wouldn't know `session.user.id` exists anywhere
 * `auth()` is consumed.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
