import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FamilyActions } from "./FamilyActions";
import { SignOutButton } from "./SignOutButton";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const memberships = await prisma.familyMember.findMany({
    where: { userId: session.user.id },
    include: {
      family: {
        include: {
          albums: {
            select: { id: true, title: true },
          },
          members: {
            select: { id: true },
          },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-8 text-zinc-950">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex flex-col gap-5 border-b border-zinc-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">
              Family Media Vault
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Dashboard</h1>
            <p className="mt-2 text-sm text-zinc-600">
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
              <p className="mt-1 text-sm text-zinc-600">
                Family spaces control who can see albums and media.
              </p>
            </div>
            <p className="text-sm font-medium text-zinc-500">
              {memberships.length} total
            </p>
          </div>

          {memberships.length === 0 ? (
            <div className="mt-5 rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center">
              <h3 className="text-lg font-semibold">No families yet</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
                Create a family to become its admin, or join one using an invite
                code.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {memberships.map((membership) => (
                <article
                  key={membership.id}
                  className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-lg font-semibold">
                      {membership.family.name}
                    </h3>
                    <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">
                      {membership.role}
                    </span>
                  </div>
                  <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-zinc-500">Members</dt>
                      <dd className="mt-1 font-semibold">
                        {membership.family.members.length}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Albums</dt>
                      <dd className="mt-1 font-semibold">
                        {membership.family.albums.length}
                      </dd>
                    </div>
                  </dl>
                  {membership.family.albums.length > 0 ? (
                    <ul className="mt-5 space-y-2">
                      {membership.family.albums.map((album) => (
                        <li key={album.id}>
                          <Link
                            href={`/albums/${album.id}`}
                            className="block rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-800 transition hover:border-teal-700 hover:text-teal-700"
                          >
                            {album.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {membership.role === "ADMIN" ? (
                    <div className="mt-5 rounded-md bg-stone-100 p-3">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
                        Invite code
                      </p>
                      <p className="mt-1 break-all font-mono text-sm">
                        {membership.family.inviteCode}
                      </p>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
