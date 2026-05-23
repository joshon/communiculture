"use client";

const INTER = "Inter, sans-serif";

interface FormFieldProps {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}

export function FormField({ label, type, value, onChange, autoComplete }: FormFieldProps) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: "clamp(12px, 3vw, 20px)", marginBottom: "clamp(16px, 3vw, 24px)" }}>
      <label style={{
        fontFamily: INTER,
        fontSize: "clamp(13px, 3vw, 16px)",
        fontWeight: 500,
        color: "#1a1a1a",
        width: "clamp(80px, 18vw, 110px)",
        flexShrink: 0,
        textAlign: "right",
        lineHeight: 1,
      }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        style={{
          flex: 1,
          border: "none",
          borderBottom: "1.5px solid #AAAAAA",
          outline: "none",
          fontFamily: INTER,
          fontSize: "clamp(13px, 3vw, 16px)",
          fontWeight: 400,
          color: "#1a1a1a",
          background: "transparent",
          paddingBottom: 4,
          minWidth: 0,
        }}
      />
    </div>
  );
}
