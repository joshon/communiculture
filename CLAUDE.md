# Communiculture — Claude Code Guidelines

## Avatar System

**ALWAYS use `CharacterGroup` from `AvatarRenderer.tsx` for any 3D avatar rendering.**

There are two avatar components in this repo — one is correct, one is not:

| Component | Status | When to use |
|---|---|---|
| `CharacterGroup` (exported from `AvatarRenderer.tsx`) | ✅ **Use this** | Any time you need a 3D avatar in a scene |
| `BlockyAvatar` (`BlockyAvatar.tsx`) | ❌ **Do not use** | Legacy/prototype — does not match the designed avatar |

`CharacterGroup` requires:
- `library: AvatarVariantLibrary` — loaded from `GET /api/dev/avatar-library`
- `variantIndices: Record<AvatarPart, number>` — which variant per part (default all 0)
- `colors: Record<AvatarPart, string>` — hex color per part

To use it outside the `AvatarRenderer` canvas wrapper, place it inside your own `<Canvas orthographic ...>` and load the library yourself:

```tsx
const [library, setLibrary] = useState<AvatarVariantLibrary | null>(null);
useEffect(() => {
  fetch("/api/dev/avatar-library").then(r => r.json()).then(d => setLibrary(d.library));
}, []);

// Inside Canvas:
{library && (
  <CharacterGroup
    library={library}
    variantIndices={variantIndices}
    colors={colors}
    showOutline={false}
  />
)}
```

### Camera
The designed camera angle for orthographic display is:
```
position: [2.165, 3.7, 3.75], zoom: 130, near: -100, far: 100
```
The camera looks at [0, 0, 0] by default. Avatar feet are at y ≈ 0.

### Color palette
Use the palette from `AvatarEditor.tsx` (`COLOR_PALETTE`, `SKIN_TONES`, `SKIN_PARTS`).
Skin parts `["head", "neck", "arms", "legs"]` should always share the same skin tone color.

## Fonts

| CSS var | Font | Files |
|---|---|---|
| `--font-pixelify` | CommPixel (pixel, regular width) | `public/CommPixel.{ttf,woff2,woff}` |
| `--font-commixel` | CommPixel (alias) | same |
| CommPixelNarrow | Narrow pixel variant | `public/CommPixelNarrow.{ttf,woff2,woff}` |
| Proletarian | Body/UI text | `public/Proletarian Regular.{ttf,woff2}` |

To regenerate fonts: `python3 scripts/build_pixel_font.py` or `python3 scripts/build_pixel_font_narrow.py`.

## Logo

The logo SVG is at `public/logo.svg` (361×65). It includes both "communi*culture" and "a division of futurefarmers".
Always use `<Image src="/logo.svg" width={361} height={65} style={{ width: "...", height: "auto" }} />`.
The asterisk (*) is at approximately x=60% from the left of the SVG.

## Buttons

**Label capitalization (buttons & links):** sentence case — capitalize only the first letter of the first word and any proper nouns. E.g. `New continuum`, `Log out`, `About Communiculture`, `Email me a sign-in link`. Not `+ new continuum`, not Title Case. (Exception: the breadcrumb nav is intentionally all-lowercase.)

Use `<PillButton>` from `components/ui/PillButton.tsx` for all call-to-action buttons.

**Drop shadow.** Primary and secondary buttons carry the same pixel-checkerboard
offset shadow as the speech bubble on continuum person rollovers — bottom-right,
one `--tile` pattern deep. The graphic lives in `components/ui/usePixelShadow.ts`
and is shared by `PixelBox`/`SpeechBubble` (bottom-left) and `PillButton`
(bottom-right); change it there, not in either consumer. Buttons have **square
corners** (`borderRadius: 0`) — no pills, no rounding — so the shadow strips sit
flush at the corners. The shadow reads as the button's *active* state and is
dropped while `loading` or `disabled`.

Three tiers:

| Tier | `variant` prop | Appearance | When to use |
|---|---|---|---|
| **Primary** | `variant="primary"` | Blue fill (`#0083FF`), white text, pixel shadow | Main action (e.g. Save, Submit, Send link) |
| **Secondary** | `variant="secondary"` | White fill, blue border + blue text, pixel shadow | Alternative / less-prominent action (e.g. Random, Cancel) |
| **Tertiary** | *(no PillButton — plain `<button>`)* | No bg/border, blue text, `textDecoration: underline` | Lowest-priority action (e.g. Reset, "Create a new account") |

Tertiary pattern:
```tsx
<button
  onClick={handler}
  style={{
    fontFamily: "Inter, sans-serif",
    color: "#0083FF",
    background: "none",
    border: "none",
    cursor: "pointer",
    textDecoration: "underline",
    padding: 0,
  }}
>
  reset
</button>
```

## Form controls & filter chips

Square edges throughout — no pills, no rounded corners on controls.

| Control | Border | Radius |
|---|---|---|
| Text inputs (e.g. dashboard search) | `2px solid #1a1a1a` | 0 |
| Sort trigger, sort-direction toggle, filter chips | `1.5px solid #0083FF` | 0 |
| Active filter chip | blue fill, white text | 0 |

Inputs are full four-sided boxes, not underlines. Dropdown menus use `PixelBox`
with `1.5px dotted #0083FF` rules between entries (never above the first).
Don't reintroduce grey `#ddd` borders or `borderRadius: 999` on these.

## Stack quick-reference

- **Next.js 14** App Router — server components by default, add `"use client"` when needed
- **React Three Fiber** — `@react-three/fiber` + `@react-three/drei` for 3D
- **Prisma** — schema at `packages/db/prisma/schema.prisma`; after schema changes run `prisma generate`
- **NextAuth** — config at `apps/web/src/lib/auth.ts`
- **pnpm workspaces** + **Turborepo** — run `pnpm dev` from root

## Dev server ports

`pnpm dev` starts the web app on **3000** and the socket server on **3001**.
Change them in `.claude/launch.json` and `.env` together — `NEXTAUTH_URL`,
`NEXT_PUBLIC_SOCKET_URL` and the socket CORS origin all hardcode them.

**Shared port registry.** If a `PROJECTS.md` exists three directories up, it is
the port registry for the sibling projects in `~/Documents/projects`; look for it
and keep it in sync. It is *not* part of this repository — don't assume it's
there. In a standalone clone it won't be, which is fine; the ports above are
still authoritative. Within that workspace this project owns 3000/3001 and every
sibling is pinned off them, so a bare `next dev` elsewhere must not squat here.

The launch config also defines **`conglomerate`** (5173) and
**`conglomerate-classic`** (4174), which live outside this repo at
`~/Desktop/Conglomerate/001`.
