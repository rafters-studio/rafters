/**
 * Generator Types
 *
 * Core types for design token generators.
 * All generators produce Token objects that can be serialized to namespace JSON files.
 *
 * IMPORTANT: All derived values flow from TWO primitives:
 * - baseSpacingUnit (4px default) - the foundation for ALL measurements
 * - progressionRatio ('minor-third' = 1.2 default) - the musical scale for ALL progressions
 *
 * This ensures that changing the progression ratio regenerates a cohesive system.
 */

import type { Token } from '@rafters/shared';
import type { ColorPaletteBase } from './defaults.js';

// Re-export for convenience
export type { ColorPaletteBase } from './defaults.js';

/**
 * Configuration for the base design system
 *
 * The system derives all values from baseSpacingUnit and progressionRatio.
 * Override fields allow customization while maintaining mathematical relationships.
 */
export interface BaseSystemConfig {
  /** Base spacing unit in pixels - THE foundation (default: 4) */
  baseSpacingUnit: number;

  /** Mathematical progression ratio (default: 'minor-third' = 1.2) */
  progressionRatio: string;

  /** Primary font family (default: 'Noto Sans Variable', sans-serif) */
  fontFamily: string;

  /** Mono font family (default: system monospace stack) */
  monoFontFamily: string;

  // === DERIVED VALUES (computed from baseSpacingUnit if not overridden) ===

  /** Base font size override. System default: baseSpacingUnit * 4 = 16px */
  baseFontSizeOverride?: number;

  /** Border radius override. System default: baseSpacingUnit * 1.5 = 6px */
  baseRadiusOverride?: number;

  /** Focus ring width override. System default: baseSpacingUnit / 2 = 2px */
  focusRingWidthOverride?: number;

  /** Base transition duration override (ms). System default: baseSpacingUnit * 37.5 = 150ms */
  baseTransitionDurationOverride?: number;

  // === COLOR OVERRIDES ===

  /** Custom color palette bases. If provided, replaces DEFAULT_COLOR_PALETTE_BASES */
  colorPaletteBases?: Record<string, ColorPaletteBase>;
}

/**
 * Resolved configuration with all derived values computed
 */
export interface ResolvedSystemConfig {
  baseSpacingUnit: number;
  progressionRatio: string;
  fontFamily: string;
  monoFontFamily: string;
  baseFontSize: number;
  baseRadius: number;
  focusRingWidth: number;
  baseTransitionDuration: number;
}

/**
 * Resolve configuration by computing derived values from baseSpacingUnit
 */
export function resolveConfig(config: BaseSystemConfig): ResolvedSystemConfig {
  const { baseSpacingUnit } = config;

  return {
    baseSpacingUnit: config.baseSpacingUnit,
    progressionRatio: config.progressionRatio,
    fontFamily: config.fontFamily,
    monoFontFamily: config.monoFontFamily,
    // Derived values - use override if provided, otherwise compute from baseSpacingUnit
    baseFontSize: config.baseFontSizeOverride ?? baseSpacingUnit * 4, // 4 * 4 = 16px
    baseRadius: config.baseRadiusOverride ?? baseSpacingUnit * 1.5, // 4 * 1.5 = 6px
    focusRingWidth: config.focusRingWidthOverride ?? baseSpacingUnit / 2, // 4 / 2 = 2px
    baseTransitionDuration: config.baseTransitionDurationOverride ?? baseSpacingUnit * 37.5, // 4 * 37.5 = 150ms
  };
}

/**
 * Default configuration - Rafters aesthetic defaults (shadcn-inspired)
 *
 * These are our CHOSEN values. If you want pure mathematical defaults,
 * omit the overrides and let the system compute from baseSpacingUnit.
 *
 * Pure math example (no overrides):
 * - baseFontSize = 4 * 4 = 16px
 * - baseRadius = 4 * 1.5 = 6px
 * - focusRingWidth = 4 / 2 = 2px
 * - baseTransitionDuration = 4 * 37.5 = 150ms
 */
export const DEFAULT_SYSTEM_CONFIG: BaseSystemConfig = {
  baseSpacingUnit: 4,
  progressionRatio: 'minor-third', // 1.2 ratio
  fontFamily: "'Noto Sans Variable', sans-serif",
  monoFontFamily:
    "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
  // Rafters aesthetic overrides (happen to match pure math at baseSpacingUnit=4)
  baseFontSizeOverride: 16,
  baseRadiusOverride: 6,
  focusRingWidthOverride: 2,
  baseTransitionDurationOverride: 150,
};

/**
 * Pure mathematical configuration - no overrides, everything computed
 *
 * Use this when you want the system to derive ALL values from
 * baseSpacingUnit and progressionRatio with no designer intervention.
 */
export const PURE_MATH_CONFIG: BaseSystemConfig = {
  baseSpacingUnit: 4,
  progressionRatio: 'minor-third',
  fontFamily: "'Noto Sans Variable', sans-serif",
  monoFontFamily:
    "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
  // No overrides - pure mathematical derivation
};

/**
 * Result from a generator function
 */
export interface GeneratorResult {
  /** Namespace these tokens belong to */
  namespace: string;

  /** Generated tokens */
  tokens: Token[];
}

/**
 * Generator function signature - receives resolved config with computed values
 */
export type GeneratorFn = (config: ResolvedSystemConfig) => GeneratorResult;

/**
 * Color scale positions (11 positions matching shadcn/Tailwind)
 */
export const COLOR_SCALE_POSITIONS = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  '950',
] as const;

export type ColorScalePosition = (typeof COLOR_SCALE_POSITIONS)[number];

/**
 * Semantic color intents
 */
export const SEMANTIC_INTENTS = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'destructive-foreground',
  'success',
  'success-foreground',
  'warning',
  'warning-foreground',
  'info',
  'info-foreground',
  'highlight',
  'highlight-foreground',
  'border',
  'input',
  'ring',
  // Sidebar tokens
  'sidebar-background',
  'sidebar-foreground',
  'sidebar-primary',
  'sidebar-primary-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-border',
  'sidebar-ring',
  // Chart tokens (1-5)
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
] as const;

export type SemanticIntent = (typeof SEMANTIC_INTENTS)[number];

/**
 * Spacing scale names
 */
export const SPACING_SCALE = [
  '0',
  '0.5',
  '1',
  '1.5',
  '2',
  '2.5',
  '3',
  '3.5',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
  '14',
  '16',
  '20',
  '24',
  '28',
  '32',
  '36',
  '40',
  '44',
  '48',
  '52',
  '56',
  '60',
  '64',
  '72',
  '80',
  '96',
] as const;

export type SpacingScale = (typeof SPACING_SCALE)[number];

/**
 * Typography scale names
 */
export const TYPOGRAPHY_SCALE = [
  'xs',
  'sm',
  'base',
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
  '5xl',
  '6xl',
  '7xl',
  '8xl',
  '9xl',
] as const;

export type TypographyScale = (typeof TYPOGRAPHY_SCALE)[number];

/**
 * Border radius scale names
 */
export const RADIUS_SCALE = [
  'none',
  'sm',
  'DEFAULT',
  'md',
  'lg',
  'xl',
  '2xl',
  '3xl',
  'full',
] as const;

export type RadiusScale = (typeof RADIUS_SCALE)[number];

/**
 * Shadow scale names
 */
export const SHADOW_SCALE = ['none', 'xs', 'sm', 'DEFAULT', 'md', 'lg', 'xl', '2xl'] as const;

export type ShadowScale = (typeof SHADOW_SCALE)[number];

/**
 * Depth (z-index) levels
 */
export const DEPTH_LEVELS = [
  'base',
  'dropdown',
  'sticky',
  'navigation',
  'fixed',
  'modal',
  'popover',
  'tooltip',
  'overlay',
] as const;

export type DepthLevel = (typeof DEPTH_LEVELS)[number];

/**
 * Elevation levels (semantic z-index + shadow pairings)
 */
export const ELEVATION_LEVELS = [
  'surface',
  'raised',
  'overlay',
  'sticky',
  'modal',
  'popover',
  'tooltip',
] as const;

export type ElevationLevel = (typeof ELEVATION_LEVELS)[number];

/**
 * Motion duration scale names
 */
export const MOTION_DURATION_SCALE = ['instant', 'fast', 'normal', 'slow', 'slower'] as const;

export type MotionDurationScale = (typeof MOTION_DURATION_SCALE)[number];

/**
 * Easing curve names
 */
export const EASING_CURVES = [
  'linear',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'productive',
  'expressive',
  'spring',
] as const;

export type EasingCurve = (typeof EASING_CURVES)[number];

/**
 * Breakpoint scale names
 */
export const BREAKPOINT_SCALE = ['sm', 'md', 'lg', 'xl', '2xl'] as const;

export type BreakpointScale = (typeof BREAKPOINT_SCALE)[number];

/**
 * Typography composite roles -- shared semantic roles consumed by multiple components.
 * Each role maps to a composite token bundling family, size, weight, line-height, tracking.
 */
export const TYPOGRAPHY_ROLES = [
  'display-large',
  'display-medium',
  'title-large',
  'title-medium',
  'title-small',
  'body-large',
  'body-medium',
  'body-small',
  'label-large',
  'label-medium',
  'label-small',
  'code-large',
  'code-small',
  'shortcut',
] as const;

export type TypographyRole = (typeof TYPOGRAPHY_ROLES)[number];

/**
 * Font-family role tokens -- semantic font family assignments.
 * Designer changes "all headings use serif" by overriding font-heading.
 */
export const FONT_FAMILY_ROLES = ['heading', 'body', 'code'] as const;

export type FontFamilyRole = (typeof FONT_FAMILY_ROLES)[number];
