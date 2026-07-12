# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Next.js version warning

This version of Next.js has breaking changes vs. training data — APIs, conventions, and file structure may differ. Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js-specific code. Heed deprecation notices.

## Project facts Claude can't guess

- **Package manager: npm** (only `package-lock.json` present) — don't use pnpm/yarn/bun commands.
- **No `test` script exists** — there's no test suite in this repo yet.
- **Prisma client generates to a non-default path**: `app/generated/prisma` (configured in `prisma/schema.prisma`), not `node_modules/.prisma/client` — import from there.
- **Sessions are JWT-only, not DB-backed.** The Prisma `User` model has no `Session`/`Account` model; NextAuth v5 (`auth.ts`) uses the Credentials provider with JWT strategy (7-day maxAge).
- **Rate limiting is in-memory** (`lib/rate-limit.ts`, a `Map` on `globalThis`) — single-process only, resets on cold start and won't work across multiple server instances.
- **No Prettier/formatter configured** — formatting follows ESLint (`eslint-config-next`) defaults only; don't invent a format command.
