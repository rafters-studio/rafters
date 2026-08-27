/**
 * Quantization functions for OKLCH to bucket mapping
 *
 * These functions map continuous OKLCH values to discrete bucket indices
 * for deterministic word selection from the word banks.
 */

import { clamp, clamp01, MAX_CHROMA, normalizeHue } from '../internal/math.js';

/**
 * Get luminosity bucket index (0-9) from lightness value (0-1)
 * 10 buckets of 0.1 each
 */
export function getLBucket(l: number): number {
  // Clamp to valid range
  const clamped = clamp01(l);
  // Map to 0-9 bucket index
  const bucket = Math.floor(clamped * 10);
  // Handle edge case where l === 1.0
  return Math.min(bucket, 9);
}

/**
 * Get chroma bucket index (0-7) from chroma value (0-0.37+)
 * 8 buckets with non-linear spacing for perceptual uniformity
 */
export function getCBucket(c: number): number {
  // Clamp to valid range (OKLCH chroma rarely exceeds 0.37)
  const clamped = clamp(c, 0, MAX_CHROMA);

  // Non-linear bucket boundaries optimized for perceptual differences
  // Lower chroma values get finer granularity
  if (clamped < 0.03) return 0; // achromatic
  if (clamped < 0.06) return 1; // very muted
  if (clamped < 0.1) return 2; // muted
  if (clamped < 0.15) return 3; // moderate
  if (clamped < 0.2) return 4; // saturated
  if (clamped < 0.25) return 5; // vivid
  if (clamped < 0.3) return 6; // very vivid
  return 7; // maximum saturation
}

/**
 * Get hue bucket index (0-17) from hue angle (0-360)
 * 18 buckets of 20 degrees each
 */
export function getHBucket(h: number): number {
  // Normalize hue to 0-360 range (handle negative and > 360)
  const normalized = normalizeHue(h);
  // Map to 0-17 bucket index
  const bucket = Math.floor(normalized / 20);
  // Handle edge case where h === 360
  return Math.min(bucket, 17);
}

/**
 * Get all bucket indices for an OKLCH color
 * Useful for debugging and testing
 */
export function getAllBuckets(
  l: number,
  c: number,
  h: number,
): {
  lBucket: number;
  cBucket: number;
  hBucket: number;
} {
  return {
    lBucket: getLBucket(l),
    cBucket: getCBucket(c),
    hBucket: getHBucket(h),
  };
}

// Constants for bucket counts
export const L_BUCKET_COUNT = 10;
export const C_BUCKET_COUNT = 8;
export const H_BUCKET_COUNT = 18;

// Total possible unique combinations
export const TOTAL_COMBINATIONS = L_BUCKET_COUNT * C_BUCKET_COUNT * H_BUCKET_COUNT;
// = 10 * 8 * 18 = 1,440 unique chromatic names
// + 10 * 8 = 80 achromatic names (no hue word)
// = 1,520 total unique names minimum (without temperature/density variants)
