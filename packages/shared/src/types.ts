/**
 * @rafters/shared - W3C DTCG Types
 * Core type definitions for Rafters design system following W3C Design Token Community Group spec
 */

import { z } from 'zod';

/**
 * Signal to clear an override and revert to computed value.
 * Use with registry.set(tokenName, COMPUTED) to let the system decide.
 */
declare const computedBrand: unique symbol;
export const COMPUTED: typeof computedBrand = Symbol.for(
  'rafters.computed',
) as typeof computedBrand;
export type ComputedSymbol = typeof COMPUTED;

/**
 * OKLCH Color Space
 * Perceptually uniform color space based on human vision
 * https://www.w3.org/TR/css-color-4/#ok-lab
 */
export const OKLCHSchema = z.object({
  /** Lightness: 0 (black) to 1 (white) */
  l: z.number().min(0).max(1),
  /** Chroma: 0 (gray) to ~0.4 (vivid) - no theoretical max */
  c: z.number().min(0),
  /** Hue: 0-360 degrees (red=0, yellow=90, green=150, cyan=180, blue=270, magenta=330) */
  h: z.number().min(0).max(360),
  /** Alpha transparency: 0 (transparent) to 1 (opaque) */
  alpha: z.number().min(0).max(1).optional().default(1),
});

export type OKLCH = z.infer<typeof OKLCHSchema>;

/**
 * W3C DTCG Token Base
 * All design tokens follow this structure
 * https://design-tokens.github.io/community-group/format/
 */
export const DTCGTokenBaseSchema = z.object({
  /** Required: The token's value */
  $value: z.unknown(),
  /** Token type - helps tools understand how to use the value */
  $type: z
    .enum([
      'color',
      'dimension',
      'fontFamily',
      'fontWeight',
      'duration',
      'cubicBezier',
      'number',
      'strokeStyle',
      'border',
      'transition',
      'shadow',
      'gradient',
      'typography',
    ])
    .optional(),
  /** Human-readable description */
  $description: z.string().optional(),
  /** Deprecation marker - boolean or string explaining why */
  $deprecated: z.union([z.boolean(), z.string()]).optional(),
  /** Vendor-specific metadata */
  $extensions: z.record(z.string(), z.unknown()).optional(),
});

export type DTCGTokenBase = z.infer<typeof DTCGTokenBaseSchema>;

/**
 * W3C DTCG Color Value (Design Tokens Color Module 2025.10, section 4.1)
 * https://www.designtokens.org/TR/2025.10/color/
 */
export const DTCGColorValueSchema = z.object({
  colorSpace: z.enum([
    'srgb',
    'srgb-linear',
    'hsl',
    'hwb',
    'lab',
    'lch',
    'oklab',
    'oklch',
    'display-p3',
    'a98-rgb',
    'prophoto-rgb',
    'rec2020',
    'xyz-d65',
    'xyz-d50',
  ]),
  components: z.array(z.union([z.number(), z.literal('none')])),
  alpha: z.number().min(0).max(1).optional(),
  hex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

export type DTCGColorValue = z.infer<typeof DTCGColorValueSchema>;

/**
 * W3C DTCG Color Token
 */
export const DTCGColorTokenSchema = DTCGTokenBaseSchema.extend({
  $value: z.union([
    DTCGColorValueSchema, // Explicit OKLCH
    z.string().regex(/^\{[^{}]+\}$/), // Reference: {color.primary.500}
  ]),
  $type: z.literal('color'),
});

export type DTCGColorToken = z.infer<typeof DTCGColorTokenSchema>;

/**
 * W3C DTCG Group
 * Groups organize tokens hierarchically
 */
export type DTCGGroup = {
  $type?: string | undefined;
  $description?: string | undefined;
  $deprecated?: boolean | string | undefined;
  $extensions?: Record<string, unknown> | undefined;
  [key: string]: DTCGTokenBase | DTCGGroup | string | boolean | unknown;
};

export const DTCGGroupSchema: z.ZodType<DTCGGroup> = z
  .object({
    $type: z.string().optional(),
    $description: z.string().optional(),
    $deprecated: z.union([z.boolean(), z.string()]).optional(),
    $extensions: z.record(z.string(), z.unknown()).optional(),
  })
  .catchall(z.lazy(() => z.union([DTCGTokenBaseSchema, DTCGGroupSchema])));

/**
 * Complete DTCG Design Token File
 */
export const DTCGFileSchema = z.record(z.string(), z.union([DTCGTokenBaseSchema, DTCGGroupSchema]));

export type DTCGFile = z.infer<typeof DTCGFileSchema>;

/**
 * Helper: Convert OKLCH to DTCG Color Value.
 * `alpha` is present only when it is below 1 (Color Module 2025.10 defaults it to 1).
 */
export function oklchToDTCG(oklch: OKLCH): DTCGColorValue {
  const value: DTCGColorValue = { colorSpace: 'oklch', components: [oklch.l, oklch.c, oklch.h] };
  if (oklch.alpha !== undefined && oklch.alpha < 1) value.alpha = oklch.alpha;
  return value;
}

/**
 * Helper: Convert an oklch DTCG Color Value to OKLCH. A `none` component reads as 0.
 */
export function dtcgToOKLCH(dtcg: DTCGColorValue): OKLCH {
  if (dtcg.colorSpace !== 'oklch') {
    throw new Error(`dtcgToOKLCH: colorSpace "${dtcg.colorSpace}" is not oklch`);
  }
  const component = (i: number): number => {
    const c = dtcg.components[i];
    return typeof c === 'number' ? c : 0;
  };
  return { l: component(0), c: component(1), h: component(2), alpha: dtcg.alpha ?? 1 };
}

/**
 * Rafters Intelligence Types
 * Extended schemas for AI-readable design intelligence
 */

// Color Vision Types for accessibility
export const ColorVisionTypeSchema = z.enum([
  'normal',
  'deuteranopia', // Red-green (most common)
  'protanopia', // Red-green
  'tritanopia', // Blue-yellow (rare)
]);

export type ColorVisionType = z.infer<typeof ColorVisionTypeSchema>;

// Accessibility Contrast Levels
export const ContrastLevelSchema = z.enum(['AA', 'AAA']);

export type ContrastLevel = z.infer<typeof ContrastLevelSchema>;

// Component Intelligence for AI consumption
export const ComponentIntelligenceSchema = z.object({
  cognitiveLoad: z.number().min(1).max(5), // 1=simple, 5=complex
  attentionHierarchy: z.string(), // How this component fits in attention economy
  safetyConstraints: z.string().optional(), // Safety patterns required (e.g., confirmation)
  accessibilityRules: z.string(), // WCAG compliance requirements
  usageContext: z.string(), // When/where to use this component
  decisionConstraints: z.string().optional(), // AI decision-making constraints
});

export type ComponentIntelligence = z.infer<typeof ComponentIntelligenceSchema>;

// CVA (class-variance-authority) intelligence schemas
export const ClassMappingSchema = z.object({
  propName: z.string(),
  values: z.record(z.string(), z.array(z.string())),
});

export const CVAIntelligenceSchema = z
  .object({
    baseClasses: z.array(z.string()),
    propMappings: z.array(ClassMappingSchema),
    allClasses: z.array(z.string()),
    css: z.string().optional(), // Generated critical CSS for preview component
  })
  .optional();

export type ClassMapping = z.infer<typeof ClassMappingSchema>;
export type CVAIntelligence = z.infer<typeof CVAIntelligenceSchema>;

// CVA structure for preview rendering (without optional css field)
export const PreviewCVASchema = z.object({
  baseClasses: z.array(z.string()),
  propMappings: z.array(ClassMappingSchema),
  allClasses: z.array(z.string()),
});

export type PreviewCVA = z.infer<typeof PreviewCVASchema>;

// Rafters intelligence schemas for CLI compatibility
export const IntelligenceSchema = z.object({
  cognitiveLoad: z.number().min(0).max(10),
  attentionEconomics: z.string(),
  accessibility: z.string(),
  trustBuilding: z.string(),
  semanticMeaning: z.string(),
  cva: CVAIntelligenceSchema,
});

export const UsagePatternsSchema = z.object({
  dos: z.array(z.string()),
  nevers: z.array(z.string()),
});

export const DesignGuideSchema = z.object({
  name: z.string(),
  url: z.string(),
});

export const ExampleSchema = z.object({
  title: z.string().optional(),
  code: z.string(),
  description: z.string().optional(),
});

export type UsagePatterns = z.infer<typeof UsagePatternsSchema>;
export type DesignGuide = z.infer<typeof DesignGuideSchema>;
export type Example = z.infer<typeof ExampleSchema>;
export type Intelligence = z.infer<typeof IntelligenceSchema>;

// Color Intelligence Schema (from API with uncertainty quantification)
// Note: Color naming is now deterministic via generateColorName() in @rafters/color-utils
export const ColorIntelligenceSchema = z.object({
  // Designer-facing evocative handle ("Aged Terracotta", "Solar Citrine") from
  // the intelligence generator. Language, not identity: the deterministic
  // `name` on ColorValue is the stable, parseable address; `label` is the
  // voice. Optional because pre-label intelligence persists in Vectorize and
  // token files. Backported from platform's generateColorIntelligence, which
  // requires it on generation.
  label: z.string().optional(),
  reasoning: z.string(),
  emotionalImpact: z.string(),
  culturalContext: z.string(),
  accessibilityNotes: z.string(),
  usageGuidance: z.string(),
  balancingGuidance: z.string().optional(), // Based on perceptual weight
  metadata: z
    .object({
      predictionId: z.string(),
      confidence: z.number().min(0).max(1),
      uncertaintyBounds: z.object({
        lower: z.number().min(0).max(1),
        upper: z.number().min(0).max(1),
        confidenceInterval: z.number().min(0).max(1),
      }),
      qualityScore: z.number().min(0).max(1),
      method: z.enum(['bootstrap', 'quantile', 'ensemble', 'bayesian', 'conformal']),
    })
    .optional(),
});

export type ColorIntelligence = z.infer<typeof ColorIntelligenceSchema>;

// Color Harmonies Schema (calculated by color-utils)
export const ColorHarmoniesSchema = z.object({
  complementary: OKLCHSchema,
  triadic: z.array(OKLCHSchema),
  analogous: z.array(OKLCHSchema),
  tetradic: z.array(OKLCHSchema),
  splitComplementary: z.array(OKLCHSchema),
  monochromatic: z.array(OKLCHSchema),
});

export type ColorHarmonies = z.infer<typeof ColorHarmoniesSchema>;

// Color Accessibility Schema (calculated by color-utils)
export const ColorAccessibilitySchema = z.object({
  // Pre-computed contrast matrices (indices into scale array)
  wcagAA: z
    .object({
      normal: z.array(z.array(z.number())), // [[0, 5], [0, 6], ...] - pairs that meet AA
      large: z.array(z.array(z.number())), // [[0, 4], [0, 5], ...] - more pairs for large text
    })
    .optional(),
  wcagAAA: z
    .object({
      normal: z.array(z.array(z.number())), // [[0, 7], [0, 8], ...] - fewer pairs meet AAA
      large: z.array(z.array(z.number())), // [[0, 6], [0, 7], ...]
    })
    .optional(),

  // Basic compatibility data for the base color
  onWhite: z.object({
    wcagAA: z.boolean(),
    wcagAAA: z.boolean(),
    contrastRatio: z.number(),
    // Pre-computed indices for scale lookups
    aa: z.array(z.number()).optional(), // [5, 6, 7, 8, 9] - shades that pass AA on white
    aaa: z.array(z.number()).optional(), // [7, 8, 9] - shades that pass AAA on white
  }),
  onBlack: z.object({
    wcagAA: z.boolean(),
    wcagAAA: z.boolean(),
    contrastRatio: z.number(),
    // Pre-computed indices for scale lookups
    aa: z.array(z.number()).optional(), // [0, 1, 2, 3, 4] - shades that pass AA on black
    aaa: z.array(z.number()).optional(), // [0, 1, 2] - shades that pass AAA on black
  }),

  // APCA (Advanced Perceptual Contrast Algorithm) scores - Future WCAG 3.0
  apca: z
    .object({
      onWhite: z.number(), // APCA contrast score on white background
      onBlack: z.number(), // APCA contrast score on black background
      minFontSize: z.number(), // Minimum font size in px from fontLookupAPCA
    })
    .optional(),

  // Color Vision Deficiency simulations
  cvd: z
    .object({
      deuteranopia: OKLCHSchema, // Red-green (most common) simulated appearance
      protanopia: OKLCHSchema, // Red-green simulated appearance
      tritanopia: OKLCHSchema, // Blue-yellow (rare) simulated appearance
    })
    .optional(),
});

export type ColorAccessibility = z.infer<typeof ColorAccessibilitySchema>;

// Color Analysis Schema (calculated by color-utils)
export const ColorAnalysisSchema = z.object({
  temperature: z.enum(['warm', 'cool', 'neutral']),
  isLight: z.boolean(),
  name: z.string(),
});

export type ColorAnalysis = z.infer<typeof ColorAnalysisSchema>;

// Atmospheric Weight Schema (atmospheric perspective color theory)
export const AtmosphericWeightSchema = z.object({
  distanceWeight: z.number().min(0).max(1), // 0 = background, 1 = foreground
  temperature: z.enum(['warm', 'neutral', 'cool']),
  atmosphericRole: z.enum(['background', 'midground', 'foreground']),
});

export type AtmosphericWeight = z.infer<typeof AtmosphericWeightSchema>;

// Perceptual Weight Schema (visual balance in UI layouts)
export const PerceptualWeightSchema = z.object({
  weight: z.number().min(0).max(1), // 0-1, higher = more visual weight
  density: z.enum(['light', 'medium', 'heavy']),
  balancingRecommendation: z.string(),
});

export type PerceptualWeight = z.infer<typeof PerceptualWeightSchema>;

// Status roles for semantic color suggestions. 'destructive' is canonical
// (matches colorWheel and the exporter's token vocabulary). Persisted files
// and the API may still carry the legacy 'danger' key; the schema lifts it.
export const SEMANTIC_STATUS_ROLES = ['destructive', 'success', 'warning', 'info'] as const;
export type SemanticStatusRole = (typeof SEMANTIC_STATUS_ROLES)[number];

// Family roles: the semantic tokens a designer assigns a palette to. Every
// other semantic colour belongs to one of these (its owner), and the CSS
// exporter emits one 50-950 scale per role so a role change moves everything
// it owns.
export const SEMANTIC_FAMILY_ROLES = [
  'primary',
  'secondary',
  'tertiary',
  'accent',
  'highlight',
  'neutral',
  'muted',
  'success',
  'warning',
  'destructive',
  'info',
] as const;
export type SemanticFamilyRole = (typeof SEMANTIC_FAMILY_ROLES)[number];

// Semantic Color Suggestions Schema.
// 'danger' is a deprecated mirror of 'destructive', kept while apps/api (which
// asserts .danger) migrates to platform. Inputs with only the legacy key parse
// cleanly; outputs carry both until the mirror is removed.
export const SemanticColorSuggestionsSchema = z.preprocess(
  (raw) => {
    if (raw && typeof raw === 'object' && !('destructive' in raw) && 'danger' in raw) {
      return { ...raw, destructive: (raw as { danger: unknown }).danger };
    }
    return raw;
  },
  z.object({
    destructive: z.array(OKLCHSchema),
    success: z.array(OKLCHSchema),
    warning: z.array(OKLCHSchema),
    info: z.array(OKLCHSchema),
    /** @deprecated mirror of `destructive`; dies when apps/api leaves the repo */
    danger: z.array(OKLCHSchema).optional(),
  }),
);

export type SemanticColorSuggestions = z.infer<typeof SemanticColorSuggestionsSchema>;

// Color Value Schema for complex color structures
export const ColorValueSchema = z.object({
  name: z.string(), // the fancy name from color-utils, IE ocean-blue
  scale: z.array(OKLCHSchema), // OKLCH values array [50, 100, 200...900] positions - index maps to standard scale
  token: z.string().optional(), // the semantic assignment IE, primary
  value: z.string().optional(), // the string of the position in the scale IE 400
  use: z.string().optional(), // any reasons the human notes for the color choice and assignment
  states: z.record(z.string(), z.string()).optional(), // { hover: "blue-900", focus: "blue-700", ... }

  // Complete intelligence data (from /api/color-intel)
  intelligence: ColorIntelligenceSchema.optional(),
  harmonies: ColorHarmoniesSchema.optional(),
  accessibility: ColorAccessibilitySchema.optional(),
  analysis: ColorAnalysisSchema.optional(),

  // Advanced color theory intelligence (calculated by color-utils)
  atmosphericWeight: AtmosphericWeightSchema.optional(),
  perceptualWeight: PerceptualWeightSchema.optional(),
  semanticSuggestions: SemanticColorSuggestionsSchema.optional(),

  // Unique token ID for quick color lookups (e.g., "color-0.500-0.120-240.0")
  tokenId: z.string().optional(),

  // The gamut each scale step sits in, index-aligned with `scale`. Generated
  // steps are 'srgb' or 'p3'; only an imported seed pinned as typed can be 'out'.
  gamut: z.array(z.enum(['srgb', 'p3', 'out'])).optional(),
  // Present when the family was built from a different seed than requested
  seedAdjusted: z
    .object({
      from: OKLCHSchema,
      to: OKLCHSchema,
      reason: z.enum(['lightness-bounds', 'gamut']),
    })
    .optional(),
  // The lightness ladder a normalized scale was built on (createNormalizedScale);
  // 'custom' when the caller supplied the ladder. Absent for buildColorValue.
  scaleStyle: z.enum(['deep', 'compact', 'custom']).optional(),
  // The scale position the source colour sits at, e.g. '200'. Absent for
  // buildColorValue, whose seed always lands on '600'.
  anchor: z.string().optional(),
});

export type ColorValue = z.infer<typeof ColorValueSchema>;

// Color Reference Schema for semantic tokens that reference color families
export const ColorReferenceSchema = z.object({
  family: z.string(), // "flipped-out-gray", "ocean-blue", etc.
  position: z.string(), // "50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"
});

export type ColorReference = z.infer<typeof ColorReferenceSchema>;

// Token reference: names a role or semantic colour token ("card", "primary")
// and follows that token through the cascade and the mode (FR-RAF-FILL-001).
export const TokenReferenceSchema = z.object({ token: z.string().min(1) }).strict();

export type TokenReference = z.infer<typeof TokenReferenceSchema>;

// Fills (FR-RAF-FILL-001): a designer-authored recipe of stock Tailwind parts.
// Every colour is a registry reference, never a literal.
const FillColourSchema = z.union([ColorReferenceSchema.strict(), TokenReferenceSchema], {
  error: 'must be a registry reference ({family, position} or {token}), not a literal colour',
});
const PercentSchema = z.number().min(0).max(100);
const FillStopSchema = z
  .object({
    color: FillColourSchema,
    alpha: PercentSchema.optional(),
    position: PercentSchema.optional(),
  })
  .strict();
const FillPartsSchema = z
  .object({
    background: z
      .object({ color: FillColourSchema, alpha: PercentSchema.optional() })
      .strict()
      .optional(),
    gradient: z
      .object({
        type: z.enum(['linear', 'radial', 'conic']),
        direction: z
          .enum(['to-t', 'to-tr', 'to-r', 'to-br', 'to-b', 'to-bl', 'to-l', 'to-tl'])
          .optional(),
        angle: z.number().optional(),
        from: FillStopSchema.optional(),
        via: FillStopSchema.optional(),
        to: FillStopSchema.optional(),
        interpolation: z
          .enum(['srgb', 'hsl', 'oklab', 'oklch', 'longer', 'shorter', 'increasing', 'decreasing'])
          .optional(),
      })
      .strict()
      .optional(),
    mask: z
      .object({
        type: z.enum(['linear', 'radial', 'conic', 't', 'r', 'b', 'l', 'x', 'y']),
        from: PercentSchema.optional(),
        to: PercentSchema.optional(),
      })
      .strict()
      .optional(),
    backdrop: z
      .object({
        blur: z.enum(['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl']).optional(),
        brightness: z.number().min(0).optional(),
        contrast: z.number().min(0).optional(),
        saturate: z.number().min(0).optional(),
        grayscale: PercentSchema.optional(),
        opacity: PercentSchema.optional(),
      })
      .strict()
      .optional(),
    blend: z
      .enum([
        'normal',
        'multiply',
        'screen',
        'overlay',
        'darken',
        'lighten',
        'color-dodge',
        'color-burn',
        'hard-light',
        'soft-light',
        'difference',
        'exclusion',
        'hue',
        'saturation',
        'color',
        'luminosity',
      ])
      .optional(),
    foreground: FillColourSchema.optional(),
    border: FillColourSchema.optional(),
  })
  .strict();
const FillStateSchema = FillPartsSchema.extend({ dark: FillPartsSchema.optional() }).strict();

export const FillValueSchema = FillPartsSchema.extend({
  foreground: FillColourSchema,
  // Clips the background or gradient to the glyphs; foreground stays the fallback.
  clip: z.enum(['text']).optional(),
  dark: FillPartsSchema.optional(),
  hover: FillStateSchema.optional(),
  active: FillStateSchema.optional(),
  focus: FillStateSchema.optional(),
  disabled: FillStateSchema.optional(),
}).strict();

export type FillValue = z.infer<typeof FillValueSchema>;

// Names a fill cannot take (FR-RAF-FILL-001): Tailwind's static bg-* utilities
// (45), the legacy ones it still emits (12) and the bg- keywords, each without
// its `bg-` prefix. Studio keeps the designer-facing list.
export const FILL_NAME_EXCLUDES: readonly string[] = [
  'auto',
  'blend-color',
  'blend-color-burn',
  'blend-color-dodge',
  'blend-darken',
  'blend-difference',
  'blend-exclusion',
  'blend-hard-light',
  'blend-hue',
  'blend-lighten',
  'blend-luminosity',
  'blend-multiply',
  'blend-normal',
  'blend-overlay',
  'blend-saturation',
  'blend-screen',
  'blend-soft-light',
  'bottom',
  'bottom-left',
  'bottom-right',
  'center',
  'clip-border',
  'clip-content',
  'clip-padding',
  'clip-text',
  'contain',
  'cover',
  'fixed',
  'left',
  'local',
  'no-repeat',
  'none',
  'origin-border',
  'origin-content',
  'origin-padding',
  'repeat',
  'repeat-round',
  'repeat-space',
  'repeat-x',
  'repeat-y',
  'right',
  'scroll',
  'top',
  'top-left',
  'top-right',
  'left-top',
  'right-top',
  'left-bottom',
  'right-bottom',
  'gradient-to-t',
  'gradient-to-tr',
  'gradient-to-r',
  'gradient-to-br',
  'gradient-to-b',
  'gradient-to-bl',
  'gradient-to-l',
  'gradient-to-tl',
  'inherit',
  'current',
  'transparent',
];

// Progression system labels stamped on tokens to record which math system
// produced them. Used only by TokenSchema below; the math-utils package
// carries the actual ratio definitions in DEFAULT_RATIOS. This array will be
// reshaped when the design-tokens package is refactored.
export const PROGRESSION_SYSTEMS = [
  'linear',
  'golden',
  'major-third',
  'minor-third',
  'perfect-fourth',
  'perfect-fifth',
  'augmented-fourth',
  'major-second',
  'minor-second',
  'custom',
] as const;

// Binding: typed reference to the plugin + input that produces a token's value.
// When present on a Token, the registry resolves the value via the named plugin
// instead of treating the token as a leaf. The plugin name is opaque to the
// schema; the registry resolves it against its plugin map.
export const BindingSchema = z.object({
  plugin: z.string(),
  input: z.unknown(),
});
export type Binding = z.infer<typeof BindingSchema>;

// Override provenance: WHO put the value there, as a machine-readable kind
// rather than a free-text convention on the reason string.
//   baseline -- the generated system value, restated as an explicit override
//   preset   -- written by applying a Studio value-set
//   designer -- a human decision; preset application must not clobber it
// Extension point: 'measured' / 'tuned' can join the enum later.
export const OVERRIDE_KINDS = ['baseline', 'preset', 'designer'] as const;
export const OverrideKindSchema = z.enum(OVERRIDE_KINDS);
export type OverrideKind = z.infer<typeof OverrideKindSchema>;

// Comprehensive Design Token Schema - Single Source of Truth
export const TokenSchema = z.object({
  // Core token data
  name: z.string(),
  value: z.union([z.string(), ColorValueSchema, ColorReferenceSchema, FillValueSchema]), // String, ColorValue for families, ColorReference for semantic, FillValue for fills
  category: z.string(),
  namespace: z.string(),
  binding: BindingSchema.optional(), // Plugin binding for cascade-driven values

  // Typography-specific properties
  lineHeight: z.string().optional(),

  // AI Intelligence (comprehensive)
  semanticMeaning: z.string().optional(),
  usageContext: z.array(z.string()).optional(),
  trustLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  cognitiveLoad: z.number().min(1).max(10).optional(),
  accessibilityLevel: z.enum(['AA', 'AAA']).optional(),
  consequence: z.enum(['reversible', 'significant', 'permanent', 'destructive']).optional(),

  // Designer intent - captures WHY values deviate from computed defaults
  // Git blame shows WHAT changed and WHEN; these fields explain the reasoning
  appliesWhen: z.array(z.string()).optional(), // ["data-heavy interfaces", "dashboard contexts"]
  usagePatterns: z
    .object({
      do: z.array(z.string()), // ["Use for primary actions", "Pair with muted backgrounds"]
      never: z.array(z.string()), // ["Multiple primary buttons competing", "On busy backgrounds"]
    })
    .optional(),

  // Human override tracking - enables undo and agent intelligence.
  // Required on every token. Null = generated baseline (no designer override).
  // Populated = designer has explicitly changed this value with documented intent.
  // Null IS the signal that no override exists -- do not auto-fill with synthetic strings.
  userOverride: z
    .object({
      // Value before override (for undo)
      previousValue: z.union([z.string(), ColorValueSchema, ColorReferenceSchema, FillValueSchema]),
      // Why was this overridden
      reason: z.string(),
      // Additional context (e.g. "Q1 marketing campaign", "accessibility audit")
      context: z.string().optional(),
      // Who attributed the value. The reason string is for humans; kind is what
      // machines branch on (preset application skips kind === 'designer').
      // Optional and never defaulted: absent means the provenance is unknown,
      // which is the honest state of every override written before this field
      // existed.
      kind: OverrideKindSchema.optional(),
    })
    .nullable(),

  // Computed value from generation rule (before any override)
  // Stored so agents can see what the system WOULD produce vs what human chose
  computedValue: z
    .union([z.string(), ColorValueSchema, ColorReferenceSchema, FillValueSchema])
    .optional(),

  // Dependency tracking for automatic regeneration
  dependsOn: z.array(z.string()).optional(), // Parent token(s) - empty = root token
  generationRule: z.string().optional(), // How generated: "calc({base}*2)", "state:hover", etc
  progressionSystem: z.enum(PROGRESSION_SYSTEMS).optional(), // Mathematical system used
  scalePosition: z.number().optional(), // Position in color/spacing scale
  mathRelationship: z.string().optional(), // Mathematical expression for calc() rules

  // Responsive behavior (containerQueryAware is default true for modern tokens)
  containerQueryAware: z.boolean().optional().default(true),
  pointerTypeAware: z.boolean().optional(), // Adapts to fine/coarse pointer
  reducedMotionAware: z.boolean().optional(), // Respects prefers-reduced-motion
  viewportAware: z.boolean().optional(), // Should generate responsive variants

  // Localization (MVP+1: RTL/LTR support, basic locale spacing)
  textDirection: z.enum(['ltr', 'rtl', 'auto']).optional(),
  localeAware: z.boolean().optional(), // Token varies by locale

  // Component associations
  applicableComponents: z.array(z.string()).optional(), // ["button", "input", "card"]
  requiredForComponents: z.array(z.string()).optional(), // Critical dependencies

  // Interaction patterns
  interactionType: z.enum(['hover', 'focus', 'active', 'disabled', 'loading']).optional(),
  animationSafe: z.boolean().optional(), // Safe for vestibular disorders
  highContrastMode: z.string().optional(), // Value for high contrast mode

  // Motion tokens (derived from spacing progression for cohesive feel)
  motionIntent: z.enum(['enter', 'exit', 'emphasis', 'transition']).optional(),
  easingCurve: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(), // cubicBezier [x1, y1, x2, y2]
  easingName: z
    .enum(['standard', 'enter', 'exit', 'linear', 'spring-smooth', 'spring-snappy'])
    .optional(),
  delayMs: z.number().optional(), // Delay before animation starts

  // Keyframe tokens (CSS @keyframes content / animation step definitions)
  keyframeName: z.string().optional(), // Name of the keyframe (e.g., "fade-in")

  // Animation tokens (combine keyframe + duration + easing)
  animationName: z.string().optional(), // Name of the animation (e.g., "fade-in")
  animationDuration: z.string().optional(), // Duration (e.g., "150ms", "1s")
  animationEasing: z.string().optional(), // Easing function CSS value
  animationIterations: z.string().optional(), // Iteration count (e.g., "1", "infinite")

  // Focus tokens (WCAG 2.2 compliance, derive from ring unless overridden)
  focusRingWidth: z.string().optional(), // e.g., "2px", "3px"
  focusRingColor: z.string().optional(), // Reference to ring token or override
  focusRingOffset: z.string().optional(), // e.g., "2px"
  focusRingStyle: z.enum(['solid', 'dashed', 'double']).optional(),

  // Elevation (pairs depth with shadow, can be independent)
  elevationLevel: z
    .enum(['surface', 'raised', 'overlay', 'sticky', 'modal', 'popover', 'tooltip'])
    .optional(),
  shadowToken: z.string().optional(), // Reference to paired shadow token

  // Export behavior
  generateUtilityClass: z.boolean().optional(), // Should create @utility class
  tailwindOverride: z.boolean().optional(), // Overrides default TW value
  customPropertyOnly: z.boolean().optional(), // CSS var only, no utility

  // Validation hints (for human Studio validation)
  contrastRatio: z.number().optional(), // Pre-calculated contrast
  touchTargetSize: z.number().optional(), // Pre-calculated size in px
  motionDuration: z.number().optional(), // Duration in ms

  // Design system relationships
  pairedWith: z.array(z.string()).optional(), // Other tokens used together
  conflictsWith: z.array(z.string()).optional(), // Tokens that shouldn't be used together

  // Meta information
  description: z.string().optional(),
  deprecated: z.boolean().optional(),
  version: z.string().optional(),
  lastModified: z.string().optional(),
  generatedAt: z.string().optional(), // ISO timestamp when token was generated
  requiresConfirmation: z.boolean().optional(), // UI pattern requirement for destructive actions
});

export type Token = z.infer<typeof TokenSchema>;

// Extract TokenUsagePatterns type for convenience
export type TokenUsagePatterns = NonNullable<Token['usagePatterns']>;

// Legacy alias for backward compatibility
export const SemanticTokenSchema = TokenSchema;
export type SemanticToken = Token;

/**
 * Typography Element Override Schema
 * Stores per-element typography overrides with why-gate provenance.
 * When a designer overrides a specific element's typography (e.g. H3 uses
 * title-medium but needs font-thin font-sans), this captures the override.
 */
export const TypographyElementOverrideSchema = z.object({
  /** CSS element selector, e.g. 'h3' */
  element: z.string().min(1),
  /** Base role this element uses, e.g. 'title-medium' */
  role: z.string().min(1),
  /** Only the properties that differ from the role */
  overrides: z.object({
    fontFamily: z.string().optional(),
    fontWeight: z.string().optional(),
    fontSize: z.string().optional(),
    lineHeight: z.string().optional(),
    letterSpacing: z.string().optional(),
  }),
  /** Why-gate: reason for the override (required, non-empty) */
  why: z.string().min(1, 'Why-gate required: provide a reason for this override'),
  /** Who made the override */
  who: z.string().min(1),
  /** When the override was made (ISO timestamp) */
  when: z.string(),
});

export type TypographyElementOverride = z.infer<typeof TypographyElementOverrideSchema>;

/**
 * Namespace File Schema
 * File format for .rafters/tokens/{namespace}.rafters.json files
 */
export const NamespaceFileSchema = z.object({
  $schema: z.string(),
  namespace: z.string(),
  version: z.string(),
  generatedAt: z.string(),
  tokens: z.array(TokenSchema),
});

export type NamespaceFile = z.infer<typeof NamespaceFileSchema>;
