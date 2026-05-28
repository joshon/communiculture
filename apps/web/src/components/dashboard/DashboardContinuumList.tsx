"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ContinuumPreviewBar } from "./ContinuumPreviewBar";

const INTER = "Inter, sans-serif";
const BLUE = "#0083FF";
const AVATAR_SIZE = "52px";

type Tab = "popular" | "recent" | "yours" | "standing";

export interface ContinuumItem {
  id: string;
  title: string;
  leftLabel: string;
  rightLabel: string;
  createdAt: string;
  ownerId: string;
  shareToken: string | null; // set for PUBLIC_LINK continuums, needed in href
  participantCount: number;
  myPosition: number | null; // 0–100, null if not a participant
  allPositions: number[];    // 0–100, non-synthetic only
}

interface Props {
  items: ContinuumItem[];
  userId: string;
  thumbnailUrl: string | null;
}

const TABS: { key: Tab; label: string }[] = [
  { key: "popular",  label: "Popular" },
  { key: "recent",   label: "Recent" },
  { key: "yours",    label: "Your continuums" },
  { key: "standing", label: "Where you stand" },
];

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}

export function DashboardContinuumList({ items, userId, thumbnailUrl }: Props) {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab | null) ?? "popular";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close suggestion dropdown on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const suggestions = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    const q = query.toLowerCase();
    return items
      .filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.leftLabel.toLowerCase().includes(q) ||
        c.rightLabel.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [items, query]);

  const filtered = useMemo(() => {
    let list = [...items];

    if (tab === "yours") {
      list = list.filter(c => c.ownerId === userId);
    } else if (tab === "standing") {
      list = list.filter(c => c.myPosition !== null);
    }

    if (tab === "popular") {
      list.sort((a, b) => b.participantCount - a.participantCount);
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.leftLabel.toLowerCase().includes(q) ||
        c.rightLabel.toLowerCase().includes(q)
      );
    }

    return list;
  }, [items, tab, query, userId]);

  const showBar = tab === "standing";
  const emptyMsg = query.trim()
    ? "No continuums match your search."
    : tab === "yours" ? "You haven't created any continuums yet."
    : tab === "standing" ? "You haven't placed yourself in any continuums yet."
    : "Nothing here yet.";

  return (
    <div>
      {/* ── Search bar ─────────────────────────────────────────────────────── */}
      <div ref={searchRef} style={{ position: "relative", marginBottom: 24 }}>
        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="Search questions and positions…"
            value={query}
            onChange={e => { setQuery(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 36px 10px 14px",
              fontFamily: INTER,
              fontSize: 15,
              color: "#1a1a1a",
              border: "1.5px solid #1a1a1a",
              outline: "none",
              background: "white",
              borderRadius: 0,
            }}
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setShowSuggestions(false); }}
              style={{
                position: "absolute", right: 10, top: "50%",
                transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                color: "#999", fontSize: 20, lineHeight: 1, padding: 0,
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Suggestion dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "white",
            border: "1.5px solid #1a1a1a",
            borderTop: "none",
            zIndex: 100,
          }}>
            {suggestions.map(c => {
              const href = c.ownerId === userId || !c.shareToken
                ? `/continuum/${c.id}`
                : `/continuum/${c.id}?token=${c.shareToken}`;
              return (
              <Link
                key={c.id}
                href={href}
                onClick={() => setShowSuggestions(false)}
                style={{
                  display: "block",
                  padding: "9px 14px",
                  textDecoration: "none",
                  borderBottom: "1px solid #f0f0f0",
                }}
              >
                <div style={{ fontFamily: INTER, fontSize: 14, fontWeight: 500, color: "#1a1a1a" }}>
                  {c.title}
                </div>
                <div style={{ fontFamily: INTER, fontSize: 12, color: "#888", marginTop: 2 }}>
                  {c.leftLabel} ↔ {c.rightLabel}
                </div>
              </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        gap: 0,
        marginBottom: 28,
        borderBottom: "1.5px solid #e0e0e0",
        overflowX: "auto",
      }}>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              fontFamily: INTER,
              fontSize: 14,
              fontWeight: tab === key ? 600 : 400,
              color: tab === key ? BLUE : "#888",
              background: "none",
              border: "none",
              borderBottom: tab === key ? `2px solid ${BLUE}` : "2px solid transparent",
              cursor: "pointer",
              padding: "0 16px 10px",
              marginBottom: -1.5,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── List ────────────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <p style={{ fontFamily: INTER, fontSize: 15, color: "#999", padding: "16px 0" }}>
          {emptyMsg}
        </p>
      ) : (
        filtered.map(c => {
          const href = c.ownerId === userId || !c.shareToken
            ? `/continuum/${c.id}`
            : `/continuum/${c.id}?token=${c.shareToken}`;
          return (
          <Link
            key={c.id}
            href={href}
            style={{ display: "block", textDecoration: "none", color: "inherit" }}
          >
            {/* Meta row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <span style={{ fontFamily: INTER, fontSize: 13, color: "#aaa" }}>
                {formatDate(c.createdAt)}
              </span>
              <span style={{ fontFamily: INTER, fontSize: 13, color: "#aaa" }}>
                {c.participantCount} {c.participantCount === 1 ? "response" : "responses"}
              </span>
            </div>

            {/* Title */}
            <p style={{ fontFamily: INTER, fontSize: 16, fontWeight: 600, color: "#1a1a1a", margin: "0 0 6px" }}>
              {c.title}
            </p>

            {/* Pole labels */}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: INTER, fontSize: 14, color: "#555" }}>{c.leftLabel}</span>
              <span style={{ fontFamily: INTER, fontSize: 14, color: "#555" }}>{c.rightLabel}</span>
            </div>

            {/* Preview bar — only on "Where you stand" */}
            {showBar && c.myPosition !== null && (
              <ContinuumPreviewBar
                positions={c.allPositions}
                userPosition={c.myPosition}
                thumbnailUrl={thumbnailUrl}
                avatarSize={AVATAR_SIZE}
              />
            )}

            <div style={{ height: 1, background: "#ebebeb", margin: "14px 0" }} />
          </Link>
          );
        })
      )}
    </div>
  );
}
