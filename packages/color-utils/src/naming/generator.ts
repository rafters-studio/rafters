/**
 * Deterministic Color Name Generator
 *
 * Generates unique, semantically meaningful color names from OKLCH values.
 * Uses temperature and perceptual weight to select appropriate word variants.
 *
 * Format: {luminosity}-{intensity}-{material}
 * Examples: "deep-bold-cobalt", "faint-soft-sage", "shadow-whisper"
 *
 * Two-tier system:
 * 1. Expanded hubs: Rich semantic word banks for Red, Green, Blue (more coming)
 *    - 5 lightness bands × 4 chroma bands × 10 words = 200 words per temp variant
 *    - Sub-selection uses fractional L/C for maximum uniqueness
 * 2. Fallback: Original word banks for hues without expanded hubs
 */

import type { OKLCH } from '@rafters/shared';
import { calculatePerceptualWeight, getColorTemperature } from '../analysis.js';
import { getExpandedMaterialWord, hasExpandedHub } from './hue-hubs.js';
import { getCBucket, getHBucket, getLBucket } from './quantize.js';
import { INTENSITY_WORDS, LUMINOSITY_WORDS, MATERIAL_WORDS } from './word-banks.js';

// Threshold for considering a color achromatic (no hue word)
const ACHROMATIC_THRESHOLD = 0.02;

/**
 * Generate a deterministic color name from OKLCH values
 *
 * The name is composed of up to three hyphenated words:
 * - Luminosity: describes the lightness (shadow, deep, balanced, pale, brilliant, etc.)
 * - Intensity: describes the chroma/saturation (whisper, bold, fierce, etc.)
 * - Material: describes the hue (ember, sapphire, sage, etc.)
 *
 * Achromatic colors (chroma < 0.02) omit the material word.
 *
 * @param oklch - The color in OKLCH format
 * @returns A hyphenated color name like "luminous-clear-sapphire"
 */
export function generateColorName(oklch: OKLCH): string {
  // Get computed properties for semantic word selection
  const temperature = getColorTemperature(oklch);
  const { density } = calculatePerceptualWeight(oklch);

  // Get bucket indices (guaranteed to be within valid ranges by quantize functions)
  const lBucket = getLBucket(oklch.l);
  const cBucket = getCBucket(oklch.c);
  const hBucket = getHBucket(oklch.h);

  // Select words deterministically
  // Type assertions are safe because bucket functions guarantee valid indices
  const luminosity = LUMINOSITY_WORDS[lBucket] as string;
  const intensityBank = INTENSITY_WORDS[density];
  const intensity = intensityBank[cBucket] as string;

  // Achromatic colors skip the hue/material word
  if (oklch.c < ACHROMATIC_THRESHOLD) {
    return `${luminosity}-${intensity}`;
  }

  // Try expanded hub first (rich semantic word banks with sub-selection)
  // Falls back to original word banks for hues without expanded hubs
  let material: string;
  if (hasExpandedHub(hBucket)) {
    material = getExpandedMaterialWord(
      hBucket,
      lBucket,
      cBucket,
      temperature,
      oklch.l,
      oklch.c,
    ) as string;
  } else {
    // Fallback to original word banks
    const materialBank = MATERIAL_WORDS[temperature];
    material = materialBank[hBucket] as string;
  }

  return `${luminosity}-${intensity}-${material}`;
}

/**
 * Generate a color name with metadata about the generation
 *
 * Useful for debugging and understanding why a particular name was chosen.
 */
export function generateColorNameWithMetadata(oklch: OKLCH): {
  name: string;
  components: {
    luminosity: string;
    intensity: string;
    material: string | null;
  };
  buckets: {
    l: number;
    c: number;
    h: number;
  };
  modifiers: {
    temperature: 'warm' | 'cool' | 'neutral';
    density: 'light' | 'medium' | 'heavy';
    isAchromatic: boolean;
    usedExpandedHub: boolean;
  };
} {
  const temperature = getColorTemperature(oklch);
  const { density } = calculatePerceptualWeight(oklch);

  const lBucket = getLBucket(oklch.l);
  const cBucket = getCBucket(oklch.c);
  const hBucket = getHBucket(oklch.h);

  // Type assertions are safe because bucket functions guarantee valid indices
  const luminosity = LUMINOSITY_WORDS[lBucket] as string;
  const intensityBank = INTENSITY_WORDS[density];
  const intensity = intensityBank[cBucket] as string;
  const isAchromatic = oklch.c < ACHROMATIC_THRESHOLD;

  // Get material word (expanded hub or fallback)
  let material: string | null = null;
  let usedExpandedHub = false;
  if (!isAchromatic) {
    if (hasExpandedHub(hBucket)) {
      material = getExpandedMaterialWord(
        hBucket,
        lBucket,
        cBucket,
        temperature,
        oklch.l,
        oklch.c,
      ) as string;
      usedExpandedHub = true;
    } else {
      const materialBank = MATERIAL_WORDS[temperature];
      material = materialBank[hBucket] as string;
    }
  }

  const name = isAchromatic
    ? `${luminosity}-${intensity}`
    : `${luminosity}-${intensity}-${material}`;

  return {
    name,
    components: {
      luminosity,
      intensity,
      material,
    },
    buckets: {
      l: lBucket,
      c: cBucket,
      h: hBucket,
    },
    modifiers: {
      temperature,
      density,
      isAchromatic,
      usedExpandedHub,
    },
  };
}
