# Design System — TokenItDown (AnHourTec)

The visual language for TokenItDown. Inherits the **AnHourTec** visual system; the product carries its own wordmark while the company identity stays AnHourTec.

> Scope: this document covers **colors and typography** only. For product scope, architecture, and feature plans see [`PLAN.md`](./PLAN.md).

**Voice:** professional yet approachable, benefit-led, no hype words.

---

## 1. Color

### Brand blues
| Token | Hex | Usage |
|-------|-----|-------|
| Primary Blue | `#2563EB` | Brand, primary CTAs, theme color |
| Blue 500 | `#3B82F6` | Buttons, interactive elements, logo |
| Blue 400 | `#60A5FA` | Gradients, secondary accent |
| Blue 300 | `#93C5FD` | Dark-mode primary |

### Neutrals
| Token | Hex |
|-------|-----|
| Gray 900 | `#111827` |
| Gray 600 | `#4B5563` |
| Gray 400 | `#9CA3AF` |
| Gray 200 | `#E5E7EB` |
| Gray 100 | `#F3F4F6` |
| White | `#FFFFFF` |

### Dark mode
| Role | Hex |
|------|-----|
| Background | `#030712` |
| Card | `#111827` |
| Border | `#1F2937` |
| Muted | `#9CA3AF` |
| Primary | `#93C5FD` |

### Semantic
| Role | Hex |
|------|-----|
| Success | `#22C55E` |
| Error | `#EF4444` |
| Purple accent | `#8B5CF6` |

### Gradient
Hero / emphasis surfaces:

```css
background: linear-gradient(135deg, #2563EB, #60A5FA, #8B5CF6);
```

---

## 2. Typography

- **Font family** — system stack (native, fast, no web-font load):
  ```css
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
    Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
  ```
- **H1** — extrabold, `tracking-tight` (tight letter-spacing).
- **Body** — `leading-relaxed` (relaxed line-height) for readability.

| Element | Weight | Notes |
|---------|--------|-------|
| H1 | `font-extrabold` | `tracking-tight`, large display sizes |
| H2–H3 | `font-bold` | Section headings |
| Body | `font-normal` | `leading-relaxed` |
| Muted / captions | `font-normal` | Gray 400 / dark-mode muted |

---

## 3. Implementation notes

- Colors map to Tailwind tokens; the brand blues align with Tailwind's `blue-600/500/400/300`. Define them as CSS custom properties / Tailwind theme tokens in `styles/tailwind.css` so light and dark modes share one source of truth.
- Prefer the system font stack — do not add a web-font dependency without a deliberate decision.
- Dark mode is first-class: every surface defines both a light and a dark value above.
