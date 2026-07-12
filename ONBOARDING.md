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

## Application flow

### Auth flow: register → login → JWT session → protected routes

```mermaid
sequenceDiagram
    participant Browser
    participant RegisterRoute as POST /api/auth/register
    participant LoginRoute as Credentials provider (auth.ts)
    participant DB as Postgres (Prisma)
    participant Page as Protected page (e.g. /dashboard)

    Browser->>RegisterRoute: POST { name, email, password }
    RegisterRoute->>RegisterRoute: validateRegisterInput()
    RegisterRoute->>DB: check email unique, bcrypt.hash(password)
    DB-->>RegisterRoute: User created
    RegisterRoute-->>Browser: 201 Created

    Browser->>LoginRoute: signIn("credentials", { email, password })
    LoginRoute->>LoginRoute: validateLoginInput() + checkRateLimit()
    LoginRoute->>DB: findUnique(User by email)
    alt user not found
        LoginRoute->>LoginRoute: dummy bcrypt.compare() (timing-attack mitigation)
        LoginRoute-->>Browser: null (login failed)
    else user found
        LoginRoute->>LoginRoute: bcrypt.compare(password, passwordHash)
        LoginRoute-->>Browser: session cookie (JWT, 7-day maxAge)
    end

    Browser->>Page: GET /dashboard (cookie attached)
    Page->>Page: auth() reads/verifies JWT
    alt no valid session
        Page-->>Browser: redirect to /login
    else valid session
        Page->>DB: load user's family/albums
        Page-->>Browser: 200 rendered page
    end
```

Note: sessions are JWT-only — there is no `Session`/`Account` table. The JWT carries `sub` (user id), set once at sign-in via the `jwt` callback and copied into `session.user.id` via the `session` callback (see `next-auth.d.ts` for the augmented type).

### Domain model relationships

```mermaid
erDiagram
    User ||--o{ FamilyMember : "has"
    Family ||--o{ FamilyMember : "has"
    User ||--o{ Media : "uploads"
    Family ||--o{ Album : "has"
    Album ||--o{ Media : "contains"

    User {
        string id
        string name
        string email
        string passwordHash
    }
    Family {
        string id
        string name
        string inviteCode
    }
    FamilyMember {
        string id
        string role "ADMIN or MEMBER"
        string userId
        string familyId
    }
    Album {
        string id
        string title
        string familyId
    }
    Media {
        string id
        string fileUrl "opaque storage key"
        string thumbUrl
        string type "PHOTO or VIDEO"
        string albumId
        string uploadedById
    }
```

`FamilyMember` is the join table between `User` and `Family` (unique on `[userId, familyId]`), carrying the `role`. Every `Album` and `Media` row is reachable only via its `familyId`/`albumId` — there is no direct `User`-to-`Media` visibility check other than "is this user a member of the family that owns this album."

### Request flow: viewing an album

```mermaid
flowchart TD
    A[Client: GET /albums/albumId] --> B[Server component: auth]
    B -->|no session| C[401 / redirect to /login]
    B -->|session ok| D["prisma.album.findUnique(albumId)"]
    D -->|not found| E[404]
    D -->|found| F["requireFamilyMembership(userId, album.familyId)"]
    F -->|not-found| E
    F -->|forbidden| G[403]
    F -->|ok| H["prisma media findMany for album"]
    H --> I[Render gallery + UploadForm]
```

### Request flow: uploading media

```mermaid
flowchart TD
    A["Client: POST /api/albums/albumId/media (multipart)"] --> B[auth: verify session]
    B -->|no session| C[401]
    B -->|session ok| D["prisma.album.findUnique(albumId)"]
    D -->|not found| E[404]
    D -->|found| F["requireFamilyMembership(userId, album.familyId)"]
    F -->|forbidden| G[403]
    F -->|not-found| E
    F -->|ok, BEFORE reading body| H[Check Content-Length against size cap]
    H -->|over cap| I[413 / 400]
    H -->|within cap| J[Read body, validate MIME + re-check actual byte size]
    J -->|invalid| I
    J -->|valid| K["lib/storage.ts putFile()"]
    K --> L["prisma.media.create()"]
    L --> M[201 with media metadata]
```

Membership is checked **before** the request body is read or parsed in both flows — a non-member is rejected without the server ever buffering/streaming their upload payload, and without confirming whether the album exists (404 vs 403, per `lib/auth-helpers.ts`'s `MembershipResult` convention).

See `ARCHITECTURE.md` for a file-by-file reference of every module referenced in these diagrams.

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
| Full file-by-file reference | `ARCHITECTURE.md` |

## Verifying a change before you open a PR

```bash
npx tsc --noEmit
npx eslint .
```

There's no automated test suite, so manually exercise the flow you touched (register/login/family/album/upload/view) against a real Postgres instance — curl or the browser both work.
