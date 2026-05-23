const BLUE = "#0083FF";
const INTER = "Inter, sans-serif";

interface OAuthButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

export function OAuthButton({ onClick, icon, label }: OAuthButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        width: "100%",
        border: `1.5px solid ${BLUE}`,
        borderRadius: 10,
        paddingTop: 13,
        paddingBottom: 13,
        paddingLeft: 20,
        paddingRight: 20,
        fontFamily: INTER,
        fontSize: "clamp(13px, 3vw, 16px)",
        fontWeight: 600,
        color: BLUE,
        background: "white",
        cursor: "pointer",
        marginBottom: 10,
      }}
    >
      <span style={{ display: "flex", width: 20, height: 20, flexShrink: 0, alignItems: "center", justifyContent: "center" }}>
        {icon}
      </span>
      {label}
    </button>
  );
}
