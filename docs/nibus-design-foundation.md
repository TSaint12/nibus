# Nibus — Phase 0.5: Design Foundation Spec
### Slots into the feature build pack, immediately after Phase 0 and before any UI phase

This establishes the visual identity as code so every screen Claude Code builds inherits it from one source instead of being art-directed individually. Implement this **before** Phases 1–8 of the feature pack (the book page, nav, profiles, etc. all consume these tokens and components).

Stack reminder: Next.js 16 (App Router), React 19, Tailwind v4, dark-first.

---

## 0. What this phase produces

| File | Purpose |
|---|---|
| `src/app/globals.css` (edit) | Design tokens via Tailwind v4 `@theme` + base body styles |
| `src/lib/fonts.ts` (new) | `next/font` setup for the two typefaces |
| `src/app/layout.tsx` (edit) | Apply font variables + base bg/text |
| `src/components/brand/BurstLogo.tsx` (new) | The logo mark as an SVG component, with variants |
| `src/components/brand/Logo.tsx` (new) | Mark + wordmark lockups (horizontal / stacked) |
| `src/components/brand/KrackleField.tsx` (new) | Reusable Kirby-dot texture for empty states / flourishes |

No schema changes. No data layer. Pure presentation.

---

## 1. Design tokens

The whole palette and the semantic aliases live in `globals.css` using Tailwind v4's `@theme` so they're available as utilities (`bg-ink`, `text-foil`, etc.) **and** as raw CSS variables.

```css
@import "tailwindcss";

@theme {
  /* ── Raw brand palette ── */
  --color-ink: #0F1422;        /* base background (dark-first) */
  --color-ink-tile: #12182A;   /* app-icon tile / slightly lifted ink */
  --color-slate: #1C2433;      /* cards, surfaces, chips */
  --color-slate-2: #27324C;    /* raised surface / hover */
  --color-foil: #D4A84B;       /* primary accent — value, ratings, the spine */
  --color-foil-bright: #E6BC63;/* highlight on the foil (logo spine) */
  --color-vermilion: #F0533A;  /* action — CTAs, logging, "do something" */
  --color-pulp: #F2E7D3;       /* paper — primary text on dark, light surfaces */
  --color-muted: #8A93A6;      /* secondary text */
  --color-keyline: #14203A;    /* inked outline / logo on light bg */

  /* ── Semantic aliases (use these in components) ── */
  --color-bg: var(--color-ink);
  --color-surface: var(--color-slate);
  --color-surface-raised: var(--color-slate-2);
  --color-text: var(--color-pulp);
  --color-text-muted: var(--color-muted);
  --color-accent: var(--color-foil);    /* premium / ratings */
  --color-action: var(--color-vermilion);/* buttons / logging */

  /* ── Type ── */
  --font-display: var(--font-bricolage), ui-sans-serif, system-ui, sans-serif;
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;

  /* ── Radius ── */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;
}
```

Base body styles (also in `globals.css`):

```css
body {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}
```

**Dark-first, light deferred.** The app is dark-primary (collector mood, covers pop). A light theme is not required for launch; if added later, it flips `--color-bg`→pulp, `--color-text`→ink, `--color-surface`→a warm off-white, and the logo switches to its light variant (§3). Don't build a light theme now — just don't hardcode colors anywhere, always reference the tokens, so it stays possible.

---

## 2. Typography

Two typefaces, both from Google Fonts, loaded via `next/font` (self-hosted at build, no layout shift, no external request at runtime).

`src/lib/fonts.ts`:

```ts
import { Bricolage_Grotesque, Inter } from "next/font/google";

export const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});
```

In `src/app/layout.tsx`, attach both variables to `<html>`:

```tsx
import { bricolage, inter } from "@/lib/fonts";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

**Roles & scale:**
- **Display — Bricolage Grotesque.** The wordmark, page titles, book titles, big numbers. Weights 700/800 for the wordmark and hero titles, 500 for section headings.
- **Text — Inter.** Everything functional: body copy, reviews, metadata, labels, buttons.

| Token | Font | Size / line-height / weight | Use |
|---|---|---|---|
| `display-xl` | Bricolage | 40px / 1.0 / 700 | wordmark, splash |
| `title` | Bricolage | 24px / 1.1 / 700 | book title, page H1 |
| `heading` | Bricolage | 18px / 1.2 / 500 | section headers |
| `body` | Inter | 16px / 1.6 / 400 | reviews, copy |
| `label` | Inter | 13px / 1.4 / 500 | metadata, chips, UI labels |
| `caption` | Inter | 12px / 1.4 / 400 | timestamps, hints |

Titles use tight tracking (`letter-spacing: -0.02em`); body is default tracking. Sentence case everywhere except the wordmark.

---

## 3. The logo

The mark is a foil **burst** with an **N whose diagonal is a book** (gold spine + cream page-edge). Single white keyline on dark backgrounds; inked-navy keyline on light backgrounds.

`src/components/brand/BurstLogo.tsx`:

```tsx
type Props = {
  size?: number;                 // px, default 64
  variant?: "dark" | "light";    // dark = white outline; light = navy outline
  tile?: boolean;                // render the app-icon tile behind it
  className?: string;
};

const BURST =
  "60,10 69,29.3 87,17.9 84.2,39 105.5,39.2 91.7,55.4 109.5,67.1 89.1,73.3 " +
  "97.8,92.7 77.3,86.9 74.1,108 60,92 45.9,108 42.7,86.9 22.2,92.7 30.9,73.3 " +
  "10.5,67.1 28.3,55.4 14.5,39.2 35.8,39 33,17.9 51,29.3";

export function BurstLogo({ size = 64, variant = "dark", tile = false, className }: Props) {
  const outline = variant === "light" ? "#14203A" : "#F2E7D3";
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-label="Nibus"
      className={className}
    >
      {tile && <rect width="120" height="120" rx="28" fill="#12182A" />}
      <polygon points={BURST} fill="#D4A84B" stroke={outline} strokeWidth="3" strokeLinejoin="round" />
      {/* N — two uprights + a book as the diagonal */}
      <rect x="40" y="38" width="9" height="44" rx="1.5" fill="#14203A" />
      <rect x="71" y="38" width="9" height="44" rx="1.5" fill="#14203A" />
      <polygon points="50.6,35.8 80.6,75.8 69.4,84.2 39.4,44.2" fill="#14203A" />
      <polygon points="50.6,35.8 80.6,75.8 78.5,77.4 48.5,37.4" fill="#E6BC63" />
      <polygon points="39.4,44.2 69.4,84.2 71.5,82.6 41.5,42.6" fill="#F2E7D3" />
    </svg>
  );
}
```

`src/components/brand/Logo.tsx` — the lockups (mark + Bricolage wordmark):

```tsx
import { BurstLogo } from "./BurstLogo";

export function Logo({
  layout = "horizontal",      // "horizontal" | "stacked" | "mark"
  size = 40,
  variant = "dark",
}: { layout?: "horizontal" | "stacked" | "mark"; size?: number; variant?: "dark" | "light" }) {
  if (layout === "mark") return <BurstLogo size={size} variant={variant} />;
  const wordColor = variant === "light" ? "text-ink" : "text-pulp";
  const stacked = layout === "stacked";
  return (
    <div className={`flex items-center gap-3 ${stacked ? "flex-col text-center" : ""}`}>
      <BurstLogo size={stacked ? size * 1.6 : size} variant={variant} />
      <span
        className={`font-[family-name:var(--font-display)] font-bold tracking-[-0.04em] ${wordColor}`}
        style={{ fontSize: stacked ? size * 1.05 : size * 1.15, lineHeight: 1 }}
      >
        Nibus
      </span>
    </div>
  );
}
```

**Usage rules:**
- **Header / nav / tab bar:** `<Logo layout="horizontal" size={28} />` on the dark surface.
- **App icon / favicon:** `<BurstLogo size={N} tile />` (PWA `manifest.json` icons + favicon export from this at 512/192/32).
- **Splash / marketing / empty states:** `<Logo layout="stacked" size={64} />`.
- **On any light background:** pass `variant="light"` (switches the keyline to inked navy so it doesn't vanish).
- At ≤32px the book detail in the diagonal naturally simplifies to a solid N — that's intended; don't make a separate small asset.

---

## 4. Color usage rules

The palette only works if the two accents stay in their lanes:

- **Foil gold = value & rating.** Star ratings, "premium / Pro" cues, the logo, anything signaling worth or quality. Never use gold for a clickable action.
- **Vermilion = action.** The "+ New read" button, primary CTAs, the active tab indicator, logging confirmations. It means *do something*.
- **Pulp cream** = primary text on dark surfaces and "paper" fills. **Muted** = secondary text only.
- **Ink / slate** = backgrounds and surfaces; slate for cards and chips, slate-raised for hover.

Concretely: a star rating is gold; the button you press to add a rating is vermilion. Keeping that split is what makes the UI legible at a glance.

---

## 5. Core components

These are the atoms that repeat on every screen. Build them once here; every feature phase consumes them.

### Cover card — `src/components/library/BookCover.tsx` (extend existing)
- Aspect ratio `2 / 3`, `border-radius: var(--radius-md)`, `0.5px` slate border.
- Real cover when `cover_url` exists; otherwise the existing publisher-color fallback block with the title set in Bricolage 500, cream, on the publisher color.
- On web, hover lifts slightly (`translateY(-2px)`, 150ms) and the border brightens to foil — covers are the primary tap target everywhere, so they should feel alive.
- Always wrapped in a link to `/book/[id]`.

### Avatar — `src/components/profile/Avatar.tsx` (Phase 7)
- Circle. When `avatar` is null, generate a background color deterministically from the `handle` (hash the string → hue; `background: hsl(hue, 42%, 30%)` so it sits on dark), text in pulp cream, Bricolage 500.
- Show the **username**, not name-initials: render the first 1–2 characters of `@handle` at small sizes, scaling to a longer label only where space allows. (This is the "username over initials" rule — derive from the handle, not from first/last name.)
- Sizes: 24px (feed inline), 32px (lists), 44px (cards), 72px (profile header).

### Button
- **Primary (action):** `background: var(--color-vermilion)`, text `#14203A` (ink), `border-radius: var(--radius-md)`, Inter 500, `active:scale(0.98)`. This is the "+ New read" button and all primary CTAs.
- **Secondary:** transparent, `0.5px` slate border, pulp text, hover fills slate.
- **Ghost:** no border, muted text, hover pulp.

### Rating stars — `src/components/library/StarRating.tsx` (existing)
- Foil gold fill, half-star increments, empty state in slate. Used on the book page (your rating), feed cards (finished events), and profiles.

### Chips
- **Format chip** (Omnibus / Compendium / DC Absolute): foil text on a translucent foil fill (`color: #D4A84B; background: rgba(212,168,75,.14)`), pill radius.
- **Meta chip** (publisher · year): muted text on slate, pill radius.

---

## 6. Comic devices — reusable brand texture

The logo isn't the only place the comic language shows up. Three devices recur so the whole app feels of-a-piece:

- **The burst** (`BurstLogo`, or a plain gold burst with no N): use for celebration moments — an achievement unlock, the confirmation flash when you log a read, the "your feed is empty, log your first read" hero.
- **Kirby krackle / halftone dots** (`KrackleField`): a scatter of dark dots (with the occasional gold spark) for negative space — empty states, section dividers, loading backdrops. Keep it sparse; it's seasoning, not wallpaper.
- **Inked keylines:** a heavy dark outline (`2–3px`, `#14203A`) is the "special" treatment — use sparingly on featured cards, Pro badges, or callouts to make them read as comic-cover elements rather than standard UI.

`src/components/brand/KrackleField.tsx` (sketch):

```tsx
export function KrackleField({ className }: { className?: string }) {
  const dots = [
    [16,18,3],[23,11,2],[11,27,2.2],[27,21,1.6],[19,31,2.6],
    [104,15,2.6],[111,24,2],[99,9,1.6],[108,33,2.2],
  ] as const;
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      {dots.map(([x,y,r],i)=>(
        <circle key={i} cx={x} cy={y} r={r} fill={i===3?"#D4A84B":"#0B1428"} />
      ))}
    </svg>
  );
}
```

---

## 7. Integration checklist

- Tokens land in `globals.css`; nothing in the app hardcodes a hex — all color references go through the tokens/utilities so the future light theme stays one-flip away.
- Fonts load via `next/font`; `--font-display` / `--font-sans` resolve everywhere.
- `BurstLogo` / `Logo` replace any placeholder logo; the PWA manifest icons and favicon are exported from `BurstLogo size tile`.
- Every screen in feature Phases 1–8 pulls surfaces, text, buttons, covers, avatars, chips, and stars from §5 — no bespoke styling per screen.
- The gold-vs-vermilion rule (§4) is honored: ratings/value are gold, actions are vermilion.

Once this is in, the feature phases inherit the identity automatically — the book page, the tab bar, profiles, and empty states all come out looking like Nibus without further art direction.
