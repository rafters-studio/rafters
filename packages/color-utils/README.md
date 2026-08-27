# @rafters/color-utils

> OKLCH-first color math for the Rafters design system.

Every color in Rafters is OKLCH before it is anything else. This package holds
the math that acts on it: conversion, perceptual analysis, accessibility scoring,
gamut awareness, harmony and semantic generation, deterministic naming, and the
builder that assembles a full color value from a single seed. Parsing from CSS
and formatting back to it exist for interoperability, but the algorithms work in
OKLCH because that is where the perceptual results hold up.

## Install

Consumed as a workspace package inside the monorepo:

```bash
pnpm install
```

Import from another package:

```ts
import {
  hexToOKLCH,
  oklchToCSS,
  buildColorValue,
  getGamutTier,
  generateHarmony,
  generateColorName,
  calculateWCAGContrast,
} from '@rafters/color-utils';
```

## What's inside

### Conversion (`conversion.ts`)

- `hexToOKLCH(hex)` — parse a hex or CSS color into OKLCH.
- `tryParseColor(input)` — parse without throwing; returns null on a bad string.
- `oklchToCSS(oklch, options?)` — format as a CSS `oklch()` string.
- `roundOKLCH(oklch)` — normalize and round, so equal colors cache as equal.

```ts
const o = hexToOKLCH('#0ea5a4');
oklchToCSS(roundOKLCH(o)); // 'oklch(0.654 0.11 194)'
```

`oklchToCSS` emits `oklch(L C H)`, or `oklch(L C H / A)` when `alpha` is defined
and is not 1. `options.precision`, when given, is the number of decimal places
applied to every emitted channel — L, C, H, and A alike. With no options and no
alpha the output is the plain three-channel string, unrounded.

```ts
oklchToCSS({ l: 0.7, c: 0.15, h: 250 });
// 'oklch(0.7 0.15 250)'

oklchToCSS({ l: 0.7, c: 0.15, h: 250, alpha: 0.5 });
// 'oklch(0.7 0.15 250 / 0.5)'

oklchToCSS({ l: 0.70001, c: 0.15001, h: 250.001 }, { precision: 2 });
// 'oklch(0.70 0.15 250.00)'

oklchToCSS({ l: 0.70001, c: 0.15001, h: 250.001, alpha: 0.5001 }, { precision: 3 });
// 'oklch(0.700 0.150 250.001 / 0.500)'
```

### Gamut (`gamut.ts`)

A three-tier model built on what displays actually support: `srgb` shows
everywhere, `p3` needs a wide-gamut screen, `out` is displayable nowhere.

- `getGamutTier(oklch)` — which tier a color falls in.
- `isInSRGBGamut(oklch)` / `isInP3Gamut(oklch)` — the two boundary checks.
- `toNearestGamut(oklch)` — snap an out-of-gamut color into sRGB. Returns
  `{ color, tier }`: the snapped OKLCH and the tier it landed in.
- `computeGamutBoundaries(hue, steps?)` — the boundary points a picker draws
  against.

Boundary checks run through `colorjs.io`, so sRGB and P3 agree with what the
browser will render.

### Accessibility (`accessibility.ts`)

- `calculateWCAGContrast(fg, bg)` — the WCAG contrast ratio.
- `calculateAPCAContrast(fg, bg)` — the APCA score, for modern contrast work.
- `generateAccessibilityMetadata(scale)` / `rebakeAccessibility(value)` — precompute
  the pass/fail matrix for a scale, and rebuild it after an edit.

```ts
calculateWCAGContrast(o, hexToOKLCH('#ffffff'));
```

### Analysis (`analysis.ts`)

- `isLightColor(color)` — light or dark, with a chroma adjustment.
- `getColorTemperature(color)` — warm, cool, or neutral from hue and chroma. The
  package's only temperature classifier: everything that needs the verdict calls
  this one.
- `calculateAtmosphericWeight(color)` / `calculatePerceptualWeight(color)` —
  perceptual weight, for background-to-foreground role and layout balance.

### Manipulation (`manipulation.ts`)

- `adjustHue(color, degrees)` — rotate the hue, normalized back into 0-360.

### Harmony and scales (`harmony.ts`)

- `generateHarmony(base)` — hue rotations: complementary, triadic, analogous,
  tetradic, split-complementary, monochromatic.
- `generateOKLCHScale(base)` — an accessible 50 to 950 scale tuned for contrast.

### Semantic selection (`semantic.ts`)

Purpose-driven pair finding over a color value. Pairs are found in light mode,
then inverted as a unit for dark mode so the relationship survives.

- `semanticFor(family, { name? })` — open a selection context over one color
  family. The returned context carries `.pair(request)` for a single use,
  `.states(from, dark?)` for the whole state ladder, and `.invert(pair)` for the
  dark-mode counterpart.
- `statusAnchor(role, seed)` — the one OKLCH anchor for a status role
  (`destructive`, `success`, `warning`, `info`), with chroma derived from the seed.
- `generateSemanticColorSuggestions(base)` — seed-derived semantic palettes
  (danger, success, warning, info), three variants per role.
- `STATE_USES`, `SemanticSelectionError`, and the `Pair*` types.

### Color wheel and builder (`color-wheel.ts`, `builder.ts`)

- `buildColorValue(oklch, options)` — assemble a full color value (scale,
  harmonies, accessibility) from one OKLCH seed, with pure math and no network.
- `colorWheel(seed, harmony, options?)` — a complete 11-family semantic system
  from a single seed. `harmony` is required and names the relationship
  (`complementary`, `triadic`, `tetradic`, `analogous`, `split-complementary`).

### Scale positions (`scale-positions.ts`)

- `SCALE_POSITIONS` — the canonical labels (`50`, `100`, ... `950`).
- `POSITION_TO_INDEX` — the inverse lookup. Vocabulary only; selection lives in
  `semantic.ts`.

### Naming (`naming/`)

- `generateColorName(oklch)` / `generateColorNameWithMetadata(oklch)` — a stable,
  human-readable name from an OKLCH value, chosen by temperature and perceptual
  weight.

```ts
generateColorName({ l: 0.65, c: 0.12, h: 230, alpha: 1 }); // 'luminous-true-cobalt'
```

The bucket helpers and word lists (`getCBucket`, `getChromaBand`, `HUE_HUBS`,
`MATERIAL_WORDS`, and the rest) are exported for callers building their own
naming views.

## Testing

```bash
pnpm --filter @rafters/color-utils test
```

## Notes

- OKLCH-first. Conversions exist for interoperability; the math stays in OKLCH.
- Accessibility scoring is mathematical, and APCA is there for modern contrast
  evaluation alongside WCAG.
- Published as source. It gains nothing from a build step, and Rafters is its
  only consumer.
