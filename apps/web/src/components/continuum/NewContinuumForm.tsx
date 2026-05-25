"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/ui/AppHeader";
import { PillButton } from "@/components/ui/PillButton";
import Link from "next/link";
import Select, { components, StylesConfig, DropdownIndicatorProps } from "react-select";

const INTER = "Inter, sans-serif";
const BLUE = "#0083FF";

const BREADCRUMBS = [
  { label: "home", href: "/dashboard" },
  { label: "new continuum" },
];

type Visibility = "PUBLIC" | "PUBLIC_LINK" | "PASSWORD";

type Option = { value: string; label: string };

const VISIBILITY_OPTIONS: Option[] = [
  { value: "PUBLIC", label: "Publicly listed" },
  { value: "PUBLIC_LINK", label: "Public link — unlisted" },
  { value: "PASSWORD", label: "Link with password" },
];

const TOPICS: Option[] = [
  { value: "art-design", label: "Art & Design" },
  { value: "business-finance", label: "Business & Finance" },
  { value: "culture-society", label: "Culture & Society" },
  { value: "current-events", label: "Current Events" },
  { value: "education", label: "Education" },
  { value: "environment-climate", label: "Environment & Climate" },
  { value: "film-tv", label: "Film & TV" },
  { value: "food-drink", label: "Food & Drink" },
  { value: "gaming", label: "Gaming" },
  { value: "health-wellbeing", label: "Health & Wellbeing" },
  { value: "history", label: "History" },
  { value: "humor", label: "Humor" },
  { value: "music", label: "Music" },
  { value: "philosophy-ethics", label: "Philosophy & Ethics" },
  { value: "politics", label: "Politics" },
  { value: "relationships", label: "Relationships" },
  { value: "science-nature", label: "Science & Nature" },
  { value: "sports", label: "Sports" },
  { value: "technology", label: "Technology" },
  { value: "travel", label: "Travel" },
  { value: "work-career", label: "Work & Career" },
];

const ChevronIndicator = (props: DropdownIndicatorProps<Option>) => (
  <components.DropdownIndicator {...props}>
    <svg width="20" height="13" viewBox="0 0 20 13" fill="none" aria-hidden>
      <path d="M2 2L10.0156 10.0156L18.0312 2" stroke="#0083FF" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  </components.DropdownIndicator>
);

const makeSelectStyles = (): StylesConfig<Option> => ({
  control: (base) => ({
    ...base,
    border: "none",
    borderBottom: "1.5px solid #AAAAAA",
    borderRadius: 0,
    boxShadow: "none",
    background: "transparent",
    minHeight: "unset",
    cursor: "pointer",
    "&:hover": { borderColor: "#888" },
  }),
  valueContainer: (base) => ({ ...base, padding: "0 0 4px 0" }),
  indicatorsContainer: (base) => ({ ...base, paddingBottom: 4 }),
  dropdownIndicator: (base) => ({ ...base, padding: "0 0 0 8px" }),
  indicatorSeparator: () => ({ display: "none" }),
  clearIndicator: () => ({ display: "none" }),
  input: (base) => ({ ...base, fontFamily: INTER, fontSize: 16, color: "#1a1a1a", margin: 0, padding: 0 }),
  singleValue: (base) => ({ ...base, fontFamily: INTER, fontSize: 16, color: "#1a1a1a", margin: 0 }),
  placeholder: (base) => ({ ...base, fontFamily: INTER, fontSize: 16, color: "#AAAAAA", margin: 0 }),
  menu: (base) => ({
    ...base, borderRadius: 0, border: `1px solid ${BLUE}`,
    boxShadow: "3px 3px 0 rgba(0,131,255,0.15)", marginTop: 4,
  }),
  option: (base, state) => ({
    ...base,
    fontFamily: INTER,
    fontSize: 16,
    color: state.isSelected ? "white" : "#1a1a1a",
    background: state.isSelected ? BLUE : state.isFocused ? "#e8f3ff" : "white",
    cursor: "pointer",
    padding: "10px 16px",
  }),
});

const selectStyles = makeSelectStyles();

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  borderBottom: "1.5px solid #AAAAAA",
  outline: "none",
  fontFamily: INTER,
  fontSize: 16,
  color: "#1a1a1a",
  background: "transparent",
  paddingBottom: 4,
  resize: "none",
  overflow: "hidden",
  lineHeight: 1.5,
  display: "block",
};

function autoGrow(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "baseline",
      gap: "clamp(8px, 2vw, 16px)",
      marginBottom: "clamp(20px, 3vh, 28px)",
    }}>
      <label style={{
        fontFamily: INTER, fontSize: 16, fontWeight: 500, color: "#1a1a1a",
        width: "clamp(84px, 12vw, 110px)", flexShrink: 0,
        textAlign: "right", lineHeight: 1,
      }}>
        {label}
      </label>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

export function NewContinuumForm({ canCreate }: { canCreate: boolean }) {
  const router = useRouter();
  const [title, setTitle]             = useState("");
  const [leftLabel, setLeftLabel]     = useState("");
  const [rightLabel, setRightLabel]   = useState("");
  const [visibility, setVisibility]   = useState<Visibility>("PUBLIC_LINK");
  const [category, setCategory]       = useState<Option | null>(null);
  const [password, setPassword]       = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  const visibilityOption = VISIBILITY_OPTIONS.find((o) => o.value === visibility) ?? VISIBILITY_OPTIONS[1];

  const ready =
    title.trim() &&
    leftLabel.trim() &&
    rightLabel.trim() &&
    (visibility !== "PUBLIC" || category) &&
    (visibility !== "PASSWORD" || password.trim());

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/continuums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, leftLabel, rightLabel, visibility, description: "",
          category: category?.label ?? null,
          password: password || null,
        }),
      });
      if (res.status === 402) {
        setError("You've reached the free limit (3 continuums). Upgrade to create more.");
        return;
      }
      if (!res.ok) { setError("Something went wrong. Try again."); return; }
      const continuum = await res.json();
      router.push(`/continuum/${continuum.id}`);
    } finally {
      setLoading(false);
    }
  }, [ready, title, leftLabel, rightLabel, visibility, category, password, router]);

  return (
    <div style={{ minHeight: "100vh", background: "white" }}>
      <AppHeader breadcrumbs={BREADCRUMBS} />

      <main style={{
        paddingTop: "clamp(40px, 8vh, 80px)",
        paddingBottom: 80,
        paddingLeft: "clamp(16px, 5vw, 48px)",
        paddingRight: "clamp(16px, 5vw, 48px)",
      }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>

          <h1 style={{
            fontFamily: INTER, fontSize: "clamp(24px, 4vw, 32px)",
            fontWeight: 600, color: "#1a1a1a",
            margin: "0 0 12px",
          }}>
            New continuum
          </h1>
          <p style={{
            fontFamily: INTER, fontSize: 16, color: "#888",
            margin: "0 0 clamp(32px, 5vh, 48px)", lineHeight: 1.5,
          }}>
            Write a question that can be answered along a spectrum between two positions
          </p>

          {!canCreate ? (
            <p style={{ fontFamily: INTER, fontSize: 16, color: "#888" }}>
              You&apos;ve reached the free limit of 3 continuums.{" "}
              <Link href="/billing" style={{ color: BLUE, textDecoration: "underline" }}>Upgrade</Link>{" "}
              to create more.
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              <Field label="Question">
                <textarea
                  required
                  rows={1}
                  placeholder="e.g. which do you prefer?"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); autoGrow(e.target); }}
                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                  style={inputStyle}
                />
              </Field>

              <Field label="Position 1">
                <textarea
                  required
                  rows={1}
                  placeholder="e.g. cats"
                  value={leftLabel}
                  onChange={(e) => { setLeftLabel(e.target.value); autoGrow(e.target); }}
                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                  style={inputStyle}
                />
              </Field>

              <Field label="Position 2">
                <textarea
                  required
                  rows={1}
                  placeholder="e.g. dogs"
                  value={rightLabel}
                  onChange={(e) => { setRightLabel(e.target.value); autoGrow(e.target); }}
                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                  style={inputStyle}
                />
              </Field>

              <Field label="Visibility">
                <Select<Option>
                  instanceId="visibility"
                  options={VISIBILITY_OPTIONS}
                  value={visibilityOption}
                  onChange={(opt) => opt && setVisibility(opt.value as Visibility)}
                  isSearchable={false}
                  styles={selectStyles}
                  components={{ DropdownIndicator: ChevronIndicator }}
                />
              </Field>

              {visibility === "PUBLIC" && (
                <Field label="Topic">
                  <Select<Option>
                    instanceId="category"
                    options={TOPICS}
                    value={category}
                    onChange={(opt) => setCategory(opt)}
                    isSearchable
                    placeholder="Search topics…"
                    styles={selectStyles}
                    components={{ DropdownIndicator: ChevronIndicator }}
                  />
                </Field>
              )}

              {visibility === "PASSWORD" && (
                <Field label="Password">
                  <input
                    type="password"
                    required
                    placeholder="Set a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ ...inputStyle, resize: undefined, overflow: undefined, lineHeight: undefined, display: undefined }}
                  />
                </Field>
              )}

              {error && (
                <p style={{ fontFamily: INTER, fontSize: 14, color: "#c00", marginBottom: 16, textAlign: "right" }}>
                  {error}
                </p>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <PillButton
                  type="submit"
                  arrow
                  label="Create"
                  loading={loading}
                  style={!ready ? { opacity: 0.4, cursor: "default" } : undefined}
                />
              </div>
            </form>
          )}

        </div>
      </main>
    </div>
  );
}
