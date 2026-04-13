# @rafters/color-utils

> OKLCH-first color utilities for the Rafters design system.

This package implements a comprehensive set of color functions used across
Rafters: conversion helpers, perceptual analysis, accessibility math,
harmony and semantic generation, and OKLCH-aware manipulation primitives.

## Install

Install dependencies from the monorepo root and consume as a workspace package:

```bash
pnpm install
```

Import in another package:

```ts
import {
  oklchToHex,
  hexToOKLCH,
  generateOKLCHScale,
  generateHarmony,
  lighten,
  calculateWCAGContrast,
  validateSemanticMappings,
} from '@rafters/color-utils';
```

## What’s included

The package is organized by capability. Below are the exported functions and
types with concise explanations and short examples.

### Conversion (`conversion.ts`)
- `oklchToHex(oklch: OKLCH): string` — Convert an OKLCH object to a hex string.
- `oklchToCSS(oklch: OKLCH): string` — Format OKLCH as a CSS `oklch()` string.
- `hexToOKLCH(hex: string): OKLCH` — Parse hex or CSS color into OKLCH.
- `roundOKLCH(oklch: OKLCH): OKLCH` — Normalize/round OKLCH values for caching.

Example:

```ts
const o = hexToOKLCH('#0ea5a4');
oklchToHex(o); // -> '#0EA5A4'
```

### Accessibility (`accessibility.ts`)
- `calculateWCAGContrast(foreground: OKLCH, background: OKLCH): number` — WCAG-style contrast ratio.
- `calculateAPCAContrast(foreground: OKLCH, background: OKLCH): number` — Modern APCA contrast score.
- `meetsWCAGStandard(foreground, background, level, textSize): boolean` — Check AA/AAA.
- `meetsAPCAStandard(foreground, background, textSize): boolean` — APCA thresholding.
- `generateAccessibilityMetadata(scale: OKLCH[]): AccessibilityMetadata` — Precompute matrices of accessible pairs.
- `findAccessibleColor(target, background, standard): OKLCH` — Find nearest accessible color (binary search).

Example:

```ts
const contrast = calculateWCAGContrast(o, hexToOKLCH('#ffffff'));
const ok = meetsWCAGStandard(o, hexToOKLCH('#ffffff'), 'AA', 'normal');
```

### Analysis (`analysis.ts`)
- `calculateColorDistance(color1: OKLCH, color2: OKLCH): number` — Perceptual distance (Delta-like).
- `isLightColor(color: OKLCH): boolean` — Heuristic to classify light vs dark with chroma adjustments.
- `getColorTemperature(color: OKLCH): 'warm'|'cool'|'neutral'` — Temperature from hue and chroma.

Example:

```ts
calculateColorDistance(o, hexToOKLCH('#ffcc00'));
isLightColor(o); // true/false
```

### Harmony & Scales (`harmony.ts`)
- `generateHarmony(base: OKLCH)` — Pure OKLCH hue rotations: complementary, triadic (3), analogous (6), tetradic (4), splitComplementary (3), monochromatic (6).
- `generateSemanticColorSuggestions(base: OKLCH)` — Suggested semantic palettes (danger, success, warning, info).
- `generateOKLCHScale(base: OKLCH)` — Create an accessible 50–950 OKLCH scale optimized for contrast.
- `calculateAtmosphericWeight(color: OKLCH)` — Perceptual “distance”/role (background ↔ foreground).
- `calculatePerceptualWeight(color: OKLCH)` — Visual weight heuristic for layout balance.
- `generateSemanticColors(base, suggestions)` — Enhance semantic suggestions with context-aware variants.

Example:

```ts
const harmony = generateHarmony(o);
const scale = generateOKLCHScale(o);
```

### Manipulation (`manipulation.ts`)
- `lighten(color, amount)` — Increase lightness (OKLCH l += amount).
- `darken(color, amount)` — Decrease lightness.
- `adjustChroma(color, amount)` — Modify chroma.
- `adjustHue(color, degrees)` — Rotate hue.
- `generateSurfaceColor(base)` — Desaturated surface color for UI backgrounds.
- `generateNeutralColor(base)` — Strongly desaturated neutral.
- `adjustLightness(color, amount)` — Alias for compatibility.
- `blendColors(a, b, ratio)` — Linear interpolation in OKLCH space.

Example:

```ts
lighten(o, 0.1);
blendColors(o, hexToOKLCH('#ffffff'), 0.2);
```

### Validation & Alerts (`validation-alerts.ts`)
- `validateSemanticMappings(mappings, colorFamilies): AccessibilityAlert[]` — Run a suite of mathematical validations
  for semantic token assignments. Returns `AccessibilityAlert`s with `autoFix` suggestions.

Types included:
- `AccessibilityAlert` — severity, type, message, suggestion, affectedTokens, and optional `autoFix`.
- `SemanticMapping` — mapping format expected by `validateSemanticMappings`.

Example:

```ts
const alerts = validateSemanticMappings(mappings, colorFamilies);
if (alerts.length) console.table(alerts);
```

## Testing

Run unit tests from the monorepo root:

```bash
pnpm -w test:unit
```

## Notes & philosophy

- This library is OKLCH-first: conversions are provided for interoperability but
  algorithms operate in OKLCH for better perceptual results.
- Accessibility calculations are mathematical and conservative — APCA support
  is included for modern contrast evaluation.
- Many helper functions return immutable objects and small utilities are
  preserved for internal harmony generation; the public API above is stable.

---

Maintainers: Rafters core team
