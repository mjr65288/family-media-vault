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
- **In `async` form submit handlers, capture `event.currentTarget` into a variable before your first `await`.** React clears `currentTarget` once the event finishes dispatching, so `event.currentTarget.reset()` *after* an `await fetch(...)` throws `Cannot read properties of null`. `UploadForm.tsx`, `FamilyActions.tsx`, and `CreateAlbumForm.tsx` all follow the `const form = event.currentTarget;` pattern at the top of the handler — copy that, not the naive version.
- **`prisma.config.ts` loads env vars via `dotenv/config`, which only reads `.env`, not `.env.local`.** Next.js itself auto-loads `.env.local`, so `npm run dev` works fine with `DATABASE_URL` only in `.env.local` — but the Prisma CLI (`prisma migrate dev`, `prisma studio`, etc.) will NOT see it and fails with "The datasource.url property is required". Either add a plain `.env` with `DATABASE_URL`, or pass it inline: `DATABASE_URL=... npx prisma migrate dev`.
- **Deleting a Family or Album cascades in the database** (`onDelete: Cascade` on `FamilyMember.family`, `Album.family`, `Media.album` in `prisma/schema.prisma`) but **not on disk** — the `DELETE` routes (`app/api/families/[familyId]/route.ts`, `app/api/albums/[albumId]/route.ts`) read every affected `Media.fileUrl` *before* the DB delete, then call `deleteFile()` (`lib/storage.ts`) for each one *after* the DB delete succeeds. If you add a new relation under Family/Album, make sure it either cascades in the schema too or is cleaned up explicitly — Prisma relations default to `RESTRICT`, not cascade.

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
| Family/album/media API routes | `app/api/families/` (create, join, `[familyId]` delete), `app/api/albums/` (create, `[albumId]` get/delete), `app/api/media/` |
| Dashboard & album UI | `app/dashboard/` (family list, `CreateAlbumForm` + `DeleteFamilyButton` for admins), `app/albums/[albumId]/` (media grid, upload, `DeleteAlbumButton` for admins) |
| Full file-by-file reference | `ARCHITECTURE.md` |

## Verifying a change before you open a PR

```bash
npx tsc --noEmit
npx eslint .
```

**There's no automated test suite and no `npm test` script.** `@playwright/test` is listed in `devDependencies`, but there's no `playwright.config.ts` and no test files anywhere in the repo — treat it as an unconfigured placeholder, not a working test runner. If you want to add real Playwright coverage, you'll need to write the config from scratch; check with the team before doing so (see the "no test suite yet" constraint above).

Until then, verification is manual. Exercise the full flow against a real Postgres instance (local or the Docker one-liner above):

1. **Register** — go to `/register`, create an account. Confirms `POST /api/auth/register` (email uniqueness, bcrypt hashing).
2. **Login** — go to `/login` with those credentials. Confirms the Credentials provider + JWT session cookie is issued (`auth.ts`).
3. **Create a family** — from `/dashboard`, use "Create a family". Confirms `POST /api/families` and that you land as `ADMIN` with an invite code shown.
4. **Join a family** — open a second browser (or incognito window), register a second user, and join using the invite code from step 3. Confirms `POST /api/families/join` and the `MEMBER` role path.
5. **Create an album and upload media** — as the `ADMIN`, use the "New album name" form on the family card (`CreateAlbumForm`, only rendered for admins) to create an album, then open it and upload a small photo and a video. Confirms `POST /api/albums` (admin-only — `MEMBER`s can't create albums) and the upload route's size/MIME checks (`lib/storage.ts`, 15MB photo / 200MB video caps), and that the file round-trips through `GET /api/media/[mediaId]`.
6. **Cross-family isolation** — as the second user, try hitting an album URL that belongs to a family you're *not* a member of. Confirms `requireFamilyMembership` returns 403/404 correctly (see "Request flow: viewing an album" above).
7. **Delete an album** — as the `ADMIN`, use "Delete album" on the album page. Confirms `DELETE /api/albums/[albumId]` (admin-only), that its media rows cascade-delete, and that the uploaded files are actually removed from `uploads/` on disk (not just the DB rows).
8. **Delete a family** — as the `ADMIN`, use "Delete family" on the dashboard. Confirms `DELETE /api/families/[familyId]` (admin-only), that members/albums/media all cascade-delete, and that every file under all of that family's albums is removed from disk.
9. **Sign out / session expiry** — use the sign-out button, then hit `/dashboard` directly. Confirms the redirect-to-login guard on server components.

For quick API-only checks without the browser, `curl` works too, e.g.:

```bash
curl -i -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"correcthorsebatterystaple"}'
```

Whatever change you made, re-run the specific step(s) of this flow it touches — don't skip straight to "looks fine in the browser" for anything that changes auth, membership checks, or the upload path, since those are the parts most likely to fail silently.
