import { prisma } from "@/lib/prisma";

/**
 * Discriminated result of a family-membership check.
 *
 * Convention (kept consistent across all routes that use this helper):
 * - "not-found": the owning resource (family/album/media) does not exist.
 *   Callers MUST respond 404. Returning 404 here (rather than 403) avoids
 *   leaking existence of resources to non-members.
 * - "forbidden": the resource exists but the requester is not a member of
 *   its owning family. Callers MUST respond 403.
 * - "ok": the requester is a member (any role); callers may proceed.
 *
 * Note: a member of a DIFFERENT family requesting a resource still gets
 * "forbidden" (403), which does confirm the resource exists — accepted
 * minor info-leak tradeoff for v1.
 */
export type MembershipResult =
  | { status: "ok"; role: "ADMIN" | "MEMBER" }
  | { status: "not-found" }
  | { status: "forbidden" };

/**
 * Checks whether userId is a FamilyMember of familyId.
 *
 * This does NOT look up the owning resource (album/media) — callers must
 * do that lookup themselves and pass "not-found" through if the resource
 * itself doesn't exist, since familyId is only known once the resource is
 * found.
 */
export async function requireFamilyMembership(
  userId: string,
  familyId: string | null
): Promise<MembershipResult> {
  if (!familyId) {
    return { status: "not-found" };
  }

  const membership = await prisma.familyMember.findUnique({
    where: { userId_familyId: { userId, familyId } },
  });

  if (!membership) {
    return { status: "forbidden" };
  }

  return { status: "ok", role: membership.role };
}
