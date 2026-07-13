import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AuthenticatedShell } from "@/components/AuthenticatedShell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FamilyActions } from "./FamilyActions";
import { SignOutButton } from "./SignOutButton";

/**
 * Authenticated dashboard. Server component so it can fetch the caller's
 * family memberships directly via Prisma before rendering. Kept as a thin
 * index — each family's real detail (members, albums, settings) lives at
 * /families/[familyId] so this page doesn't grow unbounded per family.
 */
export default async function DashboardPage() {
  const session = await auth();

  // Gate before any data fetching: an unauthenticated request must never
  // reach the Prisma query below.
  if (!session?.user?.id) {
    redirect("/login");
  }

  const memberships = await prisma.familyMember.findMany({
    where: { userId: session.user.id },
    include: {
      family: {
        include: {
          albums: { select: { id: true } },
          members: { select: { id: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  return (
    <AuthenticatedShell>
      <main className="px-6 py-8">
        <div className="mx-auto w-full max-w-6xl">
          <header className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold">Dashboard</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Signed in as {session.user.email}
              </p>
            </div>
            <SignOutButton />
          </header>

          <section className="mt-8">
            <FamilyActions />
          </section>

          <section className="mt-10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Your families</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Family spaces control who can see albums and media.
                </p>
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                {memberships.length} total
              </p>
            </div>

            {memberships.length === 0 ? (
              <div className="mt-5 rounded-lg border border-dashed border-border bg-card p-8 text-center">
                <h3 className="text-lg font-semibold">No families yet</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Create a family to become its admin, or join one using an
                  invite code.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {memberships.map((membership) => (
                  <Link key={membership.id} href={`/families/${membership.family.id}`}>
                    <Card className="h-full transition hover:border-primary">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <CardTitle className="text-lg">
                            {membership.family.name}
                          </CardTitle>
                          <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                            {membership.role}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <dl className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <dt className="text-muted-foreground">Members</dt>
                            <dd className="mt-1 font-semibold">
                              {membership.family.members.length}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">Albums</dt>
                            <dd className="mt-1 font-semibold">
                              {membership.family.albums.length}
                            </dd>
                          </div>
                        </dl>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </AuthenticatedShell>
  );
}
