"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { ContinuumPreviewBar } from "./ContinuumPreviewBar";
import { PixelBox } from "@/components/ui/PixelBox";

const INTER = "Inter, sans-serif";
const BLUE = "#0083FF";
const AVATAR_SIZE = "52px";
// A continuum is "full" once it hits the crowd cap (real participants); below
// that it still has room, i.e. it's open to join.
const FULL_AT = 100;

type SortKey = "popular" | "active" | "created";
type SortDir = "asc" | "desc";
type FilterKey = "open" | "mine" | "in";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "popular", label: "Popular" },
  { key: "active", label: "Last active" },
  { key: "created", label: "Date created" },
];

// Boolean filter chips. "mine"/"in" widen the scope to your own / participating
// continuums (any visibility); "open" narrows whatever's in view.
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "open", label: "Are open" },
  { key: "mine", label: "You own" },
  { key: "in", label: "You are in" },
];

export interface ContinuumItem {
  id: string;
  title: string;
  leftLabel: string;
  rightLabel: string;
  createdAt: string;
  deletedAt: string | null;
  ownerId: string;
  visibility: string;
  category: string | null;
  closedAt: string | null;
  lastActivityAt: string;
  shareToken: string | null;
  participantCount: number;
  myPosition: number | null;
  allPositions: number[];
}

interface Props {
  items: ContinuumItem[];
  archived: ContinuumItem[];
  userId: string;
  thumbnailUrl: string | null;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getUTCMonth() + 1).padStart(2, "0")}/${String(d.getUTCDate()).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

function ContinuumRow({
  c, userId, showBar, thumbnailUrl, onDelete,
}: {
  c: ContinuumItem;
  userId: string;
  showBar: boolean;
  thumbnailUrl: string | null;
  onDelete?: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const href = c.ownerId === userId || !c.shareToken
    ? `/continuum/${c.id}`
    : `/continuum/${c.id}?token=${c.shareToken}`;

  const canDelete = !!onDelete && c.ownerId === userId;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirming) { setConfirming(true); return; }
    setDeleting(true);
    await fetch(`/api/continuums/${c.id}`, { method: "DELETE" });
    onDelete?.(c.id);
  };

  return (
    <div>
      {/* Meta row: date | responses | delete */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontFamily: INTER, fontSize: 13, color: "#aaa" }}>{formatDate(c.createdAt)}</span>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontFamily: INTER, fontSize: 13, color: "#aaa" }}>
            {c.participantCount} {c.participantCount === 1 ? "response" : "responses"}
          </span>
          {canDelete && !confirming && (
            <button onClick={handleDelete} disabled={deleting} style={{ fontFamily: INTER, fontSize: 12, color: "#ccc", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
              {deleting ? "deleting…" : "delete"}
            </button>
          )}
          {canDelete && confirming && !deleting && (
            <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontFamily: INTER, fontSize: 11, color: "#888" }}>won&apos;t free a slot —</span>
              <button onClick={handleDelete} style={{ fontFamily: INTER, fontSize: 12, color: "#cc2222", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>confirm</button>
              <button onClick={e => { e.preventDefault(); setConfirming(false); }} style={{ fontFamily: INTER, fontSize: 12, color: "#aaa", background: "none", border: "none", cursor: "pointer", padding: 0 }}>cancel</button>
            </span>
          )}
        </div>
      </div>

      <Link href={href} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
        <p style={{ fontFamily: INTER, fontSize: 16, fontWeight: 600, color: "#1a1a1a", margin: "0 0 6px" }}>
          {c.title}
        </p>

        {showBar && c.myPosition !== null && (
          <ContinuumPreviewBar
            positions={c.allPositions}
            userPosition={c.myPosition}
            thumbnailUrl={thumbnailUrl}
            avatarSize={AVATAR_SIZE}
            showDots={false}
          />
        )}

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontFamily: INTER, fontSize: 14, color: "#555" }}>{c.leftLabel}</span>
          <span style={{ fontFamily: INTER, fontSize: 14, color: "#555" }}>{c.rightLabel}</span>
        </div>
      </Link>

      <div style={{ height: 1, background: "#ebebeb", margin: "14px 0" }} />
    </div>
  );
}

// Sort-criteria dropdown using the pixel menu box (same as the logo menu).
function SortMenu({ value, onChange }: { value: SortKey; onChange: (k: SortKey) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = SORTS.find(s => s.key === value) ?? SORTS[0];

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <style>{`.cc-sort-mi{color:rgba(0,0,0,0.6)}.cc-sort-mi:hover{color:#000}`}</style>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          fontFamily: INTER, fontSize: 13, fontWeight: 600, color: "#1a1a1a",
          border: "1.5px solid #ddd", borderRadius: 999, background: "white",
          padding: "5px 12px", cursor: "pointer", whiteSpace: "nowrap",
        }}
      >
        {current.label}
        <svg width="11" height="7" viewBox="0 0 11 7" fill="none" aria-hidden>
          <path d="M1 1l4.5 4.5L10 1" stroke="#0083FF" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 6, zIndex: 50, ["--tile" as keyof React.CSSProperties]: "2px" }}>
          <PixelBox shadowDir="bottom-right" style={{ minWidth: 150 }}>
            {SORTS.map(s => (
              <button
                key={s.key}
                onClick={() => { onChange(s.key); setOpen(false); }}
                className="cc-sort-mi"
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  fontFamily: INTER, fontSize: 14,
                  color: s.key === value ? BLUE : undefined,
                  fontWeight: s.key === value ? 600 : 400,
                  background: "none", border: "none", cursor: "pointer",
                  padding: "9px 16px", whiteSpace: "nowrap",
                }}
              >
                {s.label}
              </button>
            ))}
          </PixelBox>
        </div>
      )}
    </div>
  );
}

export function DashboardContinuumList({ items: initialItems, archived, userId, thumbnailUrl }: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  const [sort, setSort] = useState<SortKey>(() => {
    const s = sp.get("sort");
    return s === "active" || s === "created" ? s : "popular";
  });
  const [sortDir, setSortDir] = useState<SortDir>(() => (sp.get("dir") === "asc" ? "asc" : "desc"));
  const [filters, setFilters] = useState<Set<FilterKey>>(() => {
    const valid = new Set(FILTERS.map(f => f.key));
    return new Set((sp.get("f")?.split(",") ?? []).filter((k): k is FilterKey => valid.has(k as FilterKey)));
  });
  const [query, setQuery] = useState(() => sp.get("q") ?? "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [items, setItems] = useState(initialItems);
  const [showArchived, setShowArchived] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Keep the URL in sync (shareable / restorable) without re-running the server
  // component — replaceState doesn't trigger a navigation.
  useEffect(() => {
    const p = new URLSearchParams();
    if (sort !== "popular") p.set("sort", sort);
    if (sortDir !== "desc") p.set("dir", sortDir);
    if (filters.size) p.set("f", [...filters].join(","));
    if (query.trim()) p.set("q", query.trim());
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [sort, sortDir, filters, query]);

  const toggleFilter = (key: FilterKey) => {
    setFilters(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleDelete = (id: string) => {
    setItems(prev => prev.filter(c => c.id !== id));
    router.refresh();
  };

  const matchesQuery = (c: ContinuumItem, q: string) =>
    c.title.toLowerCase().includes(q) ||
    c.leftLabel.toLowerCase().includes(q) ||
    c.rightLabel.toLowerCase().includes(q) ||
    (!!c.category && c.category.toLowerCase().includes(q));

  const suggestions = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    const q = query.toLowerCase();
    return items.filter(c => matchesQuery(c, q)).slice(0, 6);
  }, [items, query]);

  const filtered = useMemo(() => {
    const wantMine = filters.has("mine");
    const wantIn = filters.has("in");

    // Scope: with no mine/in filter this is a discovery feed (publicly listed
    // only). "Mine"/"I'm in" widen it to your own / participating continuums
    // (any visibility), unioned.
    let list = items.filter(c => {
      if (wantMine || wantIn) {
        return (wantMine && c.ownerId === userId) || (wantIn && c.myPosition !== null);
      }
      return c.visibility === "PUBLIC";
    });

    if (filters.has("open")) list = list.filter(c => c.participantCount < FULL_AT);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(c => matchesQuery(c, q));
    }

    // desc = "more / newer first"; the direction toggle flips it.
    const dir = sortDir === "asc" ? 1 : -1;
    const metric = (c: ContinuumItem) =>
      sort === "popular" ? c.participantCount
      : sort === "active" ? new Date(c.lastActivityAt).getTime()
      : new Date(c.createdAt).getTime();
    list = [...list].sort((a, b) => dir * (metric(a) - metric(b)));
    return list;
  }, [items, sort, sortDir, filters, query, userId]);

  const showBar = filters.has("in");
  const emptyMsg = query.trim()
    ? "No continuums match your search."
    : filters.size > 0
    ? "Nothing matches these filters."
    : "Nothing here yet.";

  return (
    <div>
      {/* Search */}
      <div ref={searchRef} style={{ position: "relative", marginBottom: 16 }}>
        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="Search questions, positions, and topics…"
            value={query}
            onChange={e => { setQuery(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            style={{
              width: "100%", boxSizing: "border-box", padding: "10px 36px 10px 14px",
              fontFamily: INTER, fontSize: 15, color: "#1a1a1a",
              border: "1.5px solid #1a1a1a", outline: "none", background: "white", borderRadius: 0,
            }}
          />
          {query && (
            <button onClick={() => { setQuery(""); setShowSuggestions(false); }} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#999", fontSize: 20, lineHeight: 1, padding: 0 }}>×</button>
          )}
        </div>
        {showSuggestions && suggestions.length > 0 && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1.5px solid #1a1a1a", borderTop: "none", zIndex: 100 }}>
            {suggestions.map(c => {
              const href = c.ownerId === userId || !c.shareToken ? `/continuum/${c.id}` : `/continuum/${c.id}?token=${c.shareToken}`;
              return (
                <Link key={c.id} href={href} onClick={() => setShowSuggestions(false)} style={{ display: "block", padding: "9px 14px", textDecoration: "none", borderBottom: "1px solid #f0f0f0" }}>
                  <div style={{ fontFamily: INTER, fontSize: 14, fontWeight: 500, color: "#1a1a1a" }}>{c.title}</div>
                  <div style={{ fontFamily: INTER, fontSize: 12, color: "#888", marginTop: 2 }}>{c.leftLabel} ↔ {c.rightLabel}</div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Sort · Filters · Topic — wraps on narrow screens */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 24 }}>
        <span style={{ fontFamily: INTER, fontSize: 13, color: "#888", marginRight: 2 }}>Sort by:</span>
        <SortMenu value={sort} onChange={setSort} />
        <button
          onClick={() => setSortDir(d => (d === "asc" ? "desc" : "asc"))}
          aria-label={sortDir === "desc" ? "Descending — switch to ascending" : "Ascending — switch to descending"}
          title={sortDir === "desc" ? "Descending" : "Ascending"}
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            border: "1.5px solid #ddd", borderRadius: 8, background: "white",
            width: 30, height: 30, cursor: "pointer", padding: 0,
          }}
        >
          <svg width="12" height="16" viewBox="0 0 12 16" fill="none" aria-hidden>
            <path d="M3 5.5L6 2.5L9 5.5" stroke={sortDir === "asc" ? BLUE : "#bbb"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 10.5L6 13.5L9 10.5" stroke={sortDir === "desc" ? BLUE : "#bbb"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <span style={{ width: "1.5px", height: 18, background: "#e0e0e0", margin: "0 4px" }} />

        <span style={{ fontFamily: INTER, fontSize: 13, color: "#888", marginRight: 2 }}>Continuums that:</span>
        {FILTERS.map(({ key, label }) => {
          const active = filters.has(key);
          return (
            <button
              key={key}
              onClick={() => toggleFilter(key)}
              aria-pressed={active}
              style={{
                fontFamily: INTER, fontSize: 13,
                padding: "5px 12px", borderRadius: 999,
                border: `1.5px solid ${active ? BLUE : "#ddd"}`,
                background: active ? BLUE : "white",
                color: active ? "white" : "#555",
                fontWeight: active ? 600 : 400,
                cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <p style={{ fontFamily: INTER, fontSize: 15, color: "#999", padding: "16px 0" }}>{emptyMsg}</p>
      ) : (
        filtered.map(c => (
          <ContinuumRow
            key={c.id}
            c={c}
            userId={userId}
            showBar={showBar}
            thumbnailUrl={thumbnailUrl}
            onDelete={filters.has("mine") ? handleDelete : undefined}
          />
        ))
      )}

      {/* Archived section */}
      {archived.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <button
            onClick={() => setShowArchived(v => !v)}
            style={{ fontFamily: INTER, fontSize: 13, color: "#aaa", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
          >
            {showArchived ? "hide" : "show"} archived continuums ({archived.length})
          </button>
          {showArchived && (
            <div style={{ marginTop: 16, opacity: 0.6 }}>
              {archived.map(c => (
                <ContinuumRow
                  key={c.id}
                  c={c}
                  userId={userId}
                  showBar={false}
                  thumbnailUrl={thumbnailUrl}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
