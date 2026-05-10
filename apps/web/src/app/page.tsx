import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-comm-blue lowercase tracking-tight mb-2">
          communi<span className="text-black">*</span>culture
        </h1>
        <p className="text-sm text-gray-500 lowercase">a division of futurefarmers</p>
        <p className="mt-4 text-comm-blue lowercase">
          <Link href="/continuums" className="comm-link mr-4">continuums</Link>
          <Link href="/login" className="comm-link">sign in</Link>
        </p>
      </div>

      <div className="max-w-md text-center">
        <p className="text-gray-700 mb-6">
          Place yourself on a continuum. See where others stand. Connect across difference.
        </p>
        <Link
          href="/login"
          className="bg-comm-blue text-white px-6 py-3 lowercase text-sm hover:bg-blue-800 transition-colors"
        >
          get started
        </Link>
      </div>
    </main>
  );
}
