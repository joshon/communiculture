"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import Image from "next/image";

interface Props {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function AppNav({ user }: Props) {
  return (
    <nav className="border-b border-gray-100 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/dashboard">
          <span className="text-comm-blue font-bold lowercase text-lg">
            communi<span className="text-black">*</span>culture
          </span>
        </Link>
        <div className="flex gap-4 text-xs text-gray-500 lowercase">
          <Link href="/dashboard" className="hover:text-comm-blue">continuums</Link>
          <Link href="/teams" className="hover:text-comm-blue">teams</Link>
          <Link href="/profile" className="hover:text-comm-blue">edit yourself</Link>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {user.image && (
          <Image
            src={user.image}
            alt={user.name ?? ""}
            width={24}
            height={24}
            className="rounded-none"
          />
        )}
        <span className="text-xs text-gray-400 lowercase">{user.name ?? user.email}</span>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-xs text-gray-400 lowercase hover:text-comm-blue"
        >
          log off
        </button>
      </div>
    </nav>
  );
}
