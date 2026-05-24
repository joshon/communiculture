"use client";

import Link from "next/link";
import Image from "next/image";
import { DashboardAvatarHead } from "@/components/dashboard/DashboardAvatarHead";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useAvatarStore } from "@/store/avatarStore";

const INTER = "Inter, sans-serif";

export interface Breadcrumb {
  label: string;
  href?: string; // omit for current page (renders as bold text)
}

interface AppHeaderProps {
  breadcrumbs?: Breadcrumb[];
}

export function AppHeader({ breadcrumbs = [] }: AppHeaderProps) {
  const isMobile = useIsMobile(1024);
  const thumbnailUrl = useAvatarStore((s) => s.thumbnailUrl);

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
            <Link href="/dashboard" style={{ display: "block", flexShrink: 0 }}>
              <Image src="/logo.svg" alt="communi*culture" width={208} height={41}
                style={{ width: 161, height: "auto", display: "block" }} priority />
            </Link>
            <DashboardAvatarHead thumbnailUrl={thumbnailUrl} size="55px" />
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
        <Link href="/dashboard" style={{ display: "block", flexShrink: 0 }}>
          <Image src="/logo.svg" alt="communi*culture" width={208} height={41}
            style={{ width: "clamp(120px, 20vw, 180px)", height: "auto", display: "block" }} priority />
        </Link>
        {crumbBar && <div style={{ flex: 1 }}>{crumbBar}</div>}
        <div style={{ flexShrink: 0, marginLeft: crumbBar ? 0 : "auto" }}>
          <DashboardAvatarHead thumbnailUrl={thumbnailUrl} size="60px" />
        </div>
      </header>
    </>
  );
}
