import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import { isAdminEmail } from "@/lib/admin";

// Internal /dev tools (avatar-builder, thumbnail generator) are admin-only.
// 404 for everyone else so the routes aren't even discoverable.
export default async function DevLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) notFound();
  return <>{children}</>;
}
