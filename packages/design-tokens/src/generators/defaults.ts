/**
 * Generator Defaults
 *
 * All default values for token generators live here.
 * Generators are pure functions - they receive data, they don't embed it.
 *
 * This file contains:
 * - Default color scales (OKLCH values)
 * - Default breakpoint definitions
 * - Default depth (z-index) definitions
 * - Default shadow definitions
 * - Default elevation mappings
 * - Default motion definitions (easing curves, duration multipliers)
 * - Default focus ring configurations
 * - Default radius multipliers
 * - Default spacing multipliers
 * - Default typography definitions
 */

import type { OKLCH } from '@rafters/shared';

// =============================================================================
// COLOR DEFAULTS
// =============================================================================

/**
 * Neutral color scale in OKLCH
 * Based on shadcn zinc palette, converted to OKLCH for perceptual uniformity
 */
export const DEFAULT_NEUTRAL_SCALE: Record<string, OKLCH> = {
  '50': { l: 0.985, c: 0, h: 0, alpha: 1 },
  '100': { l: 0.967, c: 0, h: 0, alpha: 1 },
  '200': { l: 0.92, c: 0, h: 0, alpha: 1 },
  '300': { l: 0.869, c: 0, h: 0, alpha: 1 },
  // biome-ignore lint/suspicious/noApproximativeNumericConstant: OKLCH lightness value, not Math.SQRT1_2
  '400': { l: 0.707, c: 0, h: 0, alpha: 1 },
  '500': { l: 0.552, c: 0, h: 0, alpha: 1 },
  '600': { l: 0.442, c: 0, h: 0, alpha: 1 },
  '700': { l: 0.37, c: 0, h: 0, alpha: 1 },
  '800': { l: 0.269, c: 0, h: 0, alpha: 1 },
  '900': { l: 0.2, c: 0, h: 0, alpha: 1 },
  '950': { l: 0.141, c: 0, h: 0, alpha: 1 },
};

export interface ColorScaleInput {
  name: string;
  scale: Record<string, OKLCH>;
  description?: string;
}

export const DEFAULT_COLOR_SCALES: ColorScaleInput[] = [
  {
    name: 'neutral',
    scale: DEFAULT_NEUTRAL_SCALE,
    description: 'Foundation neutral palette for backgrounds, borders, text, and UI chrome.',
  },
];

// =============================================================================
// COLOR PALETTE BASES
// =============================================================================

/**
 * Base hue and chroma for color palette generation.
 * Full 11-position scales are computed mathematically via generateOKLCHScale().
 *
 * Rafters palette - color names from API cache (api.rafters.studio):
 * - neutral: zinc (achromatic, h:0, c:0) - defined above
 * - silver-true-glacier: teal/cyan (h:180, c:0.12) - cool, serene
 * - silver-bold-fire-truck: fire-truck red (h:0, c:0.20) - warm, energetic
 * - silver-true-honey: honey gold (h:60, c:0.12) - warm, inviting
 * - silver-true-citrine: citrine green (h:90, c:0.12) - fresh, natural
 * - silver-true-sky: sky blue (h:210, c:0.12) - calm, trustworthy
 * - silver-true-violet: violet/purple (h:270, c:0.12) - creative, luxurious
 */
export interface ColorPaletteBase {
  /** Hue in degrees (0-360) */
  hue: number;
  /** Chroma (0-0.4 typical range) */
  chroma: number;
  /** Description of the color */
  description: string;
}

export const DEFAULT_COLOR_PALETTE_BASES: Record<string, ColorPaletteBase> = {
  'silver-true-glacier': {
    hue: 180,
    chroma: 0.12,
    description: 'Cool cyan/teal palette - serene, balanced, calming.',
  },
  'silver-bold-fire-truck': {
    hue: 0,
    chroma: 0.2,
    description: 'Bold fire-truck red palette - warm, energetic, attention-grabbing.',
  },
  'silver-true-honey': {
    hue: 60,
    chroma: 0.12,
    description: 'Warm honey gold palette - inviting, refined, subtle warmth.',
  },
  'silver-true-citrine': {
    hue: 90,
    chroma: 0.12,
    description: 'Fresh citrine green palette - natural, growth, harmony.',
  },
  'silver-true-sky': {
    hue: 210,
    chroma: 0.12,
    description: 'Calm sky blue palette - trustworthy, serene, reliable.',
  },
  'silver-true-violet': {
    hue: 270,
    chroma: 0.12,
    description: 'Creative violet palette - luxurious, imaginative, refined.',
  },
};

/** @deprecated Use DEFAULT_COLOR_PALETTE_BASES instead */
export const DEFAULT_SEMANTIC_COLOR_BASES = DEFAULT_COLOR_PALETTE_BASES;
/** @deprecated Use ColorPaletteBase instead */
export type SemanticColorBase = ColorPaletteBase;

// =============================================================================
// BREAKPOINT DEFAULTS
// =============================================================================

export interface BreakpointDef {
  minWidth: number;
  meaning: string;
  devices: string[];
  contexts: string[];
}

export const DEFAULT_BREAKPOINTS: Record<string, BreakpointDef> = {
  sm: {
    minWidth: 640,
    meaning: 'Small screens - landscape phones, small tablets',
    devices: ['phone-landscape', 'small-tablet'],
    contexts: ['mobile-first', 'compact-layouts'],
  },
  md: {
    minWidth: 768,
    meaning: 'Medium screens - tablets, small laptops',
    devices: ['tablet-portrait', 'small-laptop'],
    contexts: ['tablet-layouts', 'sidebar-visible'],
  },
  lg: {
    minWidth: 1024,
    meaning: 'Large screens - laptops, small desktops',
    devices: ['tablet-landscape', 'laptop', 'small-desktop'],
    contexts: ['desktop-layouts', 'multi-column'],
  },
  xl: {
    minWidth: 1280,
    meaning: 'Extra large screens - desktops',
    devices: ['desktop', 'large-laptop'],
    contexts: ['wide-layouts', 'dashboard'],
  },
  '2xl': {
    minWidth: 1536,
    meaning: 'Extra extra large screens - large desktops, monitors',
    devices: ['large-desktop', 'external-monitor'],
    contexts: ['ultra-wide', 'data-dense'],
  },
};

export interface ContainerBreakpointDef {
  /** Width in rem (Tailwind v4 uses rem for container queries) */
  width: number;
  meaning: string;
}

/**
 * Container query breakpoints matching Tailwind v4 defaults.
 *
 * Tailwind v4 uses `--container-*` theme variables with rem values.
 * These create utilities like `@xs:`, `@sm:`, `@md:`, etc.
 *
 * @see https://tailwindcss.com/docs/responsive-design#container-queries
 */
export const DEFAULT_CONTAINER_BREAKPOINTS: Record<string, ContainerBreakpointDef> = {
  // Match Tailwind v4 defaults
  '3xs': { width: 16, meaning: 'Smallest container (256px) - icons, badges' },
  '2xs': { width: 18, meaning: 'Extra extra small (288px) - compact cards' },
  xs: { width: 20, meaning: 'Extra small (320px) - mobile-width cards' },
  sm: { width: 24, meaning: 'Small (384px) - standard cards' },
  md: { width: 28, meaning: 'Medium (448px) - wide cards, panels' },
  lg: { width: 32, meaning: 'Large (512px) - sidebars, dialog content' },
  xl: { width: 36, meaning: 'Extra large (576px) - main content panels' },
  '2xl': { width: 42, meaning: '2XL (672px) - wide content areas' },
  '3xl': { width: 48, meaning: '3XL (768px) - tablet-width containers' },
  '4xl': { width: 56, meaning: '4XL (896px) - wide panels' },
  '5xl': { width: 64, meaning: '5XL (1024px) - desktop content' },
  '6xl': { width: 72, meaning: '6XL (1152px) - wide desktop content' },
  '7xl': { width: 80, meaning: '7XL (1280px) - maximum content width' },
};

// =============================================================================
// DEPTH (Z-INDEX) DEFAULTS
// =============================================================================

export interface DepthDef {
  value: number;
  meaning: string;
  contexts: string[];
  stackingContext: boolean;
}

export const DEFAULT_DEPTH_DEFINITIONS: Record<string, DepthDef> = {
  base: {
    value: 0,
    meaning: 'Base layer - document flow elements',
    contexts: ['regular-content', 'in-flow-elements'],
    stackingContext: false,
  },
  dropdown: {
    value: 10,
    meaning: 'Dropdown menus and select options',
    contexts: ['dropdowns', 'select-menus', 'autocomplete'],
    stackingContext: true,
  },
  sticky: {
    value: 20,
    meaning: 'Sticky elements - headers, toolbars',
    contexts: ['sticky-header', 'sticky-toolbar', 'floating-actions'],
    stackingContext: true,
  },
  navigation: {
    value: 25,
    meaning: 'Navigation panels - sidebars, slide-out nav',
    contexts: ['sidebar', 'navigation-panel', 'slide-out-menu'],
    stackingContext: true,
  },
  fixed: {
    value: 30,
    meaning: 'Fixed elements - always visible',
    contexts: ['fixed-header', 'fixed-footer', 'fab-buttons'],
    stackingContext: true,
  },
  modal: {
    value: 40,
    meaning: 'Modal dialogs - blocking overlays',
    contexts: ['modals', 'dialogs', 'sheets'],
    stackingContext: true,
  },
  popover: {
    value: 50,
    meaning: 'Popovers above modals',
    contexts: ['popovers', 'nested-menus', 'command-palette'],
    stackingContext: true,
  },
  tooltip: {
    value: 60,
    meaning: 'Tooltips - highest common layer',
    contexts: ['tooltips', 'toast-notifications'],
    stackingContext: true,
  },
  overlay: {
    value: 70,
    meaning: 'Overlay backdrops - screen-dimming layers behind modals',
    contexts: ['modal-backdrop', 'drawer-backdrop', 'sheet-backdrop'],
    stackingContext: true,
  },
};

// =============================================================================
// SHADOW DEFAULTS
// =============================================================================

export interface ShadowDef {
  yOffset: number;
  blur: number;
  spread: number;
  opacity: number;
  innerShadow?: {
    yOffset: number;
    blur: number;
    spread: number;
    opacity: number;
  };
  meaning: string;
  contexts: string[];
}

export const DEFAULT_SHADOW_DEFINITIONS: Record<string, ShadowDef> = {
  none: {
    yOffset: 0,
    blur: 0,
    spread: 0,
    opacity: 0,
    meaning: 'No shadow - flat appearance',
    contexts: ['flat-elements', 'inline', 'disabled'],
  },
  xs: {
    yOffset: 0.25,
    blur: 0.5,
    spread: 0,
    opacity: 0.05,
    meaning: 'Extra small shadow - subtle depth hint',
    contexts: ['subtle-cards', 'list-items', 'hover-states'],
  },
  sm: {
    yOffset: 0.25,
    blur: 1,
    spread: 0,
    opacity: 0.06,
    innerShadow: {
      yOffset: 0.25,
      blur: 0.5,
      spread: 0,
      opacity: 0.1,
    },
    meaning: 'Small shadow - slight elevation',
    contexts: ['cards', 'buttons', 'inputs'],
  },
  DEFAULT: {
    yOffset: 0.5,
    blur: 1.5,
    spread: -0.25,
    opacity: 0.1,
    innerShadow: {
      yOffset: 0.25,
      blur: 0.5,
      spread: 0,
      opacity: 0.1,
    },
    meaning: 'Default shadow - standard elevation',
    contexts: ['cards', 'dropdowns', 'floating-elements'],
  },
  md: {
    yOffset: 1,
    blur: 2,
    spread: -0.5,
    opacity: 0.1,
    innerShadow: {
      yOffset: 0.5,
      blur: 1,
      spread: -0.25,
      opacity: 0.1,
    },
    meaning: 'Medium shadow - noticeable elevation',
    contexts: ['hovering-cards', 'active-elements', 'focus-states'],
  },
  lg: {
    yOffset: 2,
    blur: 4,
    spread: -0.75,
    opacity: 0.1,
    innerShadow: {
      yOffset: 1,
      blur: 2,
      spread: -0.5,
      opacity: 0.1,
    },
    meaning: 'Large shadow - significant elevation',
    contexts: ['modals', 'dialogs', 'floating-panels'],
  },
  xl: {
    yOffset: 5,
    blur: 6,
    spread: -1,
    opacity: 0.1,
    innerShadow: {
      yOffset: 2,
      blur: 4,
      spread: -0.75,
      opacity: 0.1,
    },
    meaning: 'Extra large shadow - high elevation',
    contexts: ['large-modals', 'sheet-dialogs', 'command-palettes'],
  },
  '2xl': {
    yOffset: 6,
    blur: 12,
    spread: -2,
    opacity: 0.25,
    meaning: 'Maximum shadow - highest elevation',
    contexts: ['critical-modals', 'overlays', 'drawer-panels'],
  },
};

// =============================================================================
// ELEVATION DEFAULTS
// =============================================================================

export interface ElevationDef {
  depth: string;
  shadow: string;
  meaning: string;
  contexts: string[];
  useCase: string;
}

export const DEFAULT_ELEVATION_DEFINITIONS: Record<string, ElevationDef> = {
  surface: {
    depth: 'depth-base',
    shadow: 'shadow-none',
    meaning: 'Surface level - flat, in-flow elements',
    contexts: ['page-content', 'inline-elements', 'flat-cards'],
    useCase: "Default level for content that doesn't need elevation",
  },
  raised: {
    depth: 'depth-base',
    shadow: 'shadow-sm',
    meaning: 'Slightly raised - subtle depth without z-index change',
    contexts: ['cards', 'panels', 'list-items'],
    useCase: 'Cards and containers that need subtle visual separation',
  },
  overlay: {
    depth: 'depth-dropdown',
    shadow: 'shadow',
    meaning: 'Overlay level - dropdowns and menus',
    contexts: ['dropdowns', 'select-menus', 'autocomplete', 'context-menus'],
    useCase: "Elements that appear over content but aren't blocking",
  },
  sticky: {
    depth: 'depth-sticky',
    shadow: 'shadow-md',
    meaning: 'Sticky level - persistent navigation',
    contexts: ['sticky-header', 'sticky-sidebar', 'floating-nav'],
    useCase: 'Elements that stick to viewport edges during scroll',
  },
  modal: {
    depth: 'depth-modal',
    shadow: 'shadow-lg',
    meaning: 'Modal level - blocking dialogs',
    contexts: ['modals', 'dialogs', 'sheets', 'drawers'],
    useCase: 'Elements that block interaction with content below',
  },
  popover: {
    depth: 'depth-popover',
    shadow: 'shadow-xl',
    meaning: 'Popover level - above modals',
    contexts: ['popovers', 'nested-dialogs', 'command-palette'],
    useCase: 'Elements that can appear above modals (rare)',
  },
  tooltip: {
    depth: 'depth-tooltip',
    shadow: 'shadow-lg',
    meaning: 'Tooltip level - highest common UI',
    contexts: ['tooltips', 'toast-notifications', 'snackbars'],
    useCase: 'Transient information that appears above everything',
  },
};

// =============================================================================
// MOTION DEFAULTS
// =============================================================================

export interface DurationDef {
  /** Steps from base using the progression ratio (0 = base, negative = faster, positive = slower) */
  step: number | 'instant';
  meaning: string;
  contexts: string[];
  motionIntent: 'enter' | 'exit' | 'emphasis' | 'transition';
}

/**
 * Duration scale using step-based progression.
 * Values are computed as: baseDuration * ratio^step
 * With minor-third (1.2) and baseDuration of 150ms:
 *   step -1 = 125ms, step 0 = 150ms, step 1 = 180ms, step 2 = 216ms, etc.
 */
export const DEFAULT_DURATION_DEFINITIONS: Record<string, DurationDef> = {
  instant: {
    step: 'instant',
    meaning: 'Instant - no animation',
    contexts: ['disabled-motion', 'prefers-reduced-motion'],
    motionIntent: 'transition',
  },
  fast: {
    step: -1,
    meaning: 'Fast - micro-interactions, hover states',
    contexts: ['hover', 'focus', 'active', 'micro-feedback'],
    motionIntent: 'transition',
  },
  normal: {
    step: 0,
    meaning: 'Normal - standard UI transitions',
    contexts: ['buttons', 'toggles', 'state-changes'],
    motionIntent: 'transition',
  },
  slow: {
    step: 1,
    meaning: 'Slow - enter/exit animations',
    contexts: ['modals', 'dialogs', 'panels', 'enter-exit'],
    motionIntent: 'enter',
  },
  slower: {
    step: 2,
    meaning: 'Slower - emphasis, large element transitions',
    contexts: ['page-transitions', 'hero-animations', 'emphasis'],
    motionIntent: 'emphasis',
  },
};

export interface EasingDef {
  curve: [number, number, number, number];
  meaning: string;
  contexts: string[];
  css: string;
}

export const DEFAULT_EASING_DEFINITIONS: Record<string, EasingDef> = {
  linear: {
    curve: [0, 0, 1, 1],
    meaning: 'Linear - constant speed, mechanical feel',
    contexts: ['progress-bars', 'loading-spinners', 'opacity-fades'],
    css: 'linear',
  },
  'ease-in': {
    curve: [0.42, 0, 1, 1],
    meaning: 'Ease in - starts slow, accelerates (exiting)',
    contexts: ['exit-animations', 'elements-leaving'],
    css: 'cubic-bezier(0.42, 0, 1, 1)',
  },
  'ease-out': {
    curve: [0, 0, 0.58, 1],
    meaning: 'Ease out - starts fast, decelerates (entering)',
    contexts: ['enter-animations', 'elements-appearing'],
    css: 'cubic-bezier(0, 0, 0.58, 1)',
  },
  'ease-in-out': {
    curve: [0.42, 0, 0.58, 1],
    meaning: 'Ease in-out - symmetric acceleration/deceleration',
    contexts: ['state-changes', 'transforms', 'general-purpose'],
    css: 'cubic-bezier(0.42, 0, 0.58, 1)',
  },
  productive: {
    curve: [0.2, 0, 0.38, 0.9],
    meaning: 'Productive - quick, efficient, minimal overshoot',
    contexts: ['work-ui', 'data-displays', 'business-apps'],
    css: 'cubic-bezier(0.2, 0, 0.38, 0.9)',
  },
  expressive: {
    curve: [0.4, 0.14, 0.3, 1],
    meaning: 'Expressive - dramatic, attention-grabbing',
    contexts: ['marketing', 'onboarding', 'celebrations', 'emphasis'],
    css: 'cubic-bezier(0.4, 0.14, 0.3, 1)',
  },
  spring: {
    curve: [0.175, 0.885, 0.32, 1.275],
    meaning: 'Spring - bouncy overshoot for playful feel',
    contexts: ['buttons', 'icons', 'playful-ui', 'celebrations'],
    css: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
};

export interface DelayDef {
  /** Steps from base using the progression ratio (0 = base, negative = shorter, positive = longer) */
  step: number | 'none';
}

/**
 * Delay scale using step-based progression.
 * Values are computed as: baseDuration * ratio^step
 * With minor-third (1.2) and baseDuration of 150ms:
 *   step -1 = 125ms, step 0 = 150ms, step 1 = 180ms, step 2 = 216ms, etc.
 */
export const DEFAULT_DELAY_DEFINITIONS: Record<string, DelayDef> = {
  none: { step: 'none' },
  short: { step: -1 },
  medium: { step: 0 },
  long: { step: 1 },
};

// =============================================================================
// FOCUS DEFAULTS
// =============================================================================

export interface FocusConfig {
  width: number;
  offset: number;
  style: 'solid' | 'dashed' | 'double';
  meaning: string;
  contexts: string[];
}

export const DEFAULT_FOCUS_CONFIGS: Record<string, FocusConfig> = {
  default: {
    width: 2,
    offset: 2,
    style: 'solid',
    meaning: 'Default focus ring - suitable for most interactive elements',
    contexts: ['buttons', 'links', 'inputs', 'selects'],
  },
  inset: {
    width: 2,
    offset: -2,
    style: 'solid',
    meaning: 'Inset focus ring - for elements where external ring would be cut off',
    contexts: ['cards', 'containers', 'overflow-hidden'],
  },
  thick: {
    width: 3,
    offset: 2,
    style: 'solid',
    meaning: 'Thick focus ring - for high-visibility needs',
    contexts: ['critical-actions', 'primary-cta', 'accessibility-mode'],
  },
  subtle: {
    width: 1,
    offset: 2,
    style: 'solid',
    meaning: 'Subtle focus ring - for dense UIs with many focusable elements',
    contexts: ['table-cells', 'list-items', 'dense-ui'],
  },
};

// =============================================================================
// RADIUS DEFAULTS
// =============================================================================

export interface RadiusDef {
  /** Steps from base using the progression ratio (0 = base, negative = smaller, positive = larger) */
  step: number | 'full' | 'none';
  meaning: string;
  contexts: string[];
}

/**
 * Radius scale using step-based progression.
 * Values are computed as: baseRadius * ratio^step
 * With minor-third (1.2) and baseRadius of 4px:
 *   step -1 = 3.33px, step 0 = 4px, step 1 = 4.8px, step 2 = 5.76px, etc.
 */
export const DEFAULT_RADIUS_DEFINITIONS: Record<string, RadiusDef> = {
  none: {
    step: 'none',
    meaning: 'No border radius - sharp corners',
    contexts: ['sharp-corners', 'table-cells', 'inline-elements'],
  },
  sm: {
    step: -1,
    meaning: 'Small radius for subtle rounding',
    contexts: ['badges', 'tags', 'small-elements', 'inline-blocks'],
  },
  DEFAULT: {
    step: 0,
    meaning: 'Default radius - primary UI elements',
    contexts: ['buttons', 'inputs', 'cards', 'dropdowns'],
  },
  md: {
    step: 1,
    meaning: 'Medium radius for containers',
    contexts: ['cards', 'panels', 'dialogs'],
  },
  lg: {
    step: 2,
    meaning: 'Large radius for prominent containers',
    contexts: ['modals', 'large-cards', 'feature-panels'],
  },
  xl: {
    step: 3,
    meaning: 'Extra large radius for emphasized elements',
    contexts: ['hero-cards', 'featured-sections'],
  },
  '2xl': {
    step: 4,
    meaning: 'Maximum meaningful radius',
    contexts: ['pills', 'large-avatars', 'emphasized-buttons'],
  },
  '3xl': {
    step: 5,
    meaning: 'Very large radius for special cases',
    contexts: ['stadium-shapes', 'special-emphasis'],
  },
  full: {
    step: 'full',
    meaning: 'Fully rounded - circles and pills',
    contexts: ['avatars', 'pill-buttons', 'circular-elements'],
  },
};

// =============================================================================
// SPACING DEFAULTS
// =============================================================================

/**
 * Spacing scale multipliers for Tailwind-compatible output
 * Maps scale names to their multiplier of the base unit
 */
export const DEFAULT_SPACING_MULTIPLIERS: Record<string, number> = {
  '0': 0,
  '0.5': 0.5,
  '1': 1,
  '1.5': 1.5,
  '2': 2,
  '2.5': 2.5,
  '3': 3,
  '3.5': 3.5,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  '11': 11,
  '12': 12,
  '14': 14,
  '16': 16,
  '20': 20,
  '24': 24,
  '28': 28,
  '32': 32,
  '36': 36,
  '40': 40,
  '44': 44,
  '48': 48,
  '52': 52,
  '56': 56,
  '60': 60,
  '64': 64,
  '72': 72,
  '80': 80,
  '96': 96,
};

// =============================================================================
// TYPOGRAPHY DEFAULTS
// =============================================================================

export interface TypographyScaleDef {
  /** Steps from base (negative = smaller, positive = larger) */
  step: number;
  lineHeight: number;
  letterSpacing: string;
}

export const DEFAULT_TYPOGRAPHY_SCALE: Record<string, TypographyScaleDef> = {
  xs: { step: -2, lineHeight: 1.5, letterSpacing: '0.025em' },
  sm: { step: -1, lineHeight: 1.5, letterSpacing: '0.015em' },
  base: { step: 0, lineHeight: 1.5, letterSpacing: '0' },
  lg: { step: 1, lineHeight: 1.5, letterSpacing: '-0.01em' },
  xl: { step: 2, lineHeight: 1.4, letterSpacing: '-0.015em' },
  '2xl': { step: 3, lineHeight: 1.35, letterSpacing: '-0.02em' },
  '3xl': { step: 4, lineHeight: 1.3, letterSpacing: '-0.025em' },
  '4xl': { step: 5, lineHeight: 1.25, letterSpacing: '-0.03em' },
  '5xl': { step: 6, lineHeight: 1.2, letterSpacing: '-0.035em' },
  '6xl': { step: 7, lineHeight: 1.15, letterSpacing: '-0.04em' },
  '7xl': { step: 8, lineHeight: 1.1, letterSpacing: '-0.045em' },
  '8xl': { step: 9, lineHeight: 1.1, letterSpacing: '-0.05em' },
  '9xl': { step: 10, lineHeight: 1.1, letterSpacing: '-0.05em' },
};

export interface FontWeightDef {
  value: number;
  meaning: string;
  contexts: string[];
}

export const DEFAULT_FONT_WEIGHTS: Record<string, FontWeightDef> = {
  thin: { value: 100, meaning: 'Thin weight', contexts: ['display', 'decorative'] },
  extralight: { value: 200, meaning: 'Extra light weight', contexts: ['large-display'] },
  light: { value: 300, meaning: 'Light weight', contexts: ['body-large', 'display'] },
  normal: { value: 400, meaning: 'Normal weight', contexts: ['body-text', 'default'] },
  medium: { value: 500, meaning: 'Medium weight', contexts: ['emphasis', 'labels'] },
  semibold: { value: 600, meaning: 'Semibold weight', contexts: ['headings', 'buttons'] },
  bold: { value: 700, meaning: 'Bold weight', contexts: ['strong-emphasis', 'headings'] },
  extrabold: { value: 800, meaning: 'Extra bold weight', contexts: ['display', 'hero'] },
  black: { value: 900, meaning: 'Black weight', contexts: ['display', 'impact'] },
};

export const DEFAULT_LINE_HEIGHTS: Record<string, number> = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
};

// =============================================================================
// SEMANTIC COLOR MAPPINGS
// =============================================================================

/**
 * Semantic color mapping definition.
 * Maps a semantic token name to its light and dark mode color references.
 */
export interface SemanticColorMapping {
  /** Color family and position for light mode */
  light: { family: string; position: string };
  /** Color family and position for dark mode */
  dark: { family: string; position: string };
  /** Semantic meaning for MCP intelligence */
  meaning: string;
  /** Usage contexts */
  contexts: string[];
  /** Do patterns */
  do: string[];
  /** Never patterns */
  never: string[];
  /** Trust level for this color */
  trustLevel?: 'low' | 'medium' | 'high' | 'critical';
  /** Consequence of actions using this color */
  consequence?: 'reversible' | 'significant' | 'permanent' | 'destructive';
}

/**
 * Rafters Semantic Color Mappings
 *
 * This is the single source of truth for semantic color definitions.
 * All exporters (Tailwind, DTCG, TypeScript) read from this via the registry.
 *
 * Color family names from API cache (api.rafters.studio):
 * - neutral: zinc (achromatic)
 * - silver-true-glacier: cyan/teal (h:180)
 * - silver-bold-fire-truck: red (h:0)
 * - silver-true-honey: amber/gold (h:60)
 * - silver-true-citrine: lime/green (h:90)
 * - silver-true-sky: blue (h:210)
 * - silver-true-violet: violet/purple (h:270)
 *
 * Contrast Requirements (WCAG 2.2 AA):
 * - Normal text: 4.5:1 minimum
 * - Large text (18px+ or 14px+ bold): 3:1 minimum
 * - UI components: 3:1 minimum
 * - Focus indicators: 3:1 minimum
 */
export const DEFAULT_SEMANTIC_COLOR_MAPPINGS: Record<string, SemanticColorMapping> = {
  // ============================================================================
  // CORE SURFACE TOKENS (shadcn compatible)
  // ============================================================================
  background: {
    light: { family: 'neutral', position: '50' },
    dark: { family: 'neutral', position: '950' },
    meaning: 'Primary page background color',
    contexts: ['page-bg', 'app-background'],
    do: ['Use for main page background'],
    never: ['Use for interactive elements'],
  },
  foreground: {
    light: { family: 'neutral', position: '950' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Primary text color',
    contexts: ['body-text', 'headings', 'primary-content'],
    do: ['Use for main text content', 'Use for headings'],
    never: ['Use on dark backgrounds without checking contrast'],
  },

  // Card surfaces
  card: {
    light: { family: 'neutral', position: '50' },
    dark: { family: 'neutral', position: '950' },
    meaning: 'Card and contained surface background',
    contexts: ['cards', 'modals', 'dialogs', 'panels'],
    do: ['Use for elevated surfaces'],
    never: ['Use for page-level backgrounds'],
  },
  'card-foreground': {
    light: { family: 'neutral', position: '950' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Text on card surfaces',
    contexts: ['card-text', 'modal-text'],
    do: ['Use for text within cards'],
    never: ['Use without card background'],
  },
  'card-hover': {
    light: { family: 'neutral', position: '100' },
    dark: { family: 'neutral', position: '900' },
    meaning: 'Card hover state background',
    contexts: ['card-hover'],
    do: ['Use for card hover states'],
    never: ['Use as default card background'],
  },
  'card-border': {
    light: { family: 'neutral', position: '200' },
    dark: { family: 'neutral', position: '800' },
    meaning: 'Card border color',
    contexts: ['card-borders'],
    do: ['Use for card borders'],
    never: ['Use for dividers within cards'],
  },

  // Popover surfaces
  popover: {
    light: { family: 'neutral', position: '50' },
    dark: { family: 'neutral', position: '950' },
    meaning: 'Popover and dropdown background',
    contexts: ['dropdowns', 'tooltips', 'menus'],
    do: ['Use for floating elements'],
    never: ['Use for static content'],
  },
  'popover-foreground': {
    light: { family: 'neutral', position: '950' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Text in popovers',
    contexts: ['dropdown-text', 'menu-text'],
    do: ['Use for popover content'],
    never: ['Use outside floating elements'],
  },
  'popover-border': {
    light: { family: 'neutral', position: '200' },
    dark: { family: 'neutral', position: '800' },
    meaning: 'Popover border color',
    contexts: ['popover-borders'],
    do: ['Use for popover borders'],
    never: ['Use for content borders'],
  },

  // Generic surface
  surface: {
    light: { family: 'neutral', position: '50' },
    dark: { family: 'neutral', position: '900' },
    meaning: 'Elevated surface background',
    contexts: ['elevated-elements'],
    do: ['Use for elevated surfaces'],
    never: ['Use for page background'],
  },
  'surface-foreground': {
    light: { family: 'neutral', position: '950' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Text on surface backgrounds',
    contexts: ['surface-text'],
    do: ['Use for text on surfaces'],
    never: ['Use without surface background'],
  },
  'surface-hover': {
    light: { family: 'neutral', position: '100' },
    dark: { family: 'neutral', position: '800' },
    meaning: 'Surface hover state',
    contexts: ['surface-hover'],
    do: ['Use for surface hover states'],
    never: ['Use as default surface'],
  },
  'surface-active': {
    light: { family: 'neutral', position: '200' },
    dark: { family: 'neutral', position: '700' },
    meaning: 'Surface active/pressed state',
    contexts: ['surface-active'],
    do: ['Use for active surface states'],
    never: ['Use for hover states'],
  },
  'surface-border': {
    light: { family: 'neutral', position: '200' },
    dark: { family: 'neutral', position: '800' },
    meaning: 'Surface border color',
    contexts: ['surface-borders'],
    do: ['Use for surface borders'],
    never: ['Use for content dividers'],
  },

  // ============================================================================
  // PRIMARY - Main brand/action color (shadcn compatible + extended)
  // ============================================================================
  primary: {
    light: { family: 'neutral', position: '900' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Primary interactive elements - buttons, links, focus states',
    contexts: ['primary-buttons', 'links', 'active-states'],
    do: ['Use for main CTA buttons', 'Use for primary links'],
    never: ['Use multiple primary buttons competing', 'Use for destructive actions'],
    trustLevel: 'high',
    consequence: 'reversible',
  },
  'primary-foreground': {
    light: { family: 'neutral', position: '50' },
    dark: { family: 'neutral', position: '900' },
    meaning: 'Text on primary color backgrounds',
    contexts: ['button-text', 'primary-action-text'],
    do: ['Use for text on primary buttons'],
    never: ['Use without primary background'],
  },
  'primary-hover': {
    light: { family: 'neutral', position: '800' },
    dark: { family: 'neutral', position: '200' },
    meaning: 'Primary hover state',
    contexts: ['primary-hover'],
    do: ['Use for primary button hover'],
    never: ['Use as default primary'],
  },
  'primary-hover-foreground': {
    light: { family: 'neutral', position: '50' },
    dark: { family: 'neutral', position: '900' },
    meaning: 'Text on primary hover',
    contexts: ['primary-hover-text'],
    do: ['Use for text on primary hover'],
    never: ['Use without primary-hover background'],
  },
  'primary-active': {
    light: { family: 'neutral', position: '700' },
    dark: { family: 'neutral', position: '300' },
    meaning: 'Primary active/pressed state',
    contexts: ['primary-active'],
    do: ['Use for primary button active state'],
    never: ['Use for hover states'],
  },
  'primary-active-foreground': {
    light: { family: 'neutral', position: '50' },
    dark: { family: 'neutral', position: '900' },
    meaning: 'Text on primary active',
    contexts: ['primary-active-text'],
    do: ['Use for text on primary active'],
    never: ['Use without primary-active background'],
  },
  'primary-focus': {
    light: { family: 'neutral', position: '900' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Primary focus state',
    contexts: ['primary-focus'],
    do: ['Use for primary focus states'],
    never: ['Use for non-focused elements'],
  },
  'primary-border': {
    light: { family: 'neutral', position: '900' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Primary border color',
    contexts: ['primary-borders'],
    do: ['Use for primary element borders'],
    never: ['Use for neutral borders'],
  },
  'primary-ring': {
    light: { family: 'neutral', position: '900' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Primary focus ring color',
    contexts: ['primary-focus-ring'],
    do: ['Use for primary element focus rings'],
    never: ['Use for decorative rings'],
  },
  'primary-subtle': {
    light: { family: 'neutral', position: '100' },
    dark: { family: 'neutral', position: '900' },
    meaning: 'Subtle primary background for badges/alerts',
    contexts: ['primary-badges', 'primary-alerts'],
    do: ['Use for subtle primary backgrounds'],
    never: ['Use for primary buttons'],
  },
  'primary-subtle-foreground': {
    light: { family: 'neutral', position: '900' },
    dark: { family: 'neutral', position: '100' },
    meaning: 'Text on subtle primary backgrounds',
    contexts: ['primary-subtle-text'],
    do: ['Use for text on subtle primary'],
    never: ['Use without primary-subtle background'],
  },

  // ============================================================================
  // SECONDARY - Alternative action color (shadcn compatible + extended)
  // ============================================================================
  secondary: {
    light: { family: 'neutral', position: '100' },
    dark: { family: 'neutral', position: '800' },
    meaning: 'Secondary interactive elements - less prominent actions',
    contexts: ['secondary-buttons', 'alternative-actions'],
    do: ['Use for secondary actions', 'Use when primary is too strong'],
    never: ['Use for primary CTAs'],
    trustLevel: 'medium',
    consequence: 'reversible',
  },
  'secondary-foreground': {
    light: { family: 'neutral', position: '900' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Text on secondary color backgrounds',
    contexts: ['secondary-button-text'],
    do: ['Use for text on secondary buttons'],
    never: ['Use without secondary background'],
  },
  'secondary-hover': {
    light: { family: 'neutral', position: '200' },
    dark: { family: 'neutral', position: '700' },
    meaning: 'Secondary hover state',
    contexts: ['secondary-hover'],
    do: ['Use for secondary hover'],
    never: ['Use as default secondary'],
  },
  'secondary-hover-foreground': {
    light: { family: 'neutral', position: '900' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Text on secondary hover',
    contexts: ['secondary-hover-text'],
    do: ['Use for text on secondary hover'],
    never: ['Use without secondary-hover background'],
  },
  'secondary-active': {
    light: { family: 'neutral', position: '300' },
    dark: { family: 'neutral', position: '600' },
    meaning: 'Secondary active/pressed state',
    contexts: ['secondary-active'],
    do: ['Use for secondary active state'],
    never: ['Use for hover states'],
  },
  'secondary-active-foreground': {
    light: { family: 'neutral', position: '900' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Text on secondary active',
    contexts: ['secondary-active-text'],
    do: ['Use for text on secondary active'],
    never: ['Use without secondary-active background'],
  },
  'secondary-focus': {
    light: { family: 'neutral', position: '100' },
    dark: { family: 'neutral', position: '800' },
    meaning: 'Secondary focus state',
    contexts: ['secondary-focus'],
    do: ['Use for secondary focus states'],
    never: ['Use for non-focused elements'],
  },
  'secondary-border': {
    light: { family: 'neutral', position: '300' },
    dark: { family: 'neutral', position: '700' },
    meaning: 'Secondary border color',
    contexts: ['secondary-borders'],
    do: ['Use for secondary element borders'],
    never: ['Use for primary borders'],
  },
  'secondary-ring': {
    light: { family: 'neutral', position: '400' },
    dark: { family: 'neutral', position: '500' },
    meaning: 'Secondary focus ring color',
    contexts: ['secondary-focus-ring'],
    do: ['Use for secondary element focus rings'],
    never: ['Use for decorative rings'],
  },

  // ============================================================================
  // MUTED - Subdued elements (shadcn compatible + extended)
  // ============================================================================
  muted: {
    light: { family: 'neutral', position: '100' },
    dark: { family: 'neutral', position: '800' },
    meaning: 'Muted backgrounds for subtle emphasis',
    contexts: ['subtle-backgrounds', 'inactive-tabs', 'disabled-areas'],
    do: ['Use for subtle background differentiation'],
    never: ['Use for interactive elements needing visibility'],
  },
  'muted-foreground': {
    light: { family: 'neutral', position: '500' },
    dark: { family: 'neutral', position: '400' },
    meaning: 'Muted text for secondary information',
    contexts: ['helper-text', 'placeholders', 'metadata'],
    do: ['Use for secondary text', 'Use for placeholders'],
    never: ['Use for primary content', 'Use for important information'],
  },
  'muted-hover': {
    light: { family: 'neutral', position: '200' },
    dark: { family: 'neutral', position: '700' },
    meaning: 'Muted hover state',
    contexts: ['muted-hover'],
    do: ['Use for muted hover states'],
    never: ['Use as default muted'],
  },
  'muted-hover-foreground': {
    light: { family: 'neutral', position: '600' },
    dark: { family: 'neutral', position: '300' },
    meaning: 'Text on muted hover',
    contexts: ['muted-hover-text'],
    do: ['Use for text on muted hover'],
    never: ['Use without muted-hover background'],
  },
  'muted-active': {
    light: { family: 'neutral', position: '300' },
    dark: { family: 'neutral', position: '600' },
    meaning: 'Muted active state',
    contexts: ['muted-active'],
    do: ['Use for muted active states'],
    never: ['Use for hover states'],
  },
  'muted-border': {
    light: { family: 'neutral', position: '200' },
    dark: { family: 'neutral', position: '700' },
    meaning: 'Muted border color',
    contexts: ['muted-borders'],
    do: ['Use for muted element borders'],
    never: ['Use for emphasized borders'],
  },

  // ============================================================================
  // ACCENT - Highlight/emphasis color (shadcn compatible + extended)
  // ============================================================================
  accent: {
    light: { family: 'neutral', position: '100' },
    dark: { family: 'neutral', position: '800' },
    meaning: 'Accent for hover states and highlights',
    contexts: ['hover-states', 'selected-items', 'focus-backgrounds'],
    do: ['Use for hover backgrounds', 'Use for selected states'],
    never: ['Use for primary actions'],
  },
  'accent-foreground': {
    light: { family: 'neutral', position: '900' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Text on accent backgrounds',
    contexts: ['hover-text', 'selected-text'],
    do: ['Use for text on accent backgrounds'],
    never: ['Use without accent background'],
  },
  'accent-hover': {
    light: { family: 'neutral', position: '200' },
    dark: { family: 'neutral', position: '700' },
    meaning: 'Accent hover state',
    contexts: ['accent-hover'],
    do: ['Use for accent hover states'],
    never: ['Use as default accent'],
  },
  'accent-hover-foreground': {
    light: { family: 'neutral', position: '900' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Text on accent hover',
    contexts: ['accent-hover-text'],
    do: ['Use for text on accent hover'],
    never: ['Use without accent-hover background'],
  },
  'accent-active': {
    light: { family: 'neutral', position: '300' },
    dark: { family: 'neutral', position: '600' },
    meaning: 'Accent active state',
    contexts: ['accent-active'],
    do: ['Use for accent active states'],
    never: ['Use for hover states'],
  },
  'accent-active-foreground': {
    light: { family: 'neutral', position: '900' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Text on accent active',
    contexts: ['accent-active-text'],
    do: ['Use for text on accent active'],
    never: ['Use without accent-active background'],
  },
  'accent-border': {
    light: { family: 'neutral', position: '300' },
    dark: { family: 'neutral', position: '700' },
    meaning: 'Accent border color',
    contexts: ['accent-borders'],
    do: ['Use for accent element borders'],
    never: ['Use for neutral borders'],
  },
  'accent-ring': {
    light: { family: 'neutral', position: '400' },
    dark: { family: 'neutral', position: '500' },
    meaning: 'Accent focus ring color',
    contexts: ['accent-focus-ring'],
    do: ['Use for accent element focus rings'],
    never: ['Use for decorative rings'],
  },

  // ============================================================================
  // DESTRUCTIVE - Error/danger actions (shadcn compatible + extended)
  // Uses silver-bold-fire-truck (red)
  // ============================================================================
  destructive: {
    light: { family: 'silver-bold-fire-truck', position: '600' },
    dark: { family: 'silver-bold-fire-truck', position: '500' },
    meaning: 'Destructive actions - delete, remove, critical warnings',
    contexts: ['delete-buttons', 'error-states', 'critical-alerts'],
    do: ['Use for irreversible actions', 'Always require confirmation'],
    never: ['Use for non-destructive actions', 'Use without clear consequence communication'],
    trustLevel: 'critical',
    consequence: 'destructive',
  },
  'destructive-foreground': {
    light: { family: 'neutral', position: '50' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Text on destructive backgrounds',
    contexts: ['delete-button-text', 'error-message-text'],
    do: ['Use for text on destructive buttons'],
    never: ['Use without destructive background'],
  },
  'destructive-hover': {
    light: { family: 'silver-bold-fire-truck', position: '700' },
    dark: { family: 'silver-bold-fire-truck', position: '400' },
    meaning: 'Destructive hover state',
    contexts: ['destructive-hover'],
    do: ['Use for destructive hover states'],
    never: ['Use as default destructive'],
  },
  'destructive-hover-foreground': {
    light: { family: 'neutral', position: '50' },
    dark: { family: 'neutral', position: '950' },
    meaning: 'Text on destructive hover',
    contexts: ['destructive-hover-text'],
    do: ['Use for text on destructive hover'],
    never: ['Use without destructive-hover background'],
  },
  'destructive-active': {
    light: { family: 'silver-bold-fire-truck', position: '800' },
    dark: { family: 'silver-bold-fire-truck', position: '300' },
    meaning: 'Destructive active/pressed state',
    contexts: ['destructive-active'],
    do: ['Use for destructive active state'],
    never: ['Use for hover states'],
  },
  'destructive-active-foreground': {
    light: { family: 'neutral', position: '50' },
    dark: { family: 'neutral', position: '950' },
    meaning: 'Text on destructive active',
    contexts: ['destructive-active-text'],
    do: ['Use for text on destructive active'],
    never: ['Use without destructive-active background'],
  },
  'destructive-focus': {
    light: { family: 'silver-bold-fire-truck', position: '600' },
    dark: { family: 'silver-bold-fire-truck', position: '500' },
    meaning: 'Destructive focus state',
    contexts: ['destructive-focus'],
    do: ['Use for destructive focus states'],
    never: ['Use for non-focused elements'],
  },
  'destructive-border': {
    light: { family: 'silver-bold-fire-truck', position: '600' },
    dark: { family: 'silver-bold-fire-truck', position: '500' },
    meaning: 'Destructive border color',
    contexts: ['destructive-borders'],
    do: ['Use for destructive element borders'],
    never: ['Use for neutral borders'],
  },
  'destructive-ring': {
    light: { family: 'silver-bold-fire-truck', position: '600' },
    dark: { family: 'silver-bold-fire-truck', position: '400' },
    meaning: 'Destructive focus ring color',
    contexts: ['destructive-focus-ring'],
    do: ['Use for destructive element focus rings'],
    never: ['Use for decorative rings'],
  },
  'destructive-subtle': {
    light: { family: 'silver-bold-fire-truck', position: '50' },
    dark: { family: 'silver-bold-fire-truck', position: '950' },
    meaning: 'Subtle destructive background for error alerts',
    contexts: ['error-alerts', 'validation-messages'],
    do: ['Use for subtle error backgrounds'],
    never: ['Use for destructive buttons'],
  },
  'destructive-subtle-foreground': {
    light: { family: 'silver-bold-fire-truck', position: '700' },
    dark: { family: 'silver-bold-fire-truck', position: '300' },
    meaning: 'Text on subtle destructive backgrounds',
    contexts: ['error-alert-text'],
    do: ['Use for text on subtle destructive'],
    never: ['Use without destructive-subtle background'],
  },

  // ============================================================================
  // SUCCESS - Positive/confirmation states
  // Uses silver-true-citrine (green)
  // ============================================================================
  success: {
    light: { family: 'silver-true-citrine', position: '600' },
    dark: { family: 'silver-true-citrine', position: '500' },
    meaning: 'Success states - confirmations, completions, positive feedback',
    contexts: ['success-messages', 'completion-states', 'valid-inputs'],
    do: ['Use for positive feedback', 'Use for completion confirmation'],
    never: ['Use for neutral information', 'Use for warnings'],
    trustLevel: 'high',
    consequence: 'reversible',
  },
  'success-foreground': {
    light: { family: 'neutral', position: '50' },
    dark: { family: 'neutral', position: '950' },
    meaning: 'Text on success backgrounds',
    contexts: ['success-message-text'],
    do: ['Use for text on success backgrounds'],
    never: ['Use without success background'],
  },
  'success-hover': {
    light: { family: 'silver-true-citrine', position: '700' },
    dark: { family: 'silver-true-citrine', position: '400' },
    meaning: 'Success hover state',
    contexts: ['success-hover'],
    do: ['Use for success hover states'],
    never: ['Use as default success'],
  },
  'success-hover-foreground': {
    light: { family: 'neutral', position: '50' },
    dark: { family: 'neutral', position: '950' },
    meaning: 'Text on success hover',
    contexts: ['success-hover-text'],
    do: ['Use for text on success hover'],
    never: ['Use without success-hover background'],
  },
  'success-active': {
    light: { family: 'silver-true-citrine', position: '800' },
    dark: { family: 'silver-true-citrine', position: '300' },
    meaning: 'Success active/pressed state',
    contexts: ['success-active'],
    do: ['Use for success active state'],
    never: ['Use for hover states'],
  },
  'success-active-foreground': {
    light: { family: 'neutral', position: '50' },
    dark: { family: 'neutral', position: '950' },
    meaning: 'Text on success active',
    contexts: ['success-active-text'],
    do: ['Use for text on success active'],
    never: ['Use without success-active background'],
  },
  'success-focus': {
    light: { family: 'silver-true-citrine', position: '600' },
    dark: { family: 'silver-true-citrine', position: '500' },
    meaning: 'Success focus state',
    contexts: ['success-focus'],
    do: ['Use for success focus states'],
    never: ['Use for non-focused elements'],
  },
  'success-border': {
    light: { family: 'silver-true-citrine', position: '600' },
    dark: { family: 'silver-true-citrine', position: '500' },
    meaning: 'Success border color',
    contexts: ['success-borders'],
    do: ['Use for success element borders'],
    never: ['Use for neutral borders'],
  },
  'success-ring': {
    light: { family: 'silver-true-citrine', position: '600' },
    dark: { family: 'silver-true-citrine', position: '400' },
    meaning: 'Success focus ring color',
    contexts: ['success-focus-ring'],
    do: ['Use for success element focus rings'],
    never: ['Use for decorative rings'],
  },
  'success-subtle': {
    light: { family: 'silver-true-citrine', position: '50' },
    dark: { family: 'silver-true-citrine', position: '950' },
    meaning: 'Subtle success background for success alerts',
    contexts: ['success-alerts', 'validation-success'],
    do: ['Use for subtle success backgrounds'],
    never: ['Use for success buttons'],
  },
  'success-subtle-foreground': {
    light: { family: 'silver-true-citrine', position: '700' },
    dark: { family: 'silver-true-citrine', position: '300' },
    meaning: 'Text on subtle success backgrounds',
    contexts: ['success-alert-text'],
    do: ['Use for text on subtle success'],
    never: ['Use without success-subtle background'],
  },

  // ============================================================================
  // WARNING - Caution states
  // Uses silver-true-honey (amber/gold)
  // ============================================================================
  warning: {
    light: { family: 'silver-true-honey', position: '500' },
    dark: { family: 'silver-true-honey', position: '500' },
    meaning: 'Warning states - caution, potential issues, important notices',
    contexts: ['warning-messages', 'caution-alerts', 'validation-warnings'],
    do: ['Use for cautionary information', 'Use for potential issues'],
    never: ['Use for critical errors', 'Use for success states'],
    trustLevel: 'medium',
    consequence: 'significant',
  },
  'warning-foreground': {
    light: { family: 'neutral', position: '950' },
    dark: { family: 'neutral', position: '950' },
    meaning: 'Text on warning backgrounds',
    contexts: ['warning-message-text'],
    do: ['Use for text on warning backgrounds'],
    never: ['Use without warning background'],
  },
  'warning-hover': {
    light: { family: 'silver-true-honey', position: '600' },
    dark: { family: 'silver-true-honey', position: '400' },
    meaning: 'Warning hover state',
    contexts: ['warning-hover'],
    do: ['Use for warning hover states'],
    never: ['Use as default warning'],
  },
  'warning-hover-foreground': {
    light: { family: 'neutral', position: '950' },
    dark: { family: 'neutral', position: '950' },
    meaning: 'Text on warning hover',
    contexts: ['warning-hover-text'],
    do: ['Use for text on warning hover'],
    never: ['Use without warning-hover background'],
  },
  'warning-active': {
    light: { family: 'silver-true-honey', position: '700' },
    dark: { family: 'silver-true-honey', position: '300' },
    meaning: 'Warning active/pressed state',
    contexts: ['warning-active'],
    do: ['Use for warning active state'],
    never: ['Use for hover states'],
  },
  'warning-active-foreground': {
    light: { family: 'neutral', position: '50' },
    dark: { family: 'neutral', position: '950' },
    meaning: 'Text on warning active',
    contexts: ['warning-active-text'],
    do: ['Use for text on warning active'],
    never: ['Use without warning-active background'],
  },
  'warning-focus': {
    light: { family: 'silver-true-honey', position: '500' },
    dark: { family: 'silver-true-honey', position: '500' },
    meaning: 'Warning focus state',
    contexts: ['warning-focus'],
    do: ['Use for warning focus states'],
    never: ['Use for non-focused elements'],
  },
  'warning-border': {
    light: { family: 'silver-true-honey', position: '500' },
    dark: { family: 'silver-true-honey', position: '500' },
    meaning: 'Warning border color',
    contexts: ['warning-borders'],
    do: ['Use for warning element borders'],
    never: ['Use for neutral borders'],
  },
  'warning-ring': {
    light: { family: 'silver-true-honey', position: '600' },
    dark: { family: 'silver-true-honey', position: '400' },
    meaning: 'Warning focus ring color',
    contexts: ['warning-focus-ring'],
    do: ['Use for warning element focus rings'],
    never: ['Use for decorative rings'],
  },
  'warning-subtle': {
    light: { family: 'silver-true-honey', position: '50' },
    dark: { family: 'silver-true-honey', position: '950' },
    meaning: 'Subtle warning background for warning alerts',
    contexts: ['warning-alerts'],
    do: ['Use for subtle warning backgrounds'],
    never: ['Use for warning buttons'],
  },
  'warning-subtle-foreground': {
    light: { family: 'silver-true-honey', position: '800' },
    dark: { family: 'silver-true-honey', position: '200' },
    meaning: 'Text on subtle warning backgrounds',
    contexts: ['warning-alert-text'],
    do: ['Use for text on subtle warning'],
    never: ['Use without warning-subtle background'],
  },

  // ============================================================================
  // INFO - Informational states
  // Uses silver-true-sky (blue)
  // ============================================================================
  info: {
    light: { family: 'silver-true-sky', position: '600' },
    dark: { family: 'silver-true-sky', position: '500' },
    meaning: 'Informational states - tips, help, neutral information',
    contexts: ['info-messages', 'tooltips', 'help-text'],
    do: ['Use for helpful information', 'Use for tips and guidance'],
    never: ['Use for warnings or errors'],
    trustLevel: 'low',
    consequence: 'reversible',
  },
  'info-foreground': {
    light: { family: 'neutral', position: '50' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Text on info backgrounds',
    contexts: ['info-message-text'],
    do: ['Use for text on info backgrounds'],
    never: ['Use without info background'],
  },
  'info-hover': {
    light: { family: 'silver-true-sky', position: '700' },
    dark: { family: 'silver-true-sky', position: '400' },
    meaning: 'Info hover state',
    contexts: ['info-hover'],
    do: ['Use for info hover states'],
    never: ['Use as default info'],
  },
  'info-hover-foreground': {
    light: { family: 'neutral', position: '50' },
    dark: { family: 'neutral', position: '950' },
    meaning: 'Text on info hover',
    contexts: ['info-hover-text'],
    do: ['Use for text on info hover'],
    never: ['Use without info-hover background'],
  },
  'info-active': {
    light: { family: 'silver-true-sky', position: '800' },
    dark: { family: 'silver-true-sky', position: '300' },
    meaning: 'Info active/pressed state',
    contexts: ['info-active'],
    do: ['Use for info active state'],
    never: ['Use for hover states'],
  },
  'info-active-foreground': {
    light: { family: 'neutral', position: '50' },
    dark: { family: 'neutral', position: '950' },
    meaning: 'Text on info active',
    contexts: ['info-active-text'],
    do: ['Use for text on info active'],
    never: ['Use without info-active background'],
  },
  'info-focus': {
    light: { family: 'silver-true-sky', position: '600' },
    dark: { family: 'silver-true-sky', position: '500' },
    meaning: 'Info focus state',
    contexts: ['info-focus'],
    do: ['Use for info focus states'],
    never: ['Use for non-focused elements'],
  },
  'info-border': {
    light: { family: 'silver-true-sky', position: '600' },
    dark: { family: 'silver-true-sky', position: '500' },
    meaning: 'Info border color',
    contexts: ['info-borders'],
    do: ['Use for info element borders'],
    never: ['Use for neutral borders'],
  },
  'info-ring': {
    light: { family: 'silver-true-sky', position: '600' },
    dark: { family: 'silver-true-sky', position: '400' },
    meaning: 'Info focus ring color',
    contexts: ['info-focus-ring'],
    do: ['Use for info element focus rings'],
    never: ['Use for decorative rings'],
  },
  'info-subtle': {
    light: { family: 'silver-true-sky', position: '50' },
    dark: { family: 'silver-true-sky', position: '950' },
    meaning: 'Subtle info background for info alerts',
    contexts: ['info-alerts'],
    do: ['Use for subtle info backgrounds'],
    never: ['Use for info buttons'],
  },
  'info-subtle-foreground': {
    light: { family: 'silver-true-sky', position: '700' },
    dark: { family: 'silver-true-sky', position: '300' },
    meaning: 'Text on subtle info backgrounds',
    contexts: ['info-alert-text'],
    do: ['Use for text on subtle info'],
    never: ['Use without info-subtle background'],
  },

  // ============================================================================
  // ALERT - Critical alerts (semantic alias for destructive in alert context)
  // ============================================================================
  alert: {
    light: { family: 'silver-bold-fire-truck', position: '600' },
    dark: { family: 'silver-bold-fire-truck', position: '500' },
    meaning: 'Critical alert states',
    contexts: ['critical-alerts', 'error-banners'],
    do: ['Use for critical system alerts'],
    never: ['Use for non-critical information'],
    trustLevel: 'critical',
    consequence: 'significant',
  },
  'alert-foreground': {
    light: { family: 'neutral', position: '50' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Text on alert backgrounds',
    contexts: ['alert-text'],
    do: ['Use for text on alert backgrounds'],
    never: ['Use without alert background'],
  },
  'alert-hover': {
    light: { family: 'silver-bold-fire-truck', position: '700' },
    dark: { family: 'silver-bold-fire-truck', position: '400' },
    meaning: 'Alert hover state',
    contexts: ['alert-hover'],
    do: ['Use for alert hover states'],
    never: ['Use as default alert'],
  },
  'alert-hover-foreground': {
    light: { family: 'neutral', position: '50' },
    dark: { family: 'neutral', position: '950' },
    meaning: 'Text on alert hover',
    contexts: ['alert-hover-text'],
    do: ['Use for text on alert hover'],
    never: ['Use without alert-hover background'],
  },
  'alert-active': {
    light: { family: 'silver-bold-fire-truck', position: '800' },
    dark: { family: 'silver-bold-fire-truck', position: '300' },
    meaning: 'Alert active state',
    contexts: ['alert-active'],
    do: ['Use for alert active states'],
    never: ['Use for hover states'],
  },
  'alert-active-foreground': {
    light: { family: 'neutral', position: '50' },
    dark: { family: 'neutral', position: '950' },
    meaning: 'Text on alert active',
    contexts: ['alert-active-text'],
    do: ['Use for text on alert active'],
    never: ['Use without alert-active background'],
  },
  'alert-border': {
    light: { family: 'silver-bold-fire-truck', position: '600' },
    dark: { family: 'silver-bold-fire-truck', position: '500' },
    meaning: 'Alert border color',
    contexts: ['alert-borders'],
    do: ['Use for alert element borders'],
    never: ['Use for neutral borders'],
  },
  'alert-ring': {
    light: { family: 'silver-bold-fire-truck', position: '600' },
    dark: { family: 'silver-bold-fire-truck', position: '400' },
    meaning: 'Alert focus ring color',
    contexts: ['alert-focus-ring'],
    do: ['Use for alert element focus rings'],
    never: ['Use for decorative rings'],
  },
  'alert-subtle': {
    light: { family: 'silver-bold-fire-truck', position: '50' },
    dark: { family: 'silver-bold-fire-truck', position: '950' },
    meaning: 'Subtle alert background',
    contexts: ['subtle-alerts'],
    do: ['Use for subtle alert backgrounds'],
    never: ['Use for primary alerts'],
  },
  'alert-subtle-foreground': {
    light: { family: 'silver-bold-fire-truck', position: '700' },
    dark: { family: 'silver-bold-fire-truck', position: '300' },
    meaning: 'Text on subtle alert backgrounds',
    contexts: ['subtle-alert-text'],
    do: ['Use for text on subtle alert'],
    never: ['Use without alert-subtle background'],
  },

  // ============================================================================
  // HIGHLIGHT - Text selection and emphasis (violet)
  // ============================================================================
  highlight: {
    light: { family: 'silver-true-violet', position: '200' },
    dark: { family: 'silver-true-violet', position: '800' },
    meaning: 'Highlight for search results, selected text, emphasis',
    contexts: ['search-highlights', 'text-selection', 'emphasis'],
    do: ['Use for temporary highlights', 'Use for search result matches'],
    never: ['Use for permanent styling', 'Use for interactive elements'],
  },
  'highlight-foreground': {
    light: { family: 'silver-true-violet', position: '900' },
    dark: { family: 'silver-true-violet', position: '50' },
    meaning: 'Text on highlight backgrounds',
    contexts: ['highlighted-text'],
    do: ['Use for text that is highlighted'],
    never: ['Use without highlight background'],
  },
  'highlight-hover': {
    light: { family: 'silver-true-violet', position: '300' },
    dark: { family: 'silver-true-violet', position: '700' },
    meaning: 'Highlight hover state',
    contexts: ['highlight-hover'],
    do: ['Use for highlight hover states'],
    never: ['Use as default highlight'],
  },
  'highlight-hover-foreground': {
    light: { family: 'silver-true-violet', position: '900' },
    dark: { family: 'silver-true-violet', position: '50' },
    meaning: 'Text on highlight hover',
    contexts: ['highlight-hover-text'],
    do: ['Use for text on highlight hover'],
    never: ['Use without highlight-hover background'],
  },
  'highlight-active': {
    light: { family: 'silver-true-violet', position: '400' },
    dark: { family: 'silver-true-violet', position: '600' },
    meaning: 'Highlight active state',
    contexts: ['highlight-active'],
    do: ['Use for highlight active states'],
    never: ['Use for hover states'],
  },
  'highlight-active-foreground': {
    light: { family: 'silver-true-violet', position: '950' },
    dark: { family: 'silver-true-violet', position: '50' },
    meaning: 'Text on highlight active',
    contexts: ['highlight-active-text'],
    do: ['Use for text on highlight active'],
    never: ['Use without highlight-active background'],
  },

  // ============================================================================
  // BORDER TOKENS (shadcn compatible + extended)
  // ============================================================================
  border: {
    light: { family: 'neutral', position: '200' },
    dark: { family: 'neutral', position: '800' },
    meaning: 'Default border color',
    contexts: ['dividers', 'separators', 'input-borders'],
    do: ['Use for subtle borders', 'Use for dividers'],
    never: ['Use for emphasized borders'],
  },
  'border-hover': {
    light: { family: 'neutral', position: '300' },
    dark: { family: 'neutral', position: '700' },
    meaning: 'Border hover state',
    contexts: ['border-hover'],
    do: ['Use for border hover states'],
    never: ['Use as default border'],
  },
  'border-focus': {
    light: { family: 'neutral', position: '400' },
    dark: { family: 'neutral', position: '600' },
    meaning: 'Border focus state',
    contexts: ['border-focus'],
    do: ['Use for focused element borders'],
    never: ['Use for non-focused elements'],
  },
  'border-active': {
    light: { family: 'neutral', position: '500' },
    dark: { family: 'neutral', position: '500' },
    meaning: 'Border active state',
    contexts: ['border-active'],
    do: ['Use for active element borders'],
    never: ['Use for hover states'],
  },

  // ============================================================================
  // INPUT TOKENS (shadcn compatible + extended for form states)
  // ============================================================================
  input: {
    light: { family: 'neutral', position: '200' },
    dark: { family: 'neutral', position: '800' },
    meaning: 'Input field border color',
    contexts: ['form-inputs', 'text-fields', 'selects'],
    do: ['Use for form field borders'],
    never: ['Use for buttons'],
  },
  'input-foreground': {
    light: { family: 'neutral', position: '950' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Input text color',
    contexts: ['input-text'],
    do: ['Use for input text'],
    never: ['Use for placeholders'],
  },
  'input-hover': {
    light: { family: 'neutral', position: '300' },
    dark: { family: 'neutral', position: '700' },
    meaning: 'Input hover state',
    contexts: ['input-hover'],
    do: ['Use for input hover states'],
    never: ['Use as default input'],
  },
  'input-focus': {
    light: { family: 'neutral', position: '400' },
    dark: { family: 'neutral', position: '600' },
    meaning: 'Input focus state',
    contexts: ['input-focus'],
    do: ['Use for input focus states'],
    never: ['Use for non-focused inputs'],
  },
  'input-disabled': {
    light: { family: 'neutral', position: '100' },
    dark: { family: 'neutral', position: '900' },
    meaning: 'Disabled input background',
    contexts: ['disabled-inputs'],
    do: ['Use for disabled input backgrounds'],
    never: ['Use for enabled inputs'],
  },
  'input-disabled-foreground': {
    light: { family: 'neutral', position: '400' },
    dark: { family: 'neutral', position: '600' },
    meaning: 'Disabled input text color',
    contexts: ['disabled-input-text'],
    do: ['Use for disabled input text'],
    never: ['Use for enabled input text'],
  },
  'input-placeholder': {
    light: { family: 'neutral', position: '500' },
    dark: { family: 'neutral', position: '400' },
    meaning: 'Placeholder text color',
    contexts: ['placeholders'],
    do: ['Use for placeholder text'],
    never: ['Use for entered text'],
  },
  'input-invalid': {
    light: { family: 'silver-bold-fire-truck', position: '500' },
    dark: { family: 'silver-bold-fire-truck', position: '500' },
    meaning: 'Invalid input border',
    contexts: ['invalid-inputs', 'validation-errors'],
    do: ['Use for invalid input borders'],
    never: ['Use for valid inputs'],
  },
  'input-invalid-foreground': {
    light: { family: 'silver-bold-fire-truck', position: '700' },
    dark: { family: 'silver-bold-fire-truck', position: '300' },
    meaning: 'Invalid input error text',
    contexts: ['validation-error-text'],
    do: ['Use for validation error messages'],
    never: ['Use for success messages'],
  },
  'input-valid': {
    light: { family: 'silver-true-citrine', position: '500' },
    dark: { family: 'silver-true-citrine', position: '500' },
    meaning: 'Valid input border',
    contexts: ['valid-inputs', 'validation-success'],
    do: ['Use for valid input borders'],
    never: ['Use for invalid inputs'],
  },
  'input-valid-foreground': {
    light: { family: 'silver-true-citrine', position: '700' },
    dark: { family: 'silver-true-citrine', position: '300' },
    meaning: 'Valid input success text',
    contexts: ['validation-success-text'],
    do: ['Use for validation success messages'],
    never: ['Use for error messages'],
  },

  // ============================================================================
  // RING/FOCUS TOKENS (shadcn compatible + extended for a11y)
  // ============================================================================
  ring: {
    light: { family: 'neutral', position: '950' },
    dark: { family: 'neutral', position: '300' },
    meaning: 'Focus ring color',
    contexts: ['focus-states', 'keyboard-navigation'],
    do: ['Use for focus indicators', 'Ensure high contrast'],
    never: ['Use for decorative elements'],
  },
  'ring-offset': {
    light: { family: 'neutral', position: '50' },
    dark: { family: 'neutral', position: '950' },
    meaning: 'Focus ring offset color',
    contexts: ['focus-ring-offset'],
    do: ['Use for focus ring offset'],
    never: ['Use as primary color'],
  },
  'ring-primary': {
    light: { family: 'neutral', position: '900' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Primary focus ring',
    contexts: ['primary-focus-ring'],
    do: ['Use for primary element focus rings'],
    never: ['Use for decorative rings'],
  },
  'ring-destructive': {
    light: { family: 'silver-bold-fire-truck', position: '600' },
    dark: { family: 'silver-bold-fire-truck', position: '400' },
    meaning: 'Destructive focus ring',
    contexts: ['destructive-focus-ring'],
    do: ['Use for destructive element focus rings'],
    never: ['Use for non-destructive elements'],
  },
  'ring-success': {
    light: { family: 'silver-true-citrine', position: '600' },
    dark: { family: 'silver-true-citrine', position: '400' },
    meaning: 'Success focus ring',
    contexts: ['success-focus-ring'],
    do: ['Use for success element focus rings'],
    never: ['Use for non-success elements'],
  },
  'ring-warning': {
    light: { family: 'silver-true-honey', position: '600' },
    dark: { family: 'silver-true-honey', position: '400' },
    meaning: 'Warning focus ring',
    contexts: ['warning-focus-ring'],
    do: ['Use for warning element focus rings'],
    never: ['Use for non-warning elements'],
  },
  'ring-info': {
    light: { family: 'silver-true-sky', position: '600' },
    dark: { family: 'silver-true-sky', position: '400' },
    meaning: 'Info focus ring',
    contexts: ['info-focus-ring'],
    do: ['Use for info element focus rings'],
    never: ['Use for non-info elements'],
  },

  // ============================================================================
  // LINK TOKENS
  // ============================================================================
  link: {
    light: { family: 'silver-true-sky', position: '700' },
    dark: { family: 'silver-true-sky', position: '400' },
    meaning: 'Link color',
    contexts: ['links', 'anchors'],
    do: ['Use for link text'],
    never: ['Use for non-link text'],
  },
  'link-hover': {
    light: { family: 'silver-true-sky', position: '800' },
    dark: { family: 'silver-true-sky', position: '300' },
    meaning: 'Link hover color',
    contexts: ['link-hover'],
    do: ['Use for link hover states'],
    never: ['Use as default link color'],
  },
  'link-active': {
    light: { family: 'silver-true-sky', position: '900' },
    dark: { family: 'silver-true-sky', position: '200' },
    meaning: 'Link active/pressed color',
    contexts: ['link-active'],
    do: ['Use for link active states'],
    never: ['Use for hover states'],
  },
  'link-visited': {
    light: { family: 'silver-true-violet', position: '700' },
    dark: { family: 'silver-true-violet', position: '400' },
    meaning: 'Visited link color',
    contexts: ['visited-links'],
    do: ['Use for visited links'],
    never: ['Use for unvisited links'],
  },
  'link-focus': {
    light: { family: 'silver-true-sky', position: '700' },
    dark: { family: 'silver-true-sky', position: '400' },
    meaning: 'Link focus color',
    contexts: ['link-focus'],
    do: ['Use for link focus states'],
    never: ['Use for non-focused links'],
  },

  // ============================================================================
  // SELECTION TOKENS
  // ============================================================================
  selection: {
    light: { family: 'silver-true-sky', position: '200' },
    dark: { family: 'silver-true-sky', position: '800' },
    meaning: 'Text selection background',
    contexts: ['text-selection'],
    do: ['Use for ::selection background'],
    never: ['Use for other highlights'],
  },
  'selection-foreground': {
    light: { family: 'neutral', position: '950' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Text selection foreground',
    contexts: ['text-selection-foreground'],
    do: ['Use for ::selection text color'],
    never: ['Use without selection background'],
  },

  // ============================================================================
  // SIDEBAR TOKENS (shadcn compatible + extended)
  // ============================================================================
  sidebar: {
    light: { family: 'neutral', position: '50' },
    dark: { family: 'neutral', position: '950' },
    meaning: 'Sidebar background',
    contexts: ['navigation-sidebar', 'side-panels'],
    do: ['Use for sidebar backgrounds'],
    never: ['Use for main content areas'],
  },
  'sidebar-foreground': {
    light: { family: 'neutral', position: '950' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Sidebar text color',
    contexts: ['sidebar-text', 'nav-items'],
    do: ['Use for sidebar content'],
    never: ['Use outside sidebar context'],
  },
  'sidebar-muted': {
    light: { family: 'neutral', position: '500' },
    dark: { family: 'neutral', position: '400' },
    meaning: 'Sidebar muted text',
    contexts: ['sidebar-secondary-text'],
    do: ['Use for secondary sidebar text'],
    never: ['Use for primary sidebar text'],
  },
  'sidebar-primary': {
    light: { family: 'neutral', position: '900' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Sidebar primary accent',
    contexts: ['active-nav-item', 'selected-sidebar-item'],
    do: ['Use for active sidebar items'],
    never: ['Use for inactive items'],
  },
  'sidebar-primary-foreground': {
    light: { family: 'neutral', position: '50' },
    dark: { family: 'neutral', position: '900' },
    meaning: 'Text on sidebar primary',
    contexts: ['active-nav-text'],
    do: ['Use for active nav item text'],
    never: ['Use without sidebar-primary background'],
  },
  'sidebar-primary-hover': {
    light: { family: 'neutral', position: '800' },
    dark: { family: 'neutral', position: '200' },
    meaning: 'Sidebar primary hover',
    contexts: ['sidebar-primary-hover'],
    do: ['Use for sidebar primary hover'],
    never: ['Use as default sidebar primary'],
  },
  'sidebar-primary-active': {
    light: { family: 'neutral', position: '700' },
    dark: { family: 'neutral', position: '300' },
    meaning: 'Sidebar primary active',
    contexts: ['sidebar-primary-active'],
    do: ['Use for sidebar primary active state'],
    never: ['Use for hover states'],
  },
  'sidebar-accent': {
    light: { family: 'neutral', position: '100' },
    dark: { family: 'neutral', position: '800' },
    meaning: 'Sidebar hover/accent state',
    contexts: ['sidebar-hover', 'sidebar-selected'],
    do: ['Use for sidebar hover states'],
    never: ['Use for active state'],
  },
  'sidebar-accent-foreground': {
    light: { family: 'neutral', position: '900' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Text on sidebar accent',
    contexts: ['sidebar-hover-text'],
    do: ['Use for hovered sidebar text'],
    never: ['Use without sidebar-accent background'],
  },
  'sidebar-accent-hover': {
    light: { family: 'neutral', position: '200' },
    dark: { family: 'neutral', position: '700' },
    meaning: 'Sidebar accent hover',
    contexts: ['sidebar-accent-hover'],
    do: ['Use for sidebar accent hover'],
    never: ['Use as default sidebar accent'],
  },
  'sidebar-accent-active': {
    light: { family: 'neutral', position: '300' },
    dark: { family: 'neutral', position: '600' },
    meaning: 'Sidebar accent active',
    contexts: ['sidebar-accent-active'],
    do: ['Use for sidebar accent active state'],
    never: ['Use for hover states'],
  },
  'sidebar-item': {
    light: { family: 'neutral', position: '50' },
    dark: { family: 'neutral', position: '950' },
    meaning: 'Sidebar item background',
    contexts: ['sidebar-items'],
    do: ['Use for sidebar item backgrounds'],
    never: ['Use for active items'],
  },
  'sidebar-item-foreground': {
    light: { family: 'neutral', position: '700' },
    dark: { family: 'neutral', position: '300' },
    meaning: 'Sidebar item text',
    contexts: ['sidebar-item-text'],
    do: ['Use for sidebar item text'],
    never: ['Use for active item text'],
  },
  'sidebar-item-hover': {
    light: { family: 'neutral', position: '100' },
    dark: { family: 'neutral', position: '900' },
    meaning: 'Sidebar item hover',
    contexts: ['sidebar-item-hover'],
    do: ['Use for sidebar item hover'],
    never: ['Use as default item background'],
  },
  'sidebar-item-hover-foreground': {
    light: { family: 'neutral', position: '900' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Sidebar item hover text',
    contexts: ['sidebar-item-hover-text'],
    do: ['Use for sidebar item hover text'],
    never: ['Use without hover background'],
  },
  'sidebar-item-active': {
    light: { family: 'neutral', position: '200' },
    dark: { family: 'neutral', position: '800' },
    meaning: 'Sidebar item active',
    contexts: ['sidebar-item-active'],
    do: ['Use for sidebar item active state'],
    never: ['Use for hover states'],
  },
  'sidebar-item-active-foreground': {
    light: { family: 'neutral', position: '950' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Sidebar item active text',
    contexts: ['sidebar-item-active-text'],
    do: ['Use for sidebar item active text'],
    never: ['Use without active background'],
  },
  'sidebar-item-selected': {
    light: { family: 'neutral', position: '100' },
    dark: { family: 'neutral', position: '800' },
    meaning: 'Sidebar selected item',
    contexts: ['sidebar-selected-item'],
    do: ['Use for selected sidebar items'],
    never: ['Use for unselected items'],
  },
  'sidebar-item-selected-foreground': {
    light: { family: 'neutral', position: '950' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Sidebar selected item text',
    contexts: ['sidebar-selected-item-text'],
    do: ['Use for selected item text'],
    never: ['Use without selected background'],
  },
  'sidebar-border': {
    light: { family: 'neutral', position: '200' },
    dark: { family: 'neutral', position: '800' },
    meaning: 'Sidebar border/divider color',
    contexts: ['sidebar-dividers', 'nav-section-borders'],
    do: ['Use for sidebar dividers'],
    never: ['Use for main content borders'],
  },
  'sidebar-ring': {
    light: { family: 'neutral', position: '950' },
    dark: { family: 'neutral', position: '300' },
    meaning: 'Sidebar focus ring',
    contexts: ['sidebar-focus-states'],
    do: ['Use for sidebar focus indicators'],
    never: ['Use outside sidebar'],
  },

  // ============================================================================
  // NAVIGATION TOKENS
  // ============================================================================
  nav: {
    light: { family: 'neutral', position: '50' },
    dark: { family: 'neutral', position: '950' },
    meaning: 'Navigation background',
    contexts: ['navbars', 'breadcrumbs', 'tabs'],
    do: ['Use for navigation backgrounds'],
    never: ['Use for content areas'],
  },
  'nav-foreground': {
    light: { family: 'neutral', position: '700' },
    dark: { family: 'neutral', position: '300' },
    meaning: 'Navigation text',
    contexts: ['nav-links', 'nav-items'],
    do: ['Use for navigation text'],
    never: ['Use for active nav text'],
  },
  'nav-hover': {
    light: { family: 'neutral', position: '100' },
    dark: { family: 'neutral', position: '900' },
    meaning: 'Navigation hover',
    contexts: ['nav-hover'],
    do: ['Use for nav hover states'],
    never: ['Use as default nav background'],
  },
  'nav-hover-foreground': {
    light: { family: 'neutral', position: '900' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Navigation hover text',
    contexts: ['nav-hover-text'],
    do: ['Use for nav hover text'],
    never: ['Use without hover background'],
  },
  'nav-active': {
    light: { family: 'neutral', position: '200' },
    dark: { family: 'neutral', position: '800' },
    meaning: 'Navigation active',
    contexts: ['nav-active'],
    do: ['Use for nav active states'],
    never: ['Use for hover states'],
  },
  'nav-active-foreground': {
    light: { family: 'neutral', position: '950' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Navigation active text',
    contexts: ['nav-active-text'],
    do: ['Use for nav active text'],
    never: ['Use without active background'],
  },
  'nav-selected': {
    light: { family: 'neutral', position: '900' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Navigation selected',
    contexts: ['nav-selected'],
    do: ['Use for selected nav items'],
    never: ['Use for unselected items'],
  },
  'nav-selected-foreground': {
    light: { family: 'neutral', position: '50' },
    dark: { family: 'neutral', position: '900' },
    meaning: 'Navigation selected text',
    contexts: ['nav-selected-text'],
    do: ['Use for selected nav text'],
    never: ['Use without selected background'],
  },
  'nav-disabled': {
    light: { family: 'neutral', position: '200' },
    dark: { family: 'neutral', position: '800' },
    meaning: 'Navigation disabled',
    contexts: ['nav-disabled'],
    do: ['Use for disabled nav items'],
    never: ['Use for enabled items'],
  },
  'nav-disabled-foreground': {
    light: { family: 'neutral', position: '400' },
    dark: { family: 'neutral', position: '600' },
    meaning: 'Navigation disabled text',
    contexts: ['nav-disabled-text'],
    do: ['Use for disabled nav text'],
    never: ['Use for enabled nav text'],
  },

  // ============================================================================
  // TABLE TOKENS
  // ============================================================================
  table: {
    light: { family: 'neutral', position: '50' },
    dark: { family: 'neutral', position: '950' },
    meaning: 'Table background',
    contexts: ['data-tables'],
    do: ['Use for table backgrounds'],
    never: ['Use for content areas'],
  },
  'table-foreground': {
    light: { family: 'neutral', position: '950' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Table text',
    contexts: ['table-text'],
    do: ['Use for table text'],
    never: ['Use without table background'],
  },
  'table-header': {
    light: { family: 'neutral', position: '100' },
    dark: { family: 'neutral', position: '900' },
    meaning: 'Table header background',
    contexts: ['table-headers'],
    do: ['Use for table header backgrounds'],
    never: ['Use for table body'],
  },
  'table-header-foreground': {
    light: { family: 'neutral', position: '950' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Table header text',
    contexts: ['table-header-text'],
    do: ['Use for table header text'],
    never: ['Use for body text'],
  },
  'table-row-hover': {
    light: { family: 'neutral', position: '50' },
    dark: { family: 'neutral', position: '900' },
    meaning: 'Table row hover',
    contexts: ['table-row-hover'],
    do: ['Use for table row hover'],
    never: ['Use as default row background'],
  },
  'table-row-selected': {
    light: { family: 'neutral', position: '100' },
    dark: { family: 'neutral', position: '800' },
    meaning: 'Table row selected',
    contexts: ['table-row-selected'],
    do: ['Use for selected table rows'],
    never: ['Use for unselected rows'],
  },
  'table-row-selected-foreground': {
    light: { family: 'neutral', position: '950' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Table row selected text',
    contexts: ['table-row-selected-text'],
    do: ['Use for selected row text'],
    never: ['Use without selected background'],
  },
  'table-border': {
    light: { family: 'neutral', position: '200' },
    dark: { family: 'neutral', position: '800' },
    meaning: 'Table border',
    contexts: ['table-borders'],
    do: ['Use for table borders'],
    never: ['Use for content borders'],
  },

  // ============================================================================
  // TOOLTIP TOKENS
  // ============================================================================
  tooltip: {
    light: { family: 'neutral', position: '900' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Tooltip background',
    contexts: ['tooltips'],
    do: ['Use for tooltip backgrounds'],
    never: ['Use for content areas'],
  },
  'tooltip-foreground': {
    light: { family: 'neutral', position: '50' },
    dark: { family: 'neutral', position: '900' },
    meaning: 'Tooltip text',
    contexts: ['tooltip-text'],
    do: ['Use for tooltip text'],
    never: ['Use without tooltip background'],
  },

  // ============================================================================
  // OVERLAY TOKENS
  // ============================================================================
  overlay: {
    light: { family: 'neutral', position: '950' },
    dark: { family: 'neutral', position: '950' },
    meaning: 'Overlay background',
    contexts: ['modals', 'dialogs', 'sheets'],
    do: ['Use for modal backdrops'],
    never: ['Use for content backgrounds'],
  },
  'overlay-foreground': {
    light: { family: 'neutral', position: '50' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Overlay text',
    contexts: ['overlay-text'],
    do: ['Use for text on overlays'],
    never: ['Use without overlay background'],
  },

  // ============================================================================
  // SKELETON/LOADING TOKENS
  // ============================================================================
  skeleton: {
    light: { family: 'neutral', position: '200' },
    dark: { family: 'neutral', position: '800' },
    meaning: 'Skeleton loader background',
    contexts: ['loading-states', 'skeletons'],
    do: ['Use for skeleton backgrounds'],
    never: ['Use for content backgrounds'],
  },
  'skeleton-highlight': {
    light: { family: 'neutral', position: '300' },
    dark: { family: 'neutral', position: '700' },
    meaning: 'Skeleton loader highlight',
    contexts: ['skeleton-animation'],
    do: ['Use for skeleton animation highlight'],
    never: ['Use as static background'],
  },

  // ============================================================================
  // CHART TOKENS (shadcn compatible - 5 chart colors)
  // ============================================================================
  'chart-1': {
    light: { family: 'silver-true-glacier', position: '500' },
    dark: { family: 'silver-true-glacier', position: '400' },
    meaning: 'Primary chart color',
    contexts: ['charts', 'data-viz', 'primary-series'],
    do: ['Use for primary data series'],
    never: ['Use more than 5 chart colors'],
  },
  'chart-2': {
    light: { family: 'silver-true-sky', position: '500' },
    dark: { family: 'silver-true-sky', position: '400' },
    meaning: 'Secondary chart color',
    contexts: ['charts', 'data-viz', 'secondary-series'],
    do: ['Use for secondary data series'],
    never: ['Use without chart-1'],
  },
  'chart-3': {
    light: { family: 'silver-true-citrine', position: '500' },
    dark: { family: 'silver-true-citrine', position: '400' },
    meaning: 'Tertiary chart color',
    contexts: ['charts', 'data-viz', 'tertiary-series'],
    do: ['Use for tertiary data series'],
    never: ['Use as primary color'],
  },
  'chart-4': {
    light: { family: 'silver-true-honey', position: '500' },
    dark: { family: 'silver-true-honey', position: '400' },
    meaning: 'Quaternary chart color',
    contexts: ['charts', 'data-viz', 'quaternary-series'],
    do: ['Use for quaternary data series'],
    never: ['Use without considering accessibility'],
  },
  'chart-5': {
    light: { family: 'silver-true-violet', position: '500' },
    dark: { family: 'silver-true-violet', position: '400' },
    meaning: 'Quinary chart color',
    contexts: ['charts', 'data-viz', 'quinary-series'],
    do: ['Use for fifth data series'],
    never: ['Add more series without redesigning palette'],
  },

  // ============================================================================
  // SCROLLBAR TOKENS
  // ============================================================================
  scrollbar: {
    light: { family: 'neutral', position: '300' },
    dark: { family: 'neutral', position: '700' },
    meaning: 'Scrollbar thumb color',
    contexts: ['scrollbars'],
    do: ['Use for scrollbar thumbs'],
    never: ['Use for content elements'],
  },
  'scrollbar-hover': {
    light: { family: 'neutral', position: '400' },
    dark: { family: 'neutral', position: '600' },
    meaning: 'Scrollbar thumb hover',
    contexts: ['scrollbar-hover'],
    do: ['Use for scrollbar thumb hover'],
    never: ['Use as default scrollbar color'],
  },
  'scrollbar-track': {
    light: { family: 'neutral', position: '100' },
    dark: { family: 'neutral', position: '900' },
    meaning: 'Scrollbar track background',
    contexts: ['scrollbar-tracks'],
    do: ['Use for scrollbar track backgrounds'],
    never: ['Use for content backgrounds'],
  },

  // ============================================================================
  // CODE/SYNTAX TOKENS
  // ============================================================================
  code: {
    light: { family: 'neutral', position: '100' },
    dark: { family: 'neutral', position: '900' },
    meaning: 'Code block background',
    contexts: ['code-blocks', 'inline-code'],
    do: ['Use for code backgrounds'],
    never: ['Use for regular text'],
  },
  'code-foreground': {
    light: { family: 'neutral', position: '900' },
    dark: { family: 'neutral', position: '100' },
    meaning: 'Code text color',
    contexts: ['code-text'],
    do: ['Use for code text'],
    never: ['Use without code background'],
  },
  'code-border': {
    light: { family: 'neutral', position: '200' },
    dark: { family: 'neutral', position: '800' },
    meaning: 'Code block border',
    contexts: ['code-borders'],
    do: ['Use for code block borders'],
    never: ['Use for content borders'],
  },

  // ============================================================================
  // BADGE TOKENS
  // ============================================================================
  badge: {
    light: { family: 'neutral', position: '100' },
    dark: { family: 'neutral', position: '800' },
    meaning: 'Badge background',
    contexts: ['badges', 'labels'],
    do: ['Use for badge backgrounds'],
    never: ['Use for buttons'],
  },
  'badge-foreground': {
    light: { family: 'neutral', position: '900' },
    dark: { family: 'neutral', position: '100' },
    meaning: 'Badge text color',
    contexts: ['badge-text'],
    do: ['Use for badge text'],
    never: ['Use without badge background'],
  },
  'badge-border': {
    light: { family: 'neutral', position: '200' },
    dark: { family: 'neutral', position: '700' },
    meaning: 'Badge border',
    contexts: ['badge-borders'],
    do: ['Use for badge borders'],
    never: ['Use for content borders'],
  },

  // ============================================================================
  // AVATAR TOKENS
  // ============================================================================
  avatar: {
    light: { family: 'neutral', position: '200' },
    dark: { family: 'neutral', position: '800' },
    meaning: 'Avatar fallback background',
    contexts: ['avatars', 'fallback-images'],
    do: ['Use for avatar fallback backgrounds'],
    never: ['Use for content backgrounds'],
  },
  'avatar-foreground': {
    light: { family: 'neutral', position: '600' },
    dark: { family: 'neutral', position: '400' },
    meaning: 'Avatar fallback text/icon color',
    contexts: ['avatar-initials', 'avatar-icons'],
    do: ['Use for avatar initials or icons'],
    never: ['Use without avatar background'],
  },
};
