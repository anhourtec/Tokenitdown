# DESIGN.md — TokenItDown

Inherited from the AnHourTec visual system and the running app (`styles/tailwind.css`). The landing site (`landing/`) mirrors these tokens exactly so marketing and product feel like one thing.

## Color

Neutral (zinc) base with **AnHourTec Blue `#2563EB`** as the single brand accent. Blue carries brand, primary CTAs, focus rings, and links; everything else is a tinted neutral. Strategy is **Committed** on the hero (blue leads the identity surface) and **Restrained** through the body (neutral surfaces, blue accents ≤10%).

| Role | Light | Dark |
|---|---|---|
| Primary | `#2563EB` | `#3B82F6` |
| Ring / focus | `#2563EB` | `#3B82F6` |
| Secondary accent | `#60A5FA` (blue-400) | `#60A5FA` |
| Purple accent (sparingly) | `#8B5CF6` | `#A78BFA` |
| Success | `#22C55E` | `#34D399` |
| Background | near-white `oklch(1 0 0)` | near-black `oklch(0.145 0 0)` |
| Foreground | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` |
| Border | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` |

Neutrals are OKLCH with ~0 chroma; never `#000`/`#fff` flat. Tokens live in `landing/app/globals.css` (copied from the app).

## Theme

Default to **system**, with a real dark mode. Scene: a developer evaluating a dev tool, often in a dark IDE at their desk, skimming for whether it's legit before they trust it. Both themes are first-class and must look deliberate, not one bolted on.

## Typography

- **Geist Sans** (UI/body) + **Geist Mono** (code, token counts, install snippets) — matches the app exactly, self-hosted via the `geist` package.
- H1: display size, `font-extrabold`, `tracking-tight`. H2/H3: `font-bold`/`font-semibold`, tight tracking. Body: `font-normal`, relaxed leading, capped at ~68ch.
- Scale steps keep ≥1.25 contrast. Mono is used deliberately for anything token/code related, reinforcing the "for engineers" register.

## Motion

- **GSAP ScrollTrigger** drives scroll reveals (`components/scroll-reveal.tsx`): short translate + fade, `power2.out`, no bounce/elastic. Stagger siblings by delay. Honors `prefers-reduced-motion` (renders visible, no motion).
- Never animate layout properties; transform + opacity only.

## Layout & components

- Real product screenshots (`.github/screenshots/*.png`) are the primary visual, GitHub-readme style. No stock art, no robot illustrations.
- Avoid the identical-card-grid reflex: vary section rhythm and composition. Cards only where they are the best affordance; never nested.
- Full borders only (1px) — no colored side-stripe accents. Emphasis via weight, scale, or background tint.
- Mono-labeled token/code details (install snippets, `tid_…` keys, token savings) reinforce the technical brand.

## Anti-patterns (bans)

No gradient text, no hero-metric stat template, no glassmorphism-by-default, no em dashes in copy, no side-stripe borders.
