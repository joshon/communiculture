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
    <div style={{ display: "flex", alignItems: "baseline", gap: 20, marginBottom: 24 }}>
      <label style={{
        fontFamily: INTER,
        fontSize: 16,
        fontWeight: 500,
        color: "#1a1a1a",
        width: 110,
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
          fontSize: 16,
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
