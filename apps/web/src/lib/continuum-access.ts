import { prisma } from "@communiculture/db";
import { cookies } from "next/headers";
import crypto from "crypto";
import { isAdminEmail } from "@/lib/admin";

// Single source of truth for "may this caller read/write this continuum", used by
// the API routes. It mirrors the gate in app/continuum/[id]/page.tsx so the data
// endpoints enforce the same rules the page does — previously the write routes
// (position/comment) and the socket only checked "is logged in", letting any
// user act on any continuum by id, ignoring visibility, share token, password,
// bans, and soft-deletion.
//
// Notes:
// - Soft-deleted continuums (deletedAt set) are treated as not-found.
// - For PASSWORD continuums the proof is the httpOnly `cc_pw_<id>` cookie set by
//   /verify-password (derived from the password hash, so it can't be forged) —
//   NOT the share token. The share token alone must not unlock a password gate.
// - Owner and site admins are exempt from bans so they can still moderate.

type AccessReason = "not_found" | "banned" | "forbidden";

export interface ContinuumAccess {
  ok: boolean;
  reason?: AccessReason;
  continuum: Awaited<ReturnType<typeof loadContinuum>>;
}

function loadContinuum(continuumId: string) {
  return prisma.continuum.findFirst({
    where: { id: continuumId, deletedAt: null },
    include: { team: { include: { members: true } } },
  });
}

export async function resolveContinuumAccess(opts: {
  continuumId: string;
  userId: string | null;
  email?: string | null;
  shareToken?: string | null;
}): Promise<ContinuumAccess> {
  const { continuumId, userId, email, shareToken } = opts;

  const c = await loadContinuum(continuumId);
  if (!c) return { ok: false, reason: "not_found", continuum: null };

  const isOwner = !!userId && c.ownerId === userId;
  const isAdmin = isAdminEmail(email ?? undefined);

  // Ban check — owner & site admins exempt (they moderate).
  if (userId && !isOwner && !isAdmin) {
    const banned = await prisma.continuumBan
      .findUnique({ where: { continuumId_userId: { continuumId, userId } }, select: { id: true } })
      .catch(() => null);
    if (banned) return { ok: false, reason: "banned", continuum: null };
  }

  if (isOwner || isAdmin) return { ok: true, continuum: c };
  if (c.visibility === "PUBLIC") return { ok: true, continuum: c };

  const tokenMatches = !!shareToken && shareToken === c.shareToken;
  if (c.visibility === "PUBLIC_LINK" && tokenMatches) return { ok: true, continuum: c };

  if (c.visibility === "PASSWORD" && c.passwordHash) {
    // Proof of the password is the cookie, not the token.
    const expected = crypto.createHash("sha256").update(c.id + c.passwordHash).digest("hex");
    if (cookies().get(`cc_pw_${c.id}`)?.value === expected) return { ok: true, continuum: c };
  }

  if (c.visibility === "TEAM" && !!userId && c.team?.members.some((m) => m.userId === userId)) {
    return { ok: true, continuum: c };
  }

  // Already placed themselves here earlier → legitimate participant.
  if (userId) {
    const p = await prisma.continuumParticipant
      .findUnique({ where: { continuumId_userId: { continuumId, userId } }, select: { id: true } })
      .catch(() => null);
    if (p) return { ok: true, continuum: c };
  }

  return { ok: false, reason: "forbidden", continuum: null };
}
