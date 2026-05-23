import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";

// GET /api/users/accounts/link-complete?t=TOKEN
// Called after OAuth completes (as the callbackUrl). Reads the link token,
// moves the new OAuth Account to the original user, and cleans up any
// stub user that was created for the OAuth session.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("t");
  const base = new URL(req.url).origin;

  if (!token) {
    return NextResponse.redirect(`${base}/profile?link_error=invalid`);
  }

  // Find the pending link token
  const pending = await prisma.verificationToken.findUnique({ where: { token } });
  if (!pending || pending.expires < new Date()) {
    await prisma.verificationToken.deleteMany({ where: { token } });
    return NextResponse.redirect(`${base}/profile?link_error=expired`);
  }

  // Decode: identifier = "link:originalUserId:provider"
  const [, originalUserId, provider] = pending.identifier.split(":");
  await prisma.verificationToken.delete({ where: { token } });

  // Current session is whoever just completed OAuth (may differ from originalUserId)
  const session = await getServerSession(authOptions);
  const oauthUserId = session?.user?.id;

  if (!oauthUserId) {
    return NextResponse.redirect(`${base}/profile?link_error=no_session`);
  }

  if (oauthUserId === originalUserId) {
    // Same-email case — NextAuth already linked correctly
    return NextResponse.redirect(`${base}/profile?linked=1`);
  }

  // Different-email case: move the new Account to the original user
  const newAccount = await prisma.account.findFirst({
    where: { userId: oauthUserId, provider },
  });

  if (!newAccount) {
    return NextResponse.redirect(`${base}/profile?link_error=no_account`);
  }

  // Check the original user exists
  const originalUser = await prisma.user.findUnique({ where: { id: originalUserId } });
  if (!originalUser) {
    return NextResponse.redirect(`${base}/profile?link_error=no_user`);
  }

  // Check the provider isn't already linked to the original user
  const alreadyLinked = await prisma.account.findFirst({
    where: { userId: originalUserId, provider },
  });
  if (alreadyLinked) {
    return NextResponse.redirect(`${base}/profile?link_error=already_linked`);
  }

  // Move the Account to the original user
  await prisma.account.update({
    where: { id: newAccount.id },
    data: { userId: originalUserId },
  });

  // Clean up the stub user created for the OAuth session if it has no other data
  const [otherAccounts, continuumCount] = await Promise.all([
    prisma.account.count({ where: { userId: oauthUserId } }),
    prisma.continuum.count({ where: { ownerId: oauthUserId } }),
  ]);

  if (otherAccounts === 0 && continuumCount === 0) {
    await prisma.user.delete({ where: { id: oauthUserId } }).catch(() => {});
  }

  // Redirect to sign in again as the original user (session is now for the stub)
  return NextResponse.redirect(`${base}/profile?linked=1&reauth=1`);
}
