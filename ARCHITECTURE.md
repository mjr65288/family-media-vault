# Architecture — File-by-File Reference

A reference map of every source file in this repo: what it does and what it exports. Not a tutorial — see `ONBOARDING.md` for setup and flow diagrams.

## Root config

**`auth.ts`** — NextAuth v5 configuration and instance. Defines the Credentials provider (email + password via bcrypt), JWT session strategy (7-day `maxAge`), login rate limiting, and a dummy-hash `bcrypt.compare` to defend against user-enumeration timing attacks. Exports `authConfig`, `handlers`, `auth`, `signIn`, `signOut`.

**`next-auth.d.ts`** — Module augmentation adding `id: string` to the NextAuth `Session["user"]` type, since the default session type has no `id` field.

**`prisma/schema.prisma`** — Prisma schema: `User`, `Family`, `FamilyMember` (join table with `ADMIN`/`MEMBER` role, unique on `[userId, familyId]`), `Album`, `Media` (`PHOTO`/`VIDEO`, opaque `fileUrl` storage key). Generates the Prisma client to `app/generated/prisma` (non-default path) via the `prisma-client` generator.

**`prisma.config.ts`** — Prisma CLI config (schema path, migrations path, datasource URL from `DATABASE_URL`). Used by `prisma migrate`/`generate`, not by application code.

## lib/

**`lib/prisma.ts`** — Singleton Prisma client factory using the `@prisma/adapter-pg` driver adapter, cached on `globalThis` in development to survive Next.js hot-reload without exhausting DB connections. Exports `prisma`.

**`lib/rate-limit.ts`** — In-memory, single-process rate limiter backed by a `Map` on `globalThis` (survives hot-reload in dev, resets on cold start, does not work across multiple server instances). Exports `checkRateLimit(key, limit, windowMs)` and `getClientIp(request)`.

**`lib/storage.ts`** — Local-disk media storage abstraction, sharding files under `uploads/<2-hex>/<uuid>.<ext>` keyed by non-guessable `crypto.randomUUID()` values (not sequential IDs) since the serving route is the sole authorization boundary. Same single-process/persistent-filesystem constraint as `rate-limit.ts` — will not work on serverless/ephemeral deploys without swapping the implementation. Exports `putFile`, `getFile`, `getStream`, `statFile`, `contentTypeForKey`, `UPLOADS_DIR`, `CONTENT_TYPE_BY_EXTENSION`, and the `MediaKind`/`StoredMeta` types.

**`lib/auth-helpers.ts`** — Shared family-membership authorization check used by every album/media route. Exports `requireFamilyMembership(userId, familyId)`, returning a discriminated `MembershipResult` (`"ok"` / `"not-found"` / `"forbidden"`) — callers map `"not-found"` to 404 and `"forbidden"` to 403, which avoids leaking resource existence to non-members.

**`lib/auth-validation.ts`** — Plain-object input validation (no external schema library) for register/login payloads: trims/normalizes fields, enforces length and email-format constraints. Exports `validateRegisterInput`, `validateLoginInput`, `normalizeEmail`, and the `RegisterInput`/`LoginInput`/`ValidationResult<T>` types.

## app/ pages

**`app/layout.tsx`** — Root layout: fonts, global CSS, `<html>`/`<body>` shell shared by every route.

**`app/page.tsx`** — Landing/home page; redirects authenticated users toward the dashboard or renders marketing/login entry points for anonymous visitors.

**`app/login/page.tsx`** — Server component wrapper for the login route; renders `LoginForm`.

**`app/login/LoginForm.tsx`** — Client component: email/password form that calls the credentials sign-in flow and surfaces validation/auth errors.

**`app/register/page.tsx`** — Server component wrapper for the register route; renders `RegisterForm`.

**`app/register/RegisterForm.tsx`** — Client component: registration form that posts to `app/api/auth/register` and redirects to login on success.

**`app/dashboard/page.tsx`** — Server component: the authenticated landing page. Loads the current user's family (if any), its albums, and members, and renders creation/invite actions.

**`app/dashboard/FamilyActions.tsx`** — Client component: forms for creating a family, joining a family via invite code, and creating an album.

**`app/dashboard/SignOutButton.tsx`** — Client component wrapping NextAuth's `signOut()` in a button.

**`app/albums/[albumId]/page.tsx`** — Server component: fetches an album and its media (after verifying family membership) and renders the gallery plus the upload form.

**`app/albums/[albumId]/UploadForm.tsx`** — Client component: file picker/upload form posting multipart data to the album's media endpoint.

## app/api/ route handlers

**`app/api/auth/[...nextauth]/route.ts`** — NextAuth's catch-all route handler, re-exporting `GET`/`POST` from `auth.ts`'s `handlers`.

**`app/api/auth/login/route.ts`** — Thin login endpoint (if present alongside NextAuth's own flow) that validates credentials and delegates to the Credentials provider / rate limiter.

**`app/api/auth/register/route.ts`** — `POST` handler that validates registration input, checks for an existing email, hashes the password with bcrypt, and creates the `User` row.

**`app/api/families/route.ts`** — `POST` (create a family, making the creator its first `ADMIN` member) and/or `GET` (fetch the caller's family) — gated on an authenticated session.

**`app/api/families/join/route.ts`** — `POST` handler that looks up a `Family` by invite code and creates a `FamilyMember` row (`MEMBER` role) for the caller, guarding against joining twice or an invalid code.

**`app/api/albums/route.ts`** — `POST` (create an album under the caller's family, after `requireFamilyMembership`) and/or `GET` (list albums for the caller's family).

**`app/api/albums/[albumId]/route.ts`** — `GET`/`DELETE` for a single album; checks `requireFamilyMembership` against the album's `familyId` before returning data or allowing deletion, returning 404/403 per the `MembershipResult` convention.

**`app/api/albums/[albumId]/media/route.ts`** — `POST` handler for uploading media into an album: verifies family membership before reading the multipart body, validates MIME type and size caps (checked against `Content-Length` as a hint, then re-verified against actual bytes read), stores the file via `lib/storage.ts`, and creates the `Media` row.

**`app/api/media/[mediaId]/route.ts`** — `GET` handler that serves a single media file's bytes: re-checks family membership for every request (since `Media.fileUrl` is an opaque, non-public key) before streaming via `lib/storage.ts`'s `getStream`.
