/**
 * @rafters/color-utils
 * OKLCH color manipulation utilities for Rafters design system
 */

// Accessibility
export {
  type AccessibilityMetadata,
  calculateAPCAContrast,
  calculateWCAGContrast,
  generateAccessibilityMetadata,
  rebakeAccessibility,
} from './accessibility.js';

// Analysis
export {
  calculateAtmosphericWeight,
  calculatePerceptualWeight,
  getColorTemperature,
  isLightColor,
} from './analysis.js';

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
export {
  hexToOKLCH,
  type OklchToCSSOptions,
  oklchToCSS,
  roundOKLCH,
  tryParseColor,
} from './conversion.js';

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
export { generateHarmony, generateOKLCHScale } from './harmony.js';

// Manipulation
export { adjustHue } from './manipulation.js';
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
// Scale positions (vocabulary only; selection lives in semantic.ts)
export { POSITION_TO_INDEX, SCALE_POSITIONS } from './scale-positions.js';

// Semantic selection (purpose-driven pair finding + seed-derived suggestions, #1636)
export {
  generateSemanticColorSuggestions,
  type Pair,
  type PairLeg,
  type PairRequest,
  type PairStandard,
  type PairTier,
  type PairUse,
  type SemanticContext,
  SemanticSelectionError,
  STATE_USES,
  type StateUse,
  semanticFor,
  statusAnchor,
} from './semantic.js';
