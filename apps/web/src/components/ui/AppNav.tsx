"use client";

import Link from "next/link";
import Image from "next/image";
import { DashboardAvatarHead } from "@/components/dashboard/DashboardAvatarHead";

interface Props {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  thumbnailUrl?: string | null;
}

export function AppNav({ user, thumbnailUrl = null }: Props) {
  return (
    <nav className="flex items-start justify-between px-5 pt-4 pb-3 bg-white border-b border-black/10">
      {/* Left: logo lockup + nav links */}
      <div className="flex flex-col gap-0.5">
        <Link href="/dashboard" className="block">
          <Image src="/logo.svg" alt="communi*culture" width={208} height={41} priority style={{ width: 156, height: "auto" }} />
        </Link>
        <div className="flex gap-4 mt-2 text-xs text-[#0083ff] lowercase">
          <Link href="/dashboard" className="hover:underline">continuums</Link>
          <Link href="/dashboard" className="hover:underline">view others</Link>
          <Link href="/profile" className="hover:underline">edit yourself</Link>
        </div>
      </div>

      {/* Right: avatar button with dropdown */}
      <DashboardAvatarHead thumbnailUrl={thumbnailUrl} size="60px" />
    </nav>
  );
}
