"use client";

import Link from "next/link";
import { DashboardAvatarHead } from "@/components/dashboard/DashboardAvatarHead";
import { LogoMenu } from "@/components/ui/LogoMenu";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useAvatarStore } from "@/store/avatarStore";

const INTER = "Inter, sans-serif";

export interface Breadcrumb {
  label: string;
  href?: string; // omit for current page (renders as bold text)
}

interface AppHeaderProps {
  breadcrumbs?: Breadcrumb[];
  /**
   * Whether a user is signed in. Defaults to true so existing in-app screens
   * (always authenticated) keep showing the avatar with no loading flash.
   * Public pages pass `false` to show a "sign in →" link instead.
   */
  authenticated?: boolean;
}

export function AppHeader({ breadcrumbs = [], authenticated = true }: AppHeaderProps) {
  const isMobile = useIsMobile(1024);
  const thumbnailUrl = useAvatarStore((s) => s.thumbnailUrl);

  const signInLink = (
    <Link href="/login" style={{
      fontFamily: INTER, fontSize: isMobile ? 14 : 16, color: "#0083FF",
      textDecoration: "none", whiteSpace: "nowrap",
    }}>
      sign in →
    </Link>
  );

  const crumbBar = breadcrumbs.length > 0 ? (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      gap: 8, fontFamily: INTER, fontSize: isMobile ? 13 : 16,
    }}>
      {breadcrumbs.map((item, i) => (
        <span key={i} style={{ display: "contents" }}>
          {i > 0 && <span style={{ color: "#ccc" }}>|</span>}
          {item.href
            ? <Link href={item.href} className="app-header-crumb">{item.label}</Link>
            : <span style={{ color: "#1a1a1a", fontWeight: 500 }}>{item.label}</span>
          }
        </span>
      ))}
    </div>
  ) : null;

  if (isMobile) {
    return (
      <>
        <style>{`.app-header-crumb{color:#aaa;text-decoration:none;transition:color 0.2s}.app-header-crumb:hover{color:#1a1a1a}`}</style>
        <header style={{
          position: "sticky", top: 0, zIndex: 20, background: "white",
          display: "flex", flexDirection: "column",
          padding: "10px 16px 6px", gap: 6,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <LogoMenu logoWidth="161px" isMobile />
            {authenticated
              ? <DashboardAvatarHead thumbnailUrl={thumbnailUrl} size="55px" />
              : signInLink}
          </div>
          {crumbBar}
        </header>
      </>
    );
  }

  return (
    <>
      <style>{`.app-header-crumb{color:#aaa;text-decoration:none;transition:color 0.2s}.app-header-crumb:hover{color:#1a1a1a}`}</style>
      <header style={{
        position: "sticky", top: 0, zIndex: 20, background: "white",
        display: "flex", alignItems: "center",
        padding: "16px clamp(16px, 4vw, 32px)", gap: 16,
      }}>
        <LogoMenu logoWidth="clamp(120px, 20vw, 180px)" isMobile={false} />
        {crumbBar && <div style={{ flex: 1 }}>{crumbBar}</div>}
        <div style={{ flexShrink: 0, marginLeft: crumbBar ? 0 : "auto" }}>
          {authenticated
            ? <DashboardAvatarHead thumbnailUrl={thumbnailUrl} size="60px" />
            : signInLink}
        </div>
      </header>
    </>
  );
}
