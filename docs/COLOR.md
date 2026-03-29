# Color in Rafters

Color is not decorative. It is the primary signal channel for trust, hierarchy, and state. Every color in the system exists because it communicates something the user needs to understand without reading text. If a color doesn't answer "what kind of thing is this?" or "what just happened?" it has no business being here.

## Why OKLCH

HSL lies. Two colors with identical saturation and lightness values can look wildly different to the human eye because HSL is not perceptually uniform. A blue at `hsl(240, 80%, 50%)` appears much darker than a yellow at `hsl(60, 80%, 50%)` even though the numbers say they should match.

OKLCH solves this. It maps to human vision: `L` is perceptual lightness (0-1), `C` is chroma (saturation), and `H` is hue angle. Two colors at the same lightness in OKLCH actually look the same brightness. This matters for three reasons:

1. **Scale generation is predictable.** We generate 11-step scales by varying lightness. In OKLCH, each step has uniform perceptual distance. In HSL, the steps would look uneven.
2. **Gamut mapping works.** OKLCH handles out-of-gamut colors gracefully. When a color can't be displayed on a screen, the system maps it to the nearest displayable color without shifting hue.
3. **Contrast pairs are real.** When we say two colors have AAA contrast, we mean it. OKLCH lightness correlates with perceived brightness, so our contrast calculations match what users actually see.

## The 11 Semantic Color Families

Every design system in Rafters starts with these families:

| Family | Purpose |
|--------|---------|
| `primary` | Brand identity, primary actions, active states |
| `secondary` | Supporting actions, less prominent UI |
| `tertiary` | Third-level accents, subtle categorization |
| `accent` | Hover highlights, selected states, interactive emphasis |
| `neutral` | Backgrounds, borders, text, structural chrome |
| `success` | Confirmations, completions, valid states |
| `warning` | Caution states, non-blocking alerts |
| `destructive` | Deletions, errors, irreversible actions |
| `info` | Informational callouts, tips, neutral alerts |
| `highlight` | Attention markers, search matches, badges |
| `muted` | Disabled states, placeholder text, de-emphasized content |

Each family produces an 11-position scale: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950. The scale positions map to specific roles -- 50 for backgrounds, 500 for the base color, 950 for foreground text on light surfaces.

## How buildColorValue() Works

One OKLCH color in, a complete ColorValue object out:

```typescript
import { buildColorValue } from '@rafters/color-utils';

const primary = buildColorValue(
  { l: 0.5, c: 0.15, h: 240, alpha: 1 },
  { token: 'primary', use: 'Brand primary color' }
);
```

The function computes:
- **11-position scale** via `generateOKLCHScale()` -- lightness steps from near-white (50) to near-black (950)
- **Five harmony sets** -- complementary, triadic, analogous, tetradic, monochromatic
- **WCAG contrast ratios** against white and black backgrounds
- **APCA contrast** with minimum font size recommendations
- **Color analysis** -- temperature (warm/cool), lightness classification
- **Perceptual weight** -- how visually heavy the color feels
- **Atmospheric weight** -- how much the color advances or recedes
- **Semantic suggestions** -- which families this color could serve (danger, success, warning, info)

No AI. No network calls. Deterministic math from a single input color.

## Accessibility Is Pre-Computed

We don't hope colors are accessible. We calculate it at generation time.

Every ColorValue carries its accessibility metadata:

```typescript
primary.accessibility.onWhite.wcagAAA  // boolean
primary.accessibility.onBlack.wcagAA   // boolean
primary.accessibility.apca.onWhite     // number
primary.accessibility.apca.minFontSize // 16, 24, or 32px
```

The `onWhite` and `onBlack` objects include both WCAG 2.x contrast ratios and APCA (the next-generation contrast algorithm). APCA is directional -- text on background differs from background on text -- and we compute both directions.

AAA contrast pairs are pre-computed across the scale. The system knows which positions pair safely before any component references them.

## Dark Mode: The Invert Rule

Dark mode is not a second color system. It is a mathematical transformation.

The `invert` dependency rule swaps scale positions: 50 becomes 950, 100 becomes 900, 200 becomes 800. The semantic mappings in `DEFAULT_SEMANTIC_COLOR_MAPPINGS` define both light and dark references:

```typescript
background: {
  light: { family: 'neutral', position: '50' },   // near-white
  dark:  { family: 'neutral', position: '950' },   // near-black
}
```

The hue and chroma stay the same. Only the lightness inverts. This preserves the color's identity across modes while maintaining contrast relationships.

## The Dependency Graph

Colors don't exist in isolation. Change `primary` and 20+ semantic tokens update: `primary-foreground`, `ring`, `sidebar-primary`, chart colors, focus rings. The dependency graph tracks every relationship.

Semantic tokens reference color families by position, not by value:

```typescript
{ family: 'primary', position: '500' }  // not "oklch(0.5 0.15 240)"
```

This indirection means swapping your entire primary palette -- hue, chroma, everything -- updates every component that references `primary` without touching a single component file.

## The Why-Gate

Every color override in the system requires a reason. When a designer changes `destructive` from the computed value, the system records:
- The previous value
- The new value
- The reason for the override
- The timestamp

This is not bureaucracy. It is institutional memory. Six months from now, when someone asks "why is our destructive color different from the default?" the answer exists in the token, not in someone's head.

## Custom Families

The 11 families are the foundation, not the ceiling. Brands add their own families for domain-specific color needs.

A Star Wars game might define:
- `blaze` -- Mandalorian orange for clan identity
- `empire` -- Imperial grey for faction indicators
- `republic` -- Senate blue for alliance markers

Custom families get the same treatment as built-in ones: 11-position scales, accessibility metadata, dependency graph participation, dark mode inversion. The system doesn't distinguish between "core" and "custom" -- a color family is a color family.

```typescript
const result = buildColorSystem({
  config: {
    colorPaletteBases: {
      blaze: { hue: 30, chroma: 0.18, description: 'Mandalorian clan identity' },
      empire: { hue: 0, chroma: 0.02, description: 'Imperial faction' },
      republic: { hue: 220, chroma: 0.14, description: 'Republic alliance' },
    }
  }
});
```

Each base hue and chroma generates a full 11-position OKLCH scale with all computed intelligence. One input color, complete family.
