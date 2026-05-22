"use client";

import Link from "next/link";
import { useAvatarStore } from "@/store/avatarStore";

interface Props {
  thumbnailUrl: string | null;
  /** CSS size value — e.g. "80px" or "clamp(60px, 7vw, 120px)" */
  size: string;
}

export function DashboardAvatarHead({ thumbnailUrl: serverThumbnailUrl, size }: Props) {
  const storeThumbnailUrl = useAvatarStore((s) => s.thumbnailUrl);
  const thumbnailUrl = storeThumbnailUrl ?? serverThumbnailUrl;

  return (
    <Link href="/profile/avatar" style={{ display: "block", flexShrink: 0, position: "relative" }}>
      {/* Outline ring drawn behind the avatar */}
      <div style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: "2px solid rgba(0,0,0,0.18)",
        position: "absolute",
        inset: 0,
      }} />

      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt="your avatar"
          style={{
            width: size,
            height: size,
            objectFit: "contain",
            display: "block",
            position: "relative",
          }}
        />
      ) : (
        <div style={{ width: size, height: size }} />
      )}
    </Link>
  );
}
