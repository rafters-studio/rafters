/**
 * Accessibility contrast calculation and compliance checking functions
 */

import type { ColorValue, OKLCH } from '@rafters/shared';
import { APCAcontrast, sRGBtoY } from 'apca-w3';
import Color from 'colorjs.io';
import { z } from 'zod';

/** White reference color for contrast calculations. */
export const CONTRAST_WHITE: OKLCH = { l: 1, c: 0, h: 0, alpha: 1 };

/** Black reference color for contrast calculations. */
export const CONTRAST_BLACK: OKLCH = { l: 0, c: 0, h: 0, alpha: 1 };

/** WCAG 2.1 minimum contrast ratios, by conformance level and text size. */
const WCAG_CONTRAST_THRESHOLDS = {
  AA: { normal: 4.5, large: 3.0 },
  AAA: { normal: 7.0, large: 4.5 },
} as const;

/**
 * APCA contrast thresholds by minimum readable font size, most demanding
 * first. The single encoding of these breakpoints: minFontSizeForAPCA reads
 * down the table, and builder.ts derives ColorValue.accessibility.apca from it
 * rather than repeating the numbers.
 */
const APCA_FONT_SIZE_THRESHOLDS: readonly { minFontSize: number; minContrast: number }[] = [
  { minFontSize: 16, minContrast: 60 },
  { minFontSize: 24, minContrast: 45 },
  { minFontSize: 32, minContrast: 0 },
];

/**
 * Smallest font size (in px) that stays readable at the given APCA contrast.
 * Contrast sign is irrelevant -- APCA reports polarity, magnitude is what
 * carries legibility.
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
 * Convert OKLCH to relative luminance for WCAG calculations
 */
function getRelativeLuminance(oklch: OKLCH): number {
  const color = new Color('oklch', [oklch.l, oklch.c, oklch.h]);
  const srgb = color.to('srgb');

  // WCAG formula for relative luminance
  const toLinear = (val: number): number => {
    if (val <= 0.03928) {
      return val / 12.92;
    }
    return ((val + 0.055) / 1.055) ** 2.4;
  };

  const r = toLinear(srgb.r);
  const g = toLinear(srgb.g);
  const b = toLinear(srgb.b);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate WCAG 2.1 contrast ratio between two colors
 */
export function calculateWCAGContrast(foreground: OKLCH, background: OKLCH): number {
  const l1 = getRelativeLuminance(foreground);
  const l2 = getRelativeLuminance(background);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Calculate APCA contrast for modern accessibility
 * Uses the official APCA algorithm via apca-w3 library
 */
export function calculateAPCAContrast(foreground: OKLCH, background: OKLCH): number {
  // Convert OKLCH to RGB arrays for APCA
  const foregroundColor = new Color('oklch', [foreground.l, foreground.c, foreground.h]);
  const backgroundColorObj = new Color('oklch', [background.l, background.c, background.h]);

  const fgRgb = foregroundColor.to('srgb');
  const bgRgb = backgroundColorObj.to('srgb');

  // Convert to 0-255 RGB values for apca-w3
  const fgR = Math.max(0, Math.min(255, (fgRgb.r || 0) * 255));
  const fgG = Math.max(0, Math.min(255, (fgRgb.g || 0) * 255));
  const fgB = Math.max(0, Math.min(255, (fgRgb.b || 0) * 255));
  const bgR = Math.max(0, Math.min(255, (bgRgb.r || 0) * 255));
  const bgG = Math.max(0, Math.min(255, (bgRgb.g || 0) * 255));
  const bgB = Math.max(0, Math.min(255, (bgRgb.b || 0) * 255));

  // Calculate luminance values
  const fgY = sRGBtoY([fgR, fgG, fgB]);
  const bgY = sRGBtoY([bgR, bgG, bgB]);

  // Use official APCA calculation
  const result = APCAcontrast(fgY, bgY);
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
  const reference = value.scale[5] ?? value.scale[0];
  if (!reference) return value;
  return { ...value, accessibility: assembleWcagAccessibility(value.scale, reference) };
}
