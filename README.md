# Family Media Vault

A private place for families to organize shared photos and videos. Each family gets its own space, joined via an invite code, with albums that hold photo/video media — everything gated by family membership.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · NextAuth v5 (Credentials + JWT) · Prisma 7 + PostgreSQL · Tailwind CSS 4

## Quick start

```bash
npm install
cp .env.example .env.local   # set DATABASE_URL
npx prisma migrate deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**New to this repo?** Read [ONBOARDING.md](./ONBOARDING.md) first — it covers environment setup, the auth/storage architecture, and the non-obvious constraints (in-memory rate limiting, local-disk media storage, no test suite yet) before you touch code.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint (no separate formatter configured) |

## Testing changes

There's no automated test suite yet — see [ONBOARDING.md § Verifying a change before you open a PR](./ONBOARDING.md#verifying-a-change-before-you-open-a-pr) for the manual flow to exercise (register → login → family → album → upload → view) before opening a PR.

## Learn more

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth (Auth.js) Documentation](https://authjs.dev)
