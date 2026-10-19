/**
 * Accessibility contrast calculation and compliance checking functions.
 *
 * Every colour is measured as stored, in the gamut it is stored in (sRGB or
 * Display P3), never through a clipped sRGB copy.
 *
 * - WCAG 2.2 contrast: relative luminance is the colour's CIE XYZ (D65) Y
 *   (colorjs.io 'xyz-d65'). Y exists for any colour, so no gamut mapping is
 *   needed, and an sRGB colour's ratio matches the sRGB-channel formula.
 * - APCA contrast (informational): luminance from APCA's own per-space
 *   function -- sRGBtoY for an sRGB colour (0-255 channels), displayP3toY for
 *   a P3 colour (0-1 channels) -- chosen by getGamutTier. A colour beyond P3
 *   is first mapped into P3 with toGamutCeiling(colour, 'p3').
 */

import type { ColorValue, OKLCH } from '@rafters/shared';
import { APCAcontrast, displayP3toY, sRGBtoY } from 'apca-w3';
import Color from 'colorjs.io';
import { z } from 'zod';
import { getGamutTier, toGamutCeiling } from './gamut.js';

/** White reference color for contrast calculations. */
export const CONTRAST_WHITE: OKLCH = { l: 1, c: 0, h: 0, alpha: 1 };

/** Black reference color for contrast calculations. */
export const CONTRAST_BLACK: OKLCH = { l: 0, c: 0, h: 0, alpha: 1 };

/** WCAG 2.2 minimum contrast ratios, by conformance level and text size. */
const WCAG_CONTRAST_THRESHOLDS = {
  AA: { normal: 4.5, large: 3.0 },
  AAA: { normal: 7.0, large: 4.5 },
} as const;

/**
 * Breakpoints for ColorValue.accessibility.apca.minFontSize, most demanding
 * first. This is builder.ts's own two-breakpoint ternary (16px at >=60,
 * 24px at >=45, 32px otherwise), pulled out so it is encoded once instead of
 * inline in buildColorValue. It is not a general APCA font-size table -- the
 * finer-grained small/medium/large breakpoints that once lived in the now
 * -deleted, uncalled `meetsAPCAStandard` do not appear here; that function
 * had zero callers repo-wide and its table was never reconciled with this one.
 */
const APCA_FONT_SIZE_THRESHOLDS: readonly { minFontSize: number; minContrast: number }[] = [
  { minFontSize: 16, minContrast: 60 },
  { minFontSize: 24, minContrast: 45 },
  { minFontSize: 32, minContrast: 0 },
];

/**
 * Smallest font size (in px) that stays readable at the given APCA contrast,
 * per ColorValue.accessibility.apca.minFontSize's existing breakpoints (see
 * APCA_FONT_SIZE_THRESHOLDS). Contrast sign is irrelevant -- APCA reports
 * polarity, magnitude is what carries legibility.
 */
export function minFontSizeForAPCA(contrast: number): number {
  const magnitude = Math.abs(contrast);
  for (const { minFontSize, minContrast } of APCA_FONT_SIZE_THRESHOLDS) {
    if (magnitude >= minContrast) return minFontSize;
  }
  // Unreachable: the last row has minContrast 0. Kept for exhaustiveness.
  return 32;
}

/**
 * Relative luminance for WCAG 2.2: the colour's CIE XYZ (D65) Y, read from
 * the colour itself with no sRGB step, so a P3 colour is measured as stored.
 */
function getRelativeLuminance(oklch: OKLCH): number {
  return new Color('oklch', [oklch.l, oklch.c, oklch.h]).to('xyz-d65').coords[1] ?? 0;
}

/**
 * Calculate WCAG 2.2 contrast ratio between two colors
 */
export function calculateWCAGContrast(foreground: OKLCH, background: OKLCH): number {
  const l1 = getRelativeLuminance(foreground);
  const l2 = getRelativeLuminance(background);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * A channel of an in-gamut colour, guarded only against float noise: colorjs
 * can return a value a hair outside [0, 1] for a colour inside the gamut, and
 * apca-w3 raises each channel to 2.4, which is NaN for a negative base. This
 * is not a gamut clip -- the colour is already inside the space measured.
 */
function inGamutChannel(value: number | null | undefined): number {
  return Math.min(1, Math.max(0, value ?? 0));
}

/**
 * APCA luminance of a colour in the gamut it is stored in: sRGBtoY (0-255
 * channels) for an sRGB colour, displayP3toY (0-1 channels) for a P3 colour.
 * A colour beyond P3 is mapped into P3 with toGamutCeiling first.
 */
function getAPCALuminance(oklch: OKLCH): number {
  const tier = getGamutTier(oklch);
  if (tier === 'srgb') {
    const [r, g, b] = new Color('oklch', [oklch.l, oklch.c, oklch.h]).to('srgb').coords;
    return sRGBtoY([inGamutChannel(r) * 255, inGamutChannel(g) * 255, inGamutChannel(b) * 255]);
  }
  const inP3 = tier === 'out' ? toGamutCeiling(oklch, 'p3') : oklch;
  const [r, g, b] = new Color('oklch', [inP3.l, inP3.c, inP3.h]).to('p3').coords;
  return displayP3toY([inGamutChannel(r), inGamutChannel(g), inGamutChannel(b)]);
}

/**
 * Calculate APCA contrast (informational) via the apca-w3 library, from
 * each colour's luminance in the gamut it is stored in.
 */
export function calculateAPCAContrast(foreground: OKLCH, background: OKLCH): number {
  const result = APCAcontrast(getAPCALuminance(foreground), getAPCALuminance(background));
  return typeof result === 'number' ? result : 0;
}

/**
 * Check if color pair meets WCAG contrast standards.
 * Module-private: the pass/fail matrices below are its only consumers.
 */
function meetsWCAGStandard(
  foreground: OKLCH,
  background: OKLCH,
  level: 'AA' | 'AAA',
  textSize: 'normal' | 'large',
): boolean {
  const contrast = calculateWCAGContrast(foreground, background);
  return contrast >= WCAG_CONTRAST_THRESHOLDS[level][textSize];
}

/** Pre-computed pairs of scale indices that pass a contrast standard. */
const ContrastPairsSchema = z.object({
  normal: z.array(z.array(z.number())),
  large: z.array(z.array(z.number())),
});

/** Pre-computed scale indices that pass on a single-color background. */
const BackgroundComplianceSchema = z.object({
  aa: z.array(z.number()),
  aaa: z.array(z.number()),
});

/**
 * Pre-computed accessibility metadata for a color scale. Indices reference
 * positions in the source scale array.
 */
export const AccessibilityMetadataSchema = z.object({
  wcagAA: ContrastPairsSchema,
  wcagAAA: ContrastPairsSchema,
  onWhite: BackgroundComplianceSchema,
  onBlack: BackgroundComplianceSchema,
});
export type AccessibilityMetadata = z.infer<typeof AccessibilityMetadataSchema>;

/**
 * Generate pre-computed accessibility metadata for a color scale
 * Eliminates expensive on-demand contrast calculations by storing all valid pairs as indices
 */
export function generateAccessibilityMetadata(scale: OKLCH[]): AccessibilityMetadata {
  if (!scale || scale.length === 0) {
    // Return empty metadata for invalid scales
    return {
      wcagAA: { normal: [], large: [] },
      wcagAAA: { normal: [], large: [] },
      onWhite: { aa: [], aaa: [] },
      onBlack: { aa: [], aaa: [] },
    };
  }

  const metadata: AccessibilityMetadata = {
    wcagAA: { normal: [], large: [] },
    wcagAAA: { normal: [], large: [] },
    onWhite: { aa: [], aaa: [] },
    onBlack: { aa: [], aaa: [] },
  };

  // Check all pairs within the scale
  for (let i = 0; i < scale.length; i++) {
    for (let j = 0; j < scale.length; j++) {
      if (i === j) continue; // Skip same color pairs

      const color1 = scale[i];
      const color2 = scale[j];

      // Skip invalid OKLCH values
      if (!color1 || !color2 || typeof color1.l !== 'number' || typeof color2.l !== 'number') {
        continue;
      }

      // Check WCAG AA compliance
      if (meetsWCAGStandard(color1, color2, 'AA', 'normal')) {
        metadata.wcagAA.normal.push([i, j]);
      }
      if (meetsWCAGStandard(color1, color2, 'AA', 'large')) {
        metadata.wcagAA.large.push([i, j]);
      }

      // Check WCAG AAA compliance
      if (meetsWCAGStandard(color1, color2, 'AAA', 'normal')) {
        metadata.wcagAAA.normal.push([i, j]);
      }
      if (meetsWCAGStandard(color1, color2, 'AAA', 'large')) {
        metadata.wcagAAA.large.push([i, j]);
      }
    }

    // Check against white background
    const colorForWhite = scale[i];
    if (colorForWhite && typeof colorForWhite.l === 'number') {
      if (meetsWCAGStandard(colorForWhite, CONTRAST_WHITE, 'AA', 'normal')) {
        metadata.onWhite.aa.push(i);
      }
      if (meetsWCAGStandard(colorForWhite, CONTRAST_WHITE, 'AAA', 'normal')) {
        metadata.onWhite.aaa.push(i);
      }
    }

    // Check against black background
    const colorForBlack = scale[i];
    if (colorForBlack && typeof colorForBlack.l === 'number') {
      if (meetsWCAGStandard(colorForBlack, CONTRAST_BLACK, 'AA', 'normal')) {
        metadata.onBlack.aa.push(i);
      }
      if (meetsWCAGStandard(colorForBlack, CONTRAST_BLACK, 'AAA', 'normal')) {
        metadata.onBlack.aaa.push(i);
      }
    }
  }

  return metadata;
}

/**
 * The step a family's on-white/on-black figures are measured on: the 600
 * step, where the seed lands (after any seed adjustment). buildColorValue and
 * rebakeAccessibility both read it, so re-baking an unchanged family is a
 * no-op.
 */
export const REFERENCE_STEP_INDEX = 6;

/**
 * Assemble the WCAG half of ColorValue.accessibility for a scale: pair
 * matrices plus on-white/on-black ratios and pass flags for a reference
 * color. Shared by buildColorValue (which adds APCA on top) and
 * rebakeAccessibility -- one assembly, two consumers, no drift.
 */
export function assembleWcagAccessibility(
  scale: readonly OKLCH[],
  reference: OKLCH,
): Pick<NonNullable<ColorValue['accessibility']>, 'wcagAA' | 'wcagAAA' | 'onWhite' | 'onBlack'> {
  const meta = generateAccessibilityMetadata([...scale]);
  const onWhiteRatio = calculateWCAGContrast(reference, CONTRAST_WHITE);
  const onBlackRatio = calculateWCAGContrast(reference, CONTRAST_BLACK);
  return {
    wcagAA: meta.wcagAA,
    wcagAAA: meta.wcagAAA,
    onWhite: {
      wcagAA: onWhiteRatio >= WCAG_CONTRAST_THRESHOLDS.AA.normal,
      wcagAAA: onWhiteRatio >= WCAG_CONTRAST_THRESHOLDS.AAA.normal,
      contrastRatio: onWhiteRatio,
      aa: meta.onWhite.aa,
      aaa: meta.onWhite.aaa,
    },
    onBlack: {
      wcagAA: onBlackRatio >= WCAG_CONTRAST_THRESHOLDS.AA.normal,
      wcagAAA: onBlackRatio >= WCAG_CONTRAST_THRESHOLDS.AAA.normal,
      contrastRatio: onBlackRatio,
      aa: meta.onBlack.aa,
      aaa: meta.onBlack.aaa,
    },
  };
}

/**
 * Re-derive accessibility metadata for a ColorValue whose scale changed.
 * A family value supplied without its WCAG pair matrices would starve the
 * contrast/state/invert selection downstream -- this guard re-bakes them.
 * No-op for values without a scale. (Moved from the removed CLI set command;
 * the studio API mutation path is the consumer. #1643)
 */
export function rebakeAccessibility(value: ColorValue): ColorValue {
  if (!('scale' in value) || !Array.isArray(value.scale)) return value;
  const reference = value.scale[REFERENCE_STEP_INDEX] ?? value.scale[0];
  if (!reference) return value;
  return { ...value, accessibility: assembleWcagAccessibility(value.scale, reference) };
}
