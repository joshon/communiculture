"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/useIsMobile";
import { PillButton } from "@/components/ui/PillButton";
import { AvatarRenderer } from "@/components/avatar/AvatarRenderer";
import type { AvatarVariantLibrary, AvatarPart } from "@/components/avatar-builder/types";
import { AVATAR_PARTS } from "@/components/avatar-builder/types";
import { useAvatarStore } from "@/store/avatarStore";
import { AppHeader } from "@/components/ui/AppHeader";

const BLUE = "#0083FF";
const INTER = "Inter, sans-serif";

function Rule() {
  return <div style={{ borderTop: "1px solid #D8D8D8", margin: "24px 0" }} />;
}

function LineInput({ label, type = "text", value, onChange, readOnly }: {
  label: string; type?: string; value: string;
  onChange?: (v: string) => void; readOnly?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: "clamp(8px, 2vw, 14px)", marginBottom: "clamp(16px, 3vw, 24px)" }}>
      <label style={{
        fontFamily: INTER, fontSize: 16, fontWeight: 500, color: "#1a1a1a",
        width: "clamp(52px, 10vw, 70px)", flexShrink: 0,
        textAlign: "right", lineHeight: 1,
      }}>
        {label}
      </label>
      <input
        type={type} value={value} readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        style={{
          flex: 1, border: "none", borderBottom: "1.5px solid #AAAAAA",
          outline: "none", fontFamily: INTER, fontSize: 16, fontWeight: 400,
          color: "#1a1a1a", background: "transparent", paddingBottom: 4,
          opacity: readOnly ? 0.45 : 1, minWidth: 0,
        }}
      />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
function MicrosoftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#f25022" d="M1 1h10v10H1z"/>
      <path fill="#00a4ef" d="M13 1h10v10H13z"/>
      <path fill="#7fba00" d="M1 13h10v10H1z"/>
      <path fill="#ffb900" d="M13 13h10v10H13z"/>
    </svg>
  );
}
function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  google:     <GoogleIcon />,
  "azure-ad": <MicrosoftIcon />,
  facebook:   <FacebookIcon />,
};
const PROVIDER_LABELS: Record<string, string> = {
  google:     "Google",
  "azure-ad": "Microsoft",
  facebook:   "Facebook",
};
const ALL_PROVIDERS = ["google", "azure-ad", "facebook"];

// Max canvas dimensions — zoom and framing are calibrated for these values.
const PREVIEW_MAX_H = 560;
const PREVIEW_ASPECT = 360 / 560;
const PREVIEW_BASE_ZOOM = 143;

function useAvatarPreviewSize() {
  const [height, setHeight] = useState(PREVIEW_MAX_H);
  useEffect(() => {
    const update = () => {
      // Subtract fixed chrome: sticky header + padding + title + button area + padding-bottom ≈ 221px
      const h = Math.max(300, Math.min(PREVIEW_MAX_H, window.innerHeight - 221));
      setHeight(h);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return {
    height,
    width: Math.round(height * PREVIEW_ASPECT),
    zoom:  Math.round(PREVIEW_BASE_ZOOM * height / PREVIEW_MAX_H),
  };
}

function AvatarPreview({ avatarConfig, onClick, width, height, zoom }: {
  avatarConfig: object; onClick?: () => void;
  width: number; height: number; zoom: number;
}) {
  const [library, setLibrary] = useState<AvatarVariantLibrary | null>(null);
  const pointerDownRef = useRef<[number, number] | null>(null);
  // Prefer live store values — updated by the avatar editor without a page reload
  const storeColors   = useAvatarStore((s) => s.editingColors);
  const storeVariants = useAvatarStore((s) => s.editingVariants);

  useEffect(() => {
    fetch("/api/dev/avatar-library")
      .then((r) => r.json())
      .then((d: { library: AvatarVariantLibrary }) => d?.library && setLibrary(d.library))
      .catch(() => {});
  }, []);

  const cfg = avatarConfig as Record<string, unknown>;
  const serverColors   = (cfg.format === "v2" ? cfg.colors   : null) as Record<AvatarPart, string> | null;
  const serverVariants = (cfg.format === "v2" ? cfg.variants : null) as Record<AvatarPart, number> | null;

  const colors   = storeColors   ?? serverColors;
  const variants = storeVariants ?? serverVariants;

  const safeColors  = colors  ?? Object.fromEntries(AVATAR_PARTS.map((p) => [p, "#cccccc"])) as Record<AvatarPart, string>;
  const safeVariants = variants ?? Object.fromEntries(AVATAR_PARTS.map((p) => [p, 0])) as Record<AvatarPart, number>;

  if (!library) return <div style={{ width, height }} />;

  return (
    <div
      style={{ width, height, cursor: onClick ? "pointer" : "default" }}
      onPointerDown={(e) => { pointerDownRef.current = [e.clientX, e.clientY]; }}
      onPointerUp={(e) => {
        if (!pointerDownRef.current || !onClick) return;
        const dx = e.clientX - pointerDownRef.current[0];
        const dy = e.clientY - pointerDownRef.current[1];
        if (Math.sqrt(dx * dx + dy * dy) < 5) onClick();
        pointerDownRef.current = null;
      }}
    >
      <AvatarRenderer
        library={library}
        variantIndices={safeVariants}
        colors={safeColors}
        showOutline={true}
        showLabels={false}
        fixedZoom={zoom}
        cameraTargetY={1.85}
      />
    </div>
  );
}

export function ProfileClient({ user }: {
  user: {
    name: string; email: string; slogan: string; url: string;
    avatarConfig: object; avatarThumbnail: string | null;
    connectedProviders: string[]; hasPassword: boolean;
  };
}) {
  const { width: previewW, height: previewH, zoom: previewZoom } = useAvatarPreviewSize();
  const isMobile = useIsMobile(1024);
  const mobilePreviewH = Math.floor(PREVIEW_MAX_H / 2);
  const mobilePreviewW = Math.round(mobilePreviewH * PREVIEW_ASPECT);
  const mobilePreviewZoom = Math.round(PREVIEW_BASE_ZOOM * mobilePreviewH / PREVIEW_MAX_H);
  const params = useSearchParams();
  const router = useRouter();
  const [name, setName]     = useState(user.name);
  const [slogan, setSlogan] = useState(user.slogan);
  const [url, setUrl]       = useState(user.url);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");
  const [connected, setConnected] = useState(user.connectedProviders);
  const [linkMsg, setLinkMsg]     = useState<string | null>(null);
  const initialMount = useRef(true);

  useEffect(() => {
    const linked = params?.get("linked");
    const reauth = params?.get("reauth");
    const err    = params?.get("link_error");
    if (linked) {
      setLinkMsg(reauth
        ? "Account linked! Sign in again to continue with your main account."
        : "Account linked successfully.");
    }
    if (err) {
      const msgs: Record<string, string> = {
        expired:        "Link request expired. Please try again.",
        already_linked: "That account is already linked.",
        invalid:        "Invalid link token.",
        no_session:     "Session expired during linking. Please try again.",
      };
      setLinkMsg(msgs[err] ?? "Could not link account. Please try again.");
    }
  }, [params]);

  // Debounced auto-save — skips initial mount
  useEffect(() => {
    if (initialMount.current) { initialMount.current = false; return; }
    const timer = setTimeout(async () => {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slogan, url }),
      });
      if (res.ok) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [name, slogan, url]);

  async function handleDisconnect(provider: string) {
    const res = await fetch(`/api/users/accounts?provider=${provider}`, { method: "DELETE" });
    if (res.ok) setConnected((c) => c.filter((p) => p !== provider));
    else alert("cannot remove your only sign-in method");
  }

  // Indent accounts to align with form content (label width + gap)
  const FIELD_INDENT = "clamp(60px, 12vw, 84px)";
  // Mobile indent: label column (52px) + gap (8px)
  const MOBILE_INDENT = 60;

  if (isMobile) {
    return (
      <div style={{ minHeight: "100vh", background: "white" }}>
        <AppHeader breadcrumbs={[{ label: "home", href: "/dashboard" }, { label: "edit profile" }]} />
        <main style={{ paddingTop: 24, paddingBottom: 60, paddingLeft: 16, paddingRight: 16 }}>

          {/* Avatar */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
            <p style={{ fontFamily: INTER, fontSize: 18, fontWeight: 500, color: "#1a1a1a", margin: "0 0 0 0", alignSelf: "flex-start" }}>Avatar</p>
            <div style={{ marginTop: -52, position: "relative" }}>
              <AvatarPreview
                avatarConfig={user.avatarConfig}
                onClick={() => router.push("/profile/avatar")}
                width={mobilePreviewW}
                height={mobilePreviewH}
                zoom={mobilePreviewZoom}
              />
            </div>
            <PillButton href="/profile/avatar" fontSize="15px" label="Edit avatar" variant="secondary" arrow />
          </div>

          {/* Profile */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <p style={{ fontFamily: INTER, fontSize: 18, fontWeight: 500, color: "#1a1a1a", margin: 0 }}>Profile</p>
              <span style={{ fontFamily: INTER, fontSize: 13, color: "#bbb", opacity: saveStatus === "saved" ? 1 : 0, transition: "opacity 0.4s" }}>saved</span>
            </div>
            <LineInput label="Name"   value={name}       onChange={setName} />
            <LineInput label="Email"  value={user.email} readOnly />
            <LineInput label="Slogan" value={slogan}     onChange={setSlogan} />
            <LineInput label="URL"    value={url}        onChange={setUrl} />
          </div>

          {/* Accounts */}
          {connected.length > 0 && (
            <div>
              <p style={{ fontFamily: INTER, fontSize: 18, fontWeight: 500, color: "#1a1a1a", marginBottom: 16 }}>Accounts</p>
              {linkMsg && (
                <p style={{ fontFamily: INTER, fontSize: 14, color: linkMsg.includes("successfully") || linkMsg.includes("linked!") ? BLUE : "#c00", marginBottom: 16, paddingLeft: MOBILE_INDENT }}>
                  {linkMsg}
                </p>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {ALL_PROVIDERS.filter((p) => connected.includes(p)).map((provider) => (
                  <div key={provider} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", border: `1.5px solid ${BLUE}`, borderRadius: 10 }}>
                    <span style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>{PROVIDER_ICONS[provider]}</span>
                    <span style={{ fontFamily: INTER, fontSize: 16, color: "#1a1a1a", flex: 1 }}>{PROVIDER_LABELS[provider]}</span>
                    <button
                      onClick={() => handleDisconnect(provider)}
                      title={`disconnect ${PROVIDER_LABELS[provider]}`}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: "#0083FF20", border: "none", cursor: "pointer", color: BLUE, fontSize: 14, fontWeight: "bold", lineHeight: 1, flexShrink: 0 }}
                    >×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "white" }}>

      <AppHeader breadcrumbs={[{ label: "home", href: "/dashboard" }, { label: "edit profile" }]} />

      <main style={{
        paddingTop: 48,
        paddingBottom: 80,
        paddingLeft: "clamp(16px, 5vw, 48px)",
        paddingRight: "clamp(16px, 5vw, 48px)",
      }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", gap: "clamp(48px, 8vw, 96px)", alignItems: "flex-start" }}>

          {/* ── Left: form ── */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Section header with inline saved indicator */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <p style={{ fontFamily: INTER, fontSize: 22, fontWeight: 500, color: "#1a1a1a", margin: 0 }}>
                Profile
              </p>
              <span style={{
                fontFamily: INTER, fontSize: 14, color: "#bbb",
                opacity: saveStatus === "saved" ? 1 : 0,
                transition: "opacity 0.4s",
              }}>
                saved
              </span>
            </div>

            <LineInput label="Name"   value={name}       onChange={setName} />
            <LineInput label="Email"  value={user.email} readOnly />
            <LineInput label="Slogan" value={slogan}     onChange={setSlogan} />
            <LineInput label="URL"    value={url}        onChange={setUrl} />

            {connected.length > 0 && (
              <>
                <Rule />
                <p style={{ fontFamily: INTER, fontSize: 22, fontWeight: 500, color: "#1a1a1a", marginBottom: 20 }}>
                  Accounts
                </p>

                {linkMsg && (
                  <p style={{
                    fontFamily: INTER, fontSize: 14,
                    color: linkMsg.includes("successfully") || linkMsg.includes("linked!") ? BLUE : "#c00",
                    marginBottom: 16, paddingLeft: FIELD_INDENT,
                  }}>
                    {linkMsg}
                  </p>
                )}

                <div style={{ paddingLeft: FIELD_INDENT, display: "flex", flexDirection: "column", gap: 10 }}>
                  {ALL_PROVIDERS.filter((p) => connected.includes(p)).map((provider) => (
                    <div key={provider} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", border: `1.5px solid ${BLUE}`, borderRadius: 10 }}>
                      <span style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                        {PROVIDER_ICONS[provider]}
                      </span>
                      <span style={{ fontFamily: INTER, fontSize: 16, color: "#1a1a1a", flex: 1 }}>
                        {PROVIDER_LABELS[provider]}
                      </span>
                      <button
                        onClick={() => handleDisconnect(provider)}
                        title={`disconnect ${PROVIDER_LABELS[provider]}`}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          width: 22, height: 22, borderRadius: "50%",
                          background: "#0083FF20", border: "none", cursor: "pointer",
                          color: BLUE, fontSize: 14, fontWeight: "bold", lineHeight: 1, flexShrink: 0,
                        }}
                      >×</button>
                    </div>
                  ))}
                </div>
              </>
            )}

          </div>

          {/* ── Divider ── */}
          <div style={{ width: 1, background: "#D8D8D8", alignSelf: "stretch", flexShrink: 0 }} />

          {/* ── Right: avatar ── */}
          <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0 }}>
            <p style={{
              fontFamily: INTER, fontSize: 22, fontWeight: 500, color: "#1a1a1a",
              margin: 0, position: "relative", zIndex: 1,
            }}>
              Avatar
            </p>
            <div style={{ marginTop: -70, position: "relative", zIndex: 0 }}>
              <AvatarPreview
                avatarConfig={user.avatarConfig}
                onClick={() => router.push("/profile/avatar")}
                width={previewW}
                height={previewH}
                zoom={previewZoom}
              />
            </div>
            <div style={{ width: previewW, display: "flex", justifyContent: "center", marginTop: 16 }}>
              <PillButton href="/profile/avatar" fontSize="16px" label="Edit avatar" variant="secondary" arrow />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
