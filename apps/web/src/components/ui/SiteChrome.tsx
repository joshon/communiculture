"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

export function SiteChrome() {
  return (
    <div
      className="fixed top-3 right-3 z-50 flex flex-col sm:flex-row gap-1"
      style={{ fontFamily: "var(--font-pixelify)" }}
    >
      <Link
        href="#"
        className="text-[10px] uppercase tracking-widest bg-[#3F58D0] text-white px-3 py-1 font-bold hover:bg-black transition-colors text-center"
      >
        about
      </Link>
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="text-[10px] uppercase tracking-widest bg-[#3F58D0] text-white px-3 py-1 font-bold hover:bg-black transition-colors"
      >
        log out
      </button>
    </div>
  );
}
