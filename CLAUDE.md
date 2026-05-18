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

## Stack quick-reference

- **Next.js 14** App Router — server components by default, add `"use client"` when needed
- **React Three Fiber** — `@react-three/fiber` + `@react-three/drei` for 3D
- **Prisma** — schema at `packages/db/prisma/schema.prisma`; after schema changes run `prisma generate`
- **NextAuth** — config at `apps/web/src/lib/auth.ts`
- **pnpm workspaces** + **Turborepo** — run `pnpm dev` from root
