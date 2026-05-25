"use client";

import Link from "next/link";
import { PillButton } from "@/components/ui/PillButton";

const INTER = "Inter, sans-serif";
const BLUE = "#0083FF";

interface Props {
  canCreate: boolean;
  count: number;
}

export function CreateContinuumButton({ canCreate, count }: Props) {
  if (!canCreate) {
    return (
      <p style={{ fontFamily: INTER, fontSize: 16, color: "#888", margin: 0 }}>
        {count}/3 continuums —{" "}
        <Link href="/billing" style={{ color: BLUE, textDecoration: "underline" }}>upgrade</Link>
      </p>
    );
  }

  return <PillButton href="/continuum/new" label="+ new continuum" fontSize="16px" />;
}
