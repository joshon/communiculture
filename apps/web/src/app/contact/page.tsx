import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { ContactClient } from "@/components/contact/ContactClient";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const session = await getServerSession(authOptions);
  return (
    <div style={{ minHeight: "100vh", background: "white" }}>
      <SiteHeader />
      <ContactClient loggedIn={!!session} />
    </div>
  );
}
