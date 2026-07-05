import { prisma } from "@communiculture/db";

// Authorization for socket actions on a continuum. The web API gates the same
// way (see apps/web/src/lib/continuum-access.ts); the socket can't read the
// httpOnly password cookie, so for PASSWORD/PUBLIC_LINK it accepts the share
// token the client already holds (the user passed the page's password gate to
// get here). Enforces soft-deletion and per-continuum bans.
export async function canAccessContinuum(
  userId: string,
  continuumId: string,
  token?: string | null
): Promise<boolean> {
  if (!userId || !continuumId) return false;

  const c = await prisma.continuum.findFirst({
    where: { id: continuumId, deletedAt: null },
    select: {
      ownerId: true,
      visibility: true,
      shareToken: true,
      team: { select: { members: { select: { userId: true } } } },
    },
  });
  if (!c) return false;
  if (c.ownerId === userId) return true;

  // Banned (non-owner) → deny everything.
  const banned = await prisma.continuumBan
    .findUnique({ where: { continuumId_userId: { continuumId, userId } }, select: { id: true } })
    .catch(() => null);
  if (banned) return false;

  if (c.visibility === "PUBLIC") return true;
  if (c.visibility === "TEAM" && c.team?.members.some((m) => m.userId === userId)) return true;
  if (
    (c.visibility === "PUBLIC_LINK" || c.visibility === "PASSWORD") &&
    token &&
    token === c.shareToken
  ) {
    return true;
  }

  // Already placed themselves here earlier → legitimate participant.
  const p = await prisma.continuumParticipant
    .findUnique({ where: { continuumId_userId: { continuumId, userId } }, select: { id: true } })
    .catch(() => null);
  return !!p;
}
