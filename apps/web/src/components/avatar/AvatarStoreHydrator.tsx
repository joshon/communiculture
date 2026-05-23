"use client";

import { useEffect, useRef } from "react";
import { useAvatarStore } from "@/store/avatarStore";

interface Props {
  thumbnailUrl: string | null;
}

export function AvatarStoreHydrator({ thumbnailUrl }: Props) {
  const setThumbnailUrl = useAvatarStore((s) => s.setThumbnailUrl);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    if (thumbnailUrl) setThumbnailUrl(thumbnailUrl);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
