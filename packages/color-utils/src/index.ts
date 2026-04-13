/**
 * @rafters/color-utils
 * OKLCH color manipulation utilities for Rafters design system
 */

// Accessibility
export {
  type AccessibilityMetadata,
  calculateAPCAContrast,
  calculateWCAGContrast,
  findAccessibleColor,
  generateAccessibilityMetadata,
  meetsAPCAStandard,
  meetsWCAGStandard,
} from './accessibility.js';

// Analysis
export { calculateColorDistance, getColorTemperature, isLightColor } from './analysis.js';

// Builder
export { type BuildColorValueOptions, buildColorValue } from './builder.js';

// Color Wheel
export {
  type ColorWheelOptions,
  colorWheel,
  type HarmonyType,
  type SemanticColorSystem,
} from './color-wheel.js';

// Conversion
export { hexToOKLCH, oklchToCSS, oklchToHex, roundOKLCH } from './conversion.js';

// Gamut
export {
  computeGamutBoundaries,
  type GamutBoundaryPoint,
  type GamutTier,
  getGamutTier,
  isInP3Gamut,
  isInSRGBGamut,
  toNearestGamut,
} from './gamut.js';

// Harmony
export {
  calculateAtmosphericWeight,
  calculatePerceptualWeight,
  generateHarmony,
  generateOKLCHScale,
  generateSemanticColorSuggestions,
  generateSemanticColorSystem,
  generateSemanticColors,
} from './harmony.js';

// Manipulation
export {
  adjustChroma,
  adjustHue,
  adjustLightness,
  blendColors,
  darken,
  generateNeutralColor,
  generateSurfaceColor,
  lighten,
} from './manipulation.js';

// Naming
export {
  BLUE_HUB,
  C_BUCKET_COUNT,
  type ChromaBand,
  GREEN_HUB,
  generateColorName,
  generateColorNameWithMetadata,
  getAllBuckets,
  getCBucket,
  getChromaBand,
  getExpandedMaterialWord,
  getHBucket,
  getLBucket,
  getLightnessBand,
  getSubIndex,
  H_BUCKET_COUNT,
  HUE_HUBS,
  type HueCell,
  type HueHub,
  type HueMatrix,
  hasExpandedHub,
  INTENSITY_WORDS,
  type IntensityWord,
  L_BUCKET_COUNT,
  type LightnessBand,
  LUMINOSITY_WORDS,
  type LuminosityWord,
  MATERIAL_WORDS,
  type MaterialWord,
  RED_HUB,
  TOTAL_COMBINATIONS,
} from './naming/index.js';

// Validation
export {
  type AccessibilityAlert,
  type SemanticMapping,
  validateSemanticMappings,
} from './validation-alerts.js';
