import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { requireFamilyMembership } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { AuthenticatedShell } from "@/components/AuthenticatedShell";
import { DeleteAlbumButton } from "./DeleteAlbumButton";
import { MediaGrid } from "./MediaGrid";
import { UploadForm } from "./UploadForm";

/**
 * Album detail page: shows an album's media grid and upload form, gated by
 * both authentication and family membership.
 */
export default async function AlbumDetailPage({
  params,
}: {
  params: Promise<{ albumId: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { albumId } = await params;

  const album = await prisma.album.findUnique({
    where: { id: albumId },
    include: {
      family: { select: { id: true, name: true } },
      media: { orderBy: { createdAt: "desc" } },
    },
  });

  // Checked before the membership lookup: a nonexistent album should 404
  // regardless of who's asking, rather than leaking a "forbidden" vs. "not
  // found" distinction that could confirm an album ID's existence.
  if (!album) {
    notFound();
  }

  const membership = await requireFamilyMembership(
    session.user.id,
    album.familyId
  );

  if (membership.status === "forbidden") {
    return (
      <AuthenticatedShell>
        <main className="px-6 py-8">
          <div className="mx-auto w-full max-w-3xl rounded-lg border border-dashed border-border bg-card p-8 text-center">
            <h1 className="text-lg font-semibold">Not accessible</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You don&apos;t have access to this album.
            </p>
          </div>
        </main>
      </AuthenticatedShell>
    );
  }

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
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
                {album.family.name}
              </p>
              <h1 className="text-3xl font-semibold">{album.title}</h1>
            </div>
            {membership.status === "ok" && membership.role === "ADMIN" ? (
              <DeleteAlbumButton albumId={album.id} albumTitle={album.title} />
            ) : null}
          </header>

          <section className="mt-8">
            <UploadForm albumId={album.id} />
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">Media</h2>

            <MediaGrid
              media={album.media}
              isAdmin={
                membership.status === "ok" && membership.role === "ADMIN"
              }
            />
          </section>
        </div>
      </main>
    </AuthenticatedShell>
  );
}
