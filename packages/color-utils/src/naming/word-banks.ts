/**
 * Word Banks for Deterministic Color Naming
 *
 * Three independent word banks map to OKLCH dimensions:
 * - Luminosity (L): brightness-based words describing light levels
 * - Intensity (C): chroma-descriptive words describing saturation level
 * - Material (H): objects/places/nature describing hue
 *
 * Each bank is organized by bucket index. Temperature and perceptual
 * density select which variant of a word to use for semantic meaning.
 */

/**
 * Luminosity words by lightness bucket (0-1 in 10 steps)
 * Index 0 = darkest (0.0-0.1), Index 9 = lightest (0.9-1.0)
 *
 * Uses brightness-based words that describe luminance without implying
 * grayscale materials, allowing natural composition with chromatic hues.
 */
export const LUMINOSITY_WORDS: readonly string[] = [
  'shadow', // 0.0-0.1: darkest
  'dark', // 0.1-0.2
  'deep', // 0.2-0.3
  'dim', // 0.3-0.4
  'mid', // 0.4-0.5
  'balanced', // 0.5-0.6
  'luminous', // 0.6-0.7
  'pale', // 0.7-0.8
  'faint', // 0.8-0.9
  'brilliant', // 0.9-1.0: lightest
] as const;

/**
 * Intensity words by chroma bucket, split by perceptual density
 * Each density level has words for 8 chroma buckets (0-0.37+)
 *
 * Words describe saturation/chroma level, not personality.
 */
export const INTENSITY_WORDS: Record<'light' | 'medium' | 'heavy', readonly string[]> = {
  light: [
    'dust', // 0.00-0.03: near-achromatic (achromatic threshold is 0.02, not 0.03)
    'wash', // 0.03-0.06
    'soft', // 0.06-0.10
    'clean', // 0.10-0.15
    'clear', // 0.15-0.20
    'pure', // 0.20-0.25
    'vivid', // 0.25-0.30
    'bright', // 0.30+
  ],
  medium: [
    'ash', // 0.00-0.03
    'faded', // 0.03-0.06
    'quiet', // 0.06-0.10
    'true', // 0.10-0.15
    'solid', // 0.15-0.20
    'bold', // 0.20-0.25
    'sharp', // 0.25-0.30
    'neon', // 0.30+
  ],
  heavy: [
    'smoke', // 0.00-0.03
    'muted', // 0.03-0.06
    'worn', // 0.06-0.10
    'rich', // 0.10-0.15
    'strong', // 0.15-0.20
    'dense', // 0.20-0.25 ("deep" excluded: already in LUMINOSITY_WORDS)
    'full', // 0.25-0.30
    'hot', // 0.30+
  ],
} as const;

/**
 * Material words by hue bucket (18 buckets at 20 each), split by temperature
 * Temperature influences word choice for more semantic meaning
 */
export const MATERIAL_WORDS: Record<'warm' | 'cool' | 'neutral', readonly string[]> = {
  warm: [
    'ember', // 0-20: red
    'copper', // 20-40: orange-red
    'amber', // 40-60: orange
    'honey', // 60-80: yellow-orange
    'citrine', // 80-100: yellow
    'chartreuse', // 100-120: yellow-green
    'fern', // 120-140: green
    'sage', // 140-160: green-cyan
    'lagoon', // 160-180: cyan
    'azure', // 180-200: cyan-blue
    'cerulean', // 200-220: light blue
    'cobalt', // 220-240: blue
    'indigo', // 240-260: blue-violet
    'iris', // 260-280: violet
    'orchid', // 280-300: purple
    'fuchsia', // 300-320: magenta
    'rose', // 320-340: pink
    'crimson', // 340-360: red-pink
  ],
  cool: [
    'rust', // 0-20
    'terracotta', // 20-40
    'sienna', // 40-60
    'flax', // 60-80
    'canary', // 80-100
    'lime', // 100-120
    'moss', // 120-140
    'mint', // 140-160
    'teal', // 160-180
    'glacier', // 180-200
    'sky', // 200-220
    'sapphire', // 220-240
    'navy', // 240-260
    'violet', // 260-280
    'plum', // 280-300
    'magenta', // 300-320
    'raspberry', // 320-340
    'scarlet', // 340-360
  ],
  neutral: [
    'clay', // 0-20
    'cinnamon', // 20-40
    'marigold', // 40-60
    'buttercup', // 60-80
    'pear', // 80-100
    'olive', // 100-120
    'spruce', // 120-140
    'seafoam', // 140-160
    'aqua', // 160-180
    'arctic', // 180-200
    'pacific', // 200-220
    'denim', // 220-240
    'midnight', // 240-260
    'lavender', // 260-280
    'amethyst', // 280-300
    'peony', // 300-320
    'cherry', // 320-340
    'poppy', // 340-360
  ],
} as const;

// Type exports for external use
export type LuminosityWord = (typeof LUMINOSITY_WORDS)[number];
export type IntensityWord =
  | (typeof INTENSITY_WORDS.light)[number]
  | (typeof INTENSITY_WORDS.medium)[number]
  | (typeof INTENSITY_WORDS.heavy)[number];
export type MaterialWord =
  | (typeof MATERIAL_WORDS.warm)[number]
  | (typeof MATERIAL_WORDS.cool)[number]
  | (typeof MATERIAL_WORDS.neutral)[number];
