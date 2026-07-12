# Onboarding — Family Media Vault

This document gets a new developer from clone to a working local environment, and explains the pieces of the domain that aren't obvious from the file tree alone.

## What this app does

A private photo/video vault for families:

- A user registers and creates or joins a **Family** via an invite code.
- Each Family has **Albums**; each Album holds **Media** (photos/videos).
- Roles are `ADMIN` (created the family, sees the invite code) or `MEMBER` (joined via invite code).
- Every read/write on albums and media is gated by family membership — there is no public content.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Auth | NextAuth v5 (beta), Credentials provider, **JWT session strategy** — no `Session`/`Account` tables |
| Database | PostgreSQL via Prisma 7 (`@prisma/adapter-pg`) |
| Media storage | Local disk (`uploads/`), behind `lib/storage.ts` — see constraint below |
| Styling | Tailwind CSS 4 |
| Package manager | **npm only** — this repo has `package-lock.json`, not yarn/pnpm/bun lockfiles |

## Prerequisites

- Node.js (version matching `@types/node ^20` in `package.json`)
- npm
- A PostgreSQL instance (local, Docker, or hosted) — see below if you don't have one

## First-time setup

```bash
npm install
```

`postinstall` runs `prisma generate` automatically. Prisma's client is generated to **`app/generated/prisma`**, not the default `node_modules/.prisma/client` — always import it via `@/lib/prisma`, never construct a new `PrismaClient` elsewhere.

### Environment variables

Copy `.env.example` to `.env.local` and fill in:

- `DATABASE_URL` — PostgreSQL connection string (`postgresql://user:pass@host:port/db`)
- NextAuth v5 also expects an `AUTH_SECRET` in production; in local dev it will warn but still run.

### Database

Apply migrations against your `DATABASE_URL`:

```bash
npx prisma migrate deploy
```

**No Postgres handy?** Spin up a disposable one with Docker:

```bash
docker run -d --name fmv-postgres -e POSTGRES_USER=fmv -e POSTGRES_PASSWORD=fmv -e POSTGRES_DB=fmv -p 55432:5432 postgres:16-alpine
# then set DATABASE_URL=postgresql://fmv:fmv@localhost:55432/fmv in .env.local
```

### Run it

```bash
npm run dev
```

Visit `http://localhost:3000` → register → create a family → create an album → upload a photo.

## Things that will surprise you

- **No test script exists yet.** There's no `npm test`. If you add tests, you're also introducing the test runner/config — check with the team before picking one.
- **No Prettier.** Formatting is whatever `eslint-config-next` enforces via `npm run lint`. Don't introduce a formatter config unilaterally.
- **Rate limiting is in-memory** (`lib/rate-limit.ts`, a `Map` on `globalThis`). It resets on every cold start and does **not** work across multiple server instances — fine for a single-process deploy, not for horizontal scaling.
- **Media storage is local disk** (`lib/storage.ts`), same single-process constraint as rate limiting. Files live under a gitignored `uploads/` directory, keyed by non-guessable `crypto.randomUUID()` values (never sequential IDs — the serving route is the only authorization boundary, so key secrecy matters). **This breaks on serverless/ephemeral filesystems (e.g. Vercel)** — if you're deploying there, swap `lib/storage.ts`'s implementation for S3/R2/Vercel Blob first; the routes that call `putFile`/`getFile`/`getStream` don't need to change.
- **`fileUrl` on `Media` is an opaque storage key, not a public URL.** The only way to read file bytes is `GET /api/media/[mediaId]`, which re-checks family membership on every request before streaming.
- Route Handlers in Next.js 16 have **no built-in body size limit** (the 1MB cap you may recall only applies to Server Actions). The upload route enforces its own caps: 15MB photos / 200MB videos, checked via `Content-Length` before reading the body, then re-verified against the actual bytes read.
- Any route touching `fs`/streams must declare `export const runtime = "nodejs"` — the Edge runtime has no filesystem access.

## Where things live

| Concern | Path |
|---|---|
| Auth config | `auth.ts` |
| Prisma schema | `prisma/schema.prisma` |
| Prisma client import | `lib/prisma.ts` (points at `app/generated/prisma`) |
| Storage abstraction | `lib/storage.ts` |
| Shared authorization check | `lib/auth-helpers.ts` (`requireFamilyMembership`) |
| Family/album/media API routes | `app/api/families/`, `app/api/albums/`, `app/api/media/` |
| Dashboard & album UI | `app/dashboard/`, `app/albums/[albumId]/` |

## Verifying a change before you open a PR

```bash
npx tsc --noEmit
npx eslint .
```

There's no automated test suite, so manually exercise the flow you touched (register/login/family/album/upload/view) against a real Postgres instance — curl or the browser both work.
