"use client";

import Link from "next/link";
import { PillButton } from "@/components/ui/PillButton";

const INTER = "Inter, sans-serif";
const BLUE = "#0083FF";

interface Props {
  canCreate: boolean;
  totalOwned: number;
  allowed: number | null; // null = lifetime/unlimited
}

export function CreateContinuumButton({ canCreate, totalOwned, allowed }: Props) {
  const countLabel = allowed === null
    ? `${totalOwned} created (unlimited)`
    : `${totalOwned} / ${allowed}`;

  if (!canCreate) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        <p style={{ fontFamily: INTER, fontSize: 13, color: "#888", margin: 0 }}>
          {countLabel} —{" "}
          <Link href="/billing" style={{ color: BLUE, textDecoration: "underline" }}>buy more</Link>
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <PillButton href="/continuum/new" label="New continuum" fontSize="16px" />
      <p style={{ fontFamily: INTER, fontSize: 12, color: "#aaa", margin: 0 }}>{countLabel}</p>
    </div>
  );
}
