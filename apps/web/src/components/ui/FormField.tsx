"use client";

import { useIsMobile } from "@/hooks/useIsMobile";
import { S, H } from "@/lib/scale";

const DARK_BLUE = "#3F58D0";
const LIGHT_BLUE = "#0083FF";
const INTER = "var(--font-inter)";
const PRO = "Proletarian, sans-serif";

interface FormFieldProps {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}

export function FormField({ label, type, value, onChange, autoComplete }: FormFieldProps) {
  const mobile = useIsMobile(768);
  const labelFs  = mobile ? `clamp(14px, ${H(16)}, 18px)` : `clamp(16px, ${S(36)}, 24px)`;
  const inputFs  = mobile ? `clamp(13px, ${H(15)}, 18px)` : `clamp(13px, ${S(18)}, 22px)`;
  const labelW   = mobile ? `clamp(70px, 22vw, 100px)` : `clamp(80px, ${S(100)}, 120px)`;
  const gap      = mobile ? `clamp(12px, 3vw, 20px)` : `clamp(16px, ${S(24)}, 30px)`;
  const mb       = mobile ? `clamp(14px, ${H(20)}, 26px)` : `clamp(18px, ${S(28)}, 36px)`;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `${labelW} 1fr`,
      alignItems: "baseline",
      gap,
      marginBottom: mb,
    }}>
      <span style={{
        fontFamily: PRO,
        color: LIGHT_BLUE,
        fontSize: labelFs,
        textAlign: "right",
        whiteSpace: "nowrap",
        lineHeight: 1,
        transform: `translateY(${S(5)})`,
      }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        style={{
          border: "none",
          borderBottom: "1.5px solid #AAAAAA",
          outline: "none",
          fontFamily: INTER,
          fontSize: inputFs,
          color: "#1a1a1a",
          background: "white",
          paddingBottom: 5,
          width: "100%",
        }}
      />
    </div>
  );
}
