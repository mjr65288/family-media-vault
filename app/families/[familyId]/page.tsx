import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { requireFamilyMembership } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { AuthenticatedShell } from "@/components/AuthenticatedShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateAlbumForm } from "./CreateAlbumForm";
import { DeleteFamilyButton } from "./DeleteFamilyButton";

/**
 * Family hub: settings + albums for a single family. Split out of the
 * dashboard (which used to cram members/albums/invite-code/forms into one
 * card per family) so each family gets real room — member management,
 * rename, and invite-code regeneration land here too (see ux-route-audit
 * feature work).
 */
export default async function FamilyDetailPage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { familyId } = await params;

  const family = await prisma.family.findUnique({
    where: { id: familyId },
    include: {
      albums: { select: { id: true, title: true }, orderBy: { createdAt: "desc" } },
      members: { select: { id: true } },
    },
  });

  if (!family) {
    notFound();
  }

  const membership = await requireFamilyMembership(session.user.id, familyId);

  if (membership.status === "forbidden") {
    return (
      <AuthenticatedShell>
        <main className="px-6 py-8">
          <div className="mx-auto w-full max-w-3xl rounded-lg border border-dashed border-border bg-card p-8 text-center">
            <h1 className="text-lg font-semibold">Not accessible</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You don&apos;t have access to this family.
            </p>
          </div>
        </main>
      </AuthenticatedShell>
    );
  }

  const isAdmin = membership.status === "ok" && membership.role === "ADMIN";

  return (
    <AuthenticatedShell>
      <main className="px-6 py-8">
        <div className="mx-auto w-full max-w-6xl">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-primary hover:underline"
          >
            &larr; Back to dashboard
          </Link>

          <header className="mt-4 flex flex-col gap-2 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold">{family.name}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {family.members.length} member
                {family.members.length === 1 ? "" : "s"} &middot;{" "}
                {family.albums.length} album{family.albums.length === 1 ? "" : "s"}
              </p>
            </div>
          </header>

          {isAdmin ? (
            <section className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Family settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Invite code
                    </p>
                    <p className="mt-1 break-all font-mono text-sm">
                      {family.inviteCode}
                    </p>
                  </div>
                  <div className="mt-5">
                    <DeleteFamilyButton familyId={family.id} familyName={family.name} />
                  </div>
                </CardContent>
              </Card>
            </section>
          ) : null}

          <section className="mt-8">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-xl font-semibold">Albums</h2>
            </div>

            {isAdmin ? (
              <div className="mt-5">
                <CreateAlbumForm familyId={family.id} />
              </div>
            ) : null}

            {family.albums.length === 0 ? (
              <div className="mt-5 rounded-lg border border-dashed border-border bg-card p-8 text-center">
                <h3 className="text-lg font-semibold">No albums yet</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  {isAdmin
                    ? "Create an album to start uploading photos and videos."
                    : "The family admin hasn't created any albums yet."}
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {family.albums.map((album) => (
                  <Link
                    key={album.id}
                    href={`/albums/${album.id}`}
                    className="block rounded-lg border border-border bg-card p-5 shadow-sm transition hover:border-primary"
                  >
                    <h3 className="font-semibold">{album.title}</h3>
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
