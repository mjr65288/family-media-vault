import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { requireFamilyMembership } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { UploadForm } from "./UploadForm";

/** Static placeholder icon shown in place of a thumbnail for video media. */
function VideoPlaceholderIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-10 w-10 text-zinc-400"
    >
      <path
        d="M4 5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="m10 9 5 3-5 3V9Z" fill="currentColor" />
      <path d="M17 8h4M17 16h4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

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
      <main className="min-h-screen bg-stone-50 px-6 py-8 text-zinc-950">
        <div className="mx-auto w-full max-w-3xl rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center">
          <h1 className="text-lg font-semibold">Not accessible</h1>
          <p className="mt-2 text-sm text-zinc-600">
            You don&apos;t have access to this album.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-8 text-zinc-950">
      <div className="mx-auto w-full max-w-6xl">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-teal-700 hover:underline"
        >
          &larr; Back to dashboard
        </Link>

        <header className="mt-4 flex flex-col gap-2 border-b border-zinc-200 pb-6">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">
            {album.family.name}
          </p>
          <h1 className="text-3xl font-semibold">{album.title}</h1>
        </header>

        <section className="mt-8">
          <UploadForm albumId={album.id} />
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Media</h2>

          {album.media.length === 0 ? (
            <div className="mt-5 rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center">
              <h3 className="text-lg font-semibold">No media yet</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
                Upload a photo or video to get started.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {album.media.map((item) => (
                <a
                  key={item.id}
                  href={`/api/media/${item.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm"
                >
                  {item.type === "PHOTO" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/media/${item.id}`}
                      alt=""
                      loading="lazy"
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 bg-stone-100">
                      <VideoPlaceholderIcon />
                      <span className="rounded-md bg-zinc-950 px-2 py-0.5 text-xs font-semibold text-white">
                        VIDEO
                      </span>
                    </div>
                  )}
                  <p className="px-2 py-1 text-xs text-zinc-500">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </a>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
