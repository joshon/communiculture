"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

interface Props {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function AppNav({ user }: Props) {
  return (
    <nav className="flex items-start justify-between px-5 pt-4 pb-3 bg-white border-b border-black/10">
      {/* Left: logo + tagline + nav links */}
      <div className="flex flex-col gap-0.5">
        <Link href="/dashboard" className="block leading-none">
          <span className="text-[#0033cc] font-bold lowercase tracking-tight text-xl leading-none">
            communi<span className="text-[#0033cc]">*</span>culture
          </span>
        </Link>
        <span className="text-[9px] text-black/40 uppercase tracking-widest leading-none">
          a division of futurefarmers
        </span>
        <div className="flex gap-4 mt-2 text-xs text-[#0033cc] lowercase">
          <Link href="/dashboard" className="hover:underline">continuums</Link>
          <Link href="/dashboard" className="hover:underline">view others</Link>
          <Link href="/profile" className="hover:underline">edit yourself</Link>
        </div>
      </div>

      {/* Right: about + log off in bordered button style */}
      <div className="flex items-center gap-1">
        <Link
          href="#"
          className="text-[10px] uppercase tracking-widest border border-[#0033cc] text-[#0033cc] px-2 py-0.5 hover:bg-[#0033cc] hover:text-white transition-colors font-bold"
        >
          about
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-[10px] uppercase tracking-widest border border-[#0033cc] text-[#0033cc] px-2 py-0.5 hover:bg-[#0033cc] hover:text-white transition-colors font-bold"
        >
          log off
        </button>
      </div>
    </nav>
  );
}
