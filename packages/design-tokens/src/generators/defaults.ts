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
// Type-only both ways -- motion-derivation imports DurationDef from here. Both
// sides are erased at compile, so this pair never forms a runtime cycle.
import type { MotionBand, MotionTravel } from './motion-derivation.js';

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
    name: 'zinc',
    scale: DEFAULT_NEUTRAL_SCALE,
    description: 'Achromatic zinc palette. Default backing family for the neutral semantic role.',
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
 * - zinc: achromatic (h:0, c:0) - defined above, backs the `neutral` semantic
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
    // The shadcn menu-content band (z-50): menu content must beat sticky
    // chrome and survive opening inside a dialog; DOM order breaks ties.
    value: 50,
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
    // Backdrops dim BEHIND the modal they serve: below modal (40), above
    // fixed chrome (30) so the dim still covers sticky/fixed elements.
    value: 35,
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
// MOTION DEFAULTS
// =============================================================================

export interface DurationDef {
  /**
   * Perceptual band bounds `[min, max]` in ms. THE TIER IS A RANGE, NOT A VALUE:
   * perception sets the bounds, the designer picks inside them (docs/MOTION.md).
   * Studio clamps its picker to this, so a duration outside its band is not
   * reachable by accident. `instant` is `[0, 0]` -- fixed, the null case.
   */
  range: readonly [number, number];
  /**
   * The value at neutral intent, and what ships until a designer moves it. Must
   * lie inside `range` (asserted by the generator's regression test).
   */
  default: number;
  /**
   * Perceptual band this tier sits in. Empty string for `instant` (below all
   * perception). Recorded verbatim in the token's semanticMeaning.
   */
  band: string;
  meaning: string;
  contexts: string[];
  motionIntent: 'enter' | 'exit' | 'emphasis' | 'transition';
}

/**
 * Duration tiers, perceptually bounded per docs/MOTION.md.
 *
 * Each tier is a RANGE the designer picks within, NOT a constant and NOT a ratio
 * progression. `moderate` is not `fast x ratio` -- it is "somewhere in the
 * communicative window", and the window is a fact about perception rather than a
 * step on a curve. Harmony is spacing's discipline; perception is motion's.
 *
 * The bands: under ~100ms reads as instantaneous (communicates nothing),
 * ~200-300ms is the communicative window, over ~500ms reads as sluggish. Tiers
 * below `moderate` are acknowledgment, not communication -- which is why the
 * ranges do not overlap downward into it.
 *
 * Defaults are the values shipped at neutral intent. Nothing moves until a
 * designer moves it.
 *
 * BANDED, NOT FLAT. The communicative tiers step 150 -> 250 -> 350 -> 500: gaps
 * of 100, 100 and 150, so two adjacent tiers are always tellable apart. The flat
 * 200/300/400 ladder this system shipped between b864de01 and #1991 was drift,
 * not a decision -- it fell out of reading each tier's band MINIMUM instead of
 * its authored default (see `motion-derivation.ts`). Every restored value sits
 * inside its band, which is the evidence the bands were never the thing that
 * moved.
 */
export const DEFAULT_DURATION_DEFINITIONS: Record<string, DurationDef> = {
  instant: {
    range: [0, 0],
    default: 0,
    band: '',
    meaning:
      'No perceptible transition. Cursor changes, text selection, badge counts. Below all perception -- there is nothing to track, so nothing is communicated.',
    contexts: ['disabled-motion', 'prefers-reduced-motion', 'cursor', 'badge-count'],
    motionIntent: 'transition',
  },
  micro: {
    range: [50, 120],
    default: 100,
    band: 'at the instantaneous threshold (Nielsen 0.1s)',
    meaning:
      'Immediate but visible. Focus rings and press feedback. At the instantaneous threshold -- acknowledgment that input landed, not communication of a change.',
    contexts: ['focus', 'press', 'micro-feedback'],
    motionIntent: 'transition',
  },
  fast: {
    range: [120, 200],
    default: 150,
    band: 'below the communicative window',
    meaning:
      'Hover states. The cursor is already there, so the response must match its speed. Below the communicative window -- acknowledgment, not communication.',
    contexts: ['hover', 'micro-feedback'],
    motionIntent: 'transition',
  },
  moderate: {
    range: [200, 300],
    default: 250,
    band: 'communicative (~200-300ms)',
    meaning:
      'Dropdowns, tab switches, small reveals. The communicative window: fast enough to feel responsive, slow enough for the eye to track a trajectory and build a spatial model.',
    contexts: ['dropdowns', 'tab-switches', 'small-reveals'],
    motionIntent: 'transition',
  },
  normal: {
    range: [300, 400],
    default: 350,
    band: 'communicative, larger movement',
    meaning:
      'The workhorse -- modal entrances, toggles, standard state transitions. The communicative window for larger movement.',
    contexts: ['modals', 'toggles', 'state-changes'],
    motionIntent: 'enter',
  },
  slow: {
    range: [400, 500],
    default: 500,
    band: 'at the sluggish boundary',
    meaning:
      'Sheets, page transitions, large spatial movement where the user needs orientation. At the sluggish boundary -- the ceiling for anything but full-screen spatial transitions.',
    contexts: ['sheets', 'page-transitions', 'large-spatial-movement'],
    motionIntent: 'enter',
  },
};

export interface EasingDef {
  curve: [number, number, number, number];
  meaning: string;
  contexts: string[];
  css: string;
}

/**
 * The six named curves from docs/MOTION.md. `meaning` carries the emotional
 * REGISTER (how the shape is read), not the mechanics -- register is the gap the
 * research named and this closes. `enter`/`exit` are a deliberately asymmetric
 * pair: greet warmly, leave quietly. The springs deliberately do NOT overshoot.
 */
export const DEFAULT_EASING_DEFINITIONS: Record<string, EasingDef> = {
  standard: {
    curve: [0.4, 0, 0.2, 1],
    meaning:
      'Precision -- a responsive start that decelerates into place, engineered rather than thrown. The general-purpose workhorse for state transitions and hover: the fast start matches a cursor already on target, where a symmetric ease would drag.',
    contexts: ['state-changes', 'hover', 'general-purpose'],
    css: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  enter: {
    curve: [0, 0, 0.2, 1],
    meaning:
      'Arrival, welcome, settling into place. The fast start communicates responsiveness; the slow finish communicates care. Anything entering the viewport. Paired with `exit` as a deliberately asymmetric couple. (Dragicevic 2011: slow-in/slow-out outperforms constant speed for tracking.)',
    contexts: ['enter-animations', 'elements-appearing'],
    css: 'cubic-bezier(0, 0, 0.2, 1)',
  },
  exit: {
    curve: [0.4, 0, 1, 1],
    meaning:
      'Withdrawal, giving space. The brief hesitation acknowledges the user; the fast departure avoids lingering. Anything leaving the viewport. Paired with `enter` as a deliberately asymmetric couple -- exits are faster than entrances by design.',
    contexts: ['exit-animations', 'elements-leaving'],
    css: 'cubic-bezier(0.4, 0, 1, 1)',
  },
  linear: {
    curve: [0, 0, 1, 1],
    meaning:
      'Mechanical, procedural, without personality -- a process, not a gesture. Progress and loading, where the system is working rather than interacting. Never for interactive spatial transitions.',
    contexts: ['progress-bars', 'loading-spinners', 'opacity-fades', 'focus-ring-fade'],
    css: 'linear',
  },
  'spring-smooth': {
    curve: [0.2, 0.9, 0.3, 1],
    meaning:
      'Alive, coming physically to rest -- a critically-damped spring with no overshoot. Page transitions, sheets, large tracked spatial movement. (Johansson 1973 / Pratt 2010: animate motion is perceived as alive and captures attention.)',
    contexts: ['page-transitions', 'sheets', 'large-spatial-movement'],
    css: 'cubic-bezier(0.2, 0.9, 0.3, 1)',
  },
  'spring-snappy': {
    curve: [0.2, 0.8, 0.2, 1],
    meaning:
      'Alive, tight, following input closely -- a tighter spring with less settle and no overshoot. Toggles, presses, interactions that track input.',
    contexts: ['toggles', 'presses', 'input-tracking'],
    css: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  },
};

/**
 * Ratio-derived values a keyframe may interpolate. The generator computes these
 * once from the progression ratio and hands them to each definition, so keyframe
 * VALUES stay derived while only the CSS shape is authored here.
 */
export interface KeyframeContext {
  /** ratio^3 -- the expanding ping. */
  pingScale: number;
  /** 1/ratio^4 -- the pulse midpoint. */
  pulseOpacity: number;
  /** 100/ratio^6 -- bounce height, as a percentage. */
  bouncePercent: number;
}

export interface KeyframeDef {
  /** Built from the ratio-derived context rather than authored as a literal. */
  css: (ctx: KeyframeContext) => string;
  meaning: string;
  contexts: string[];
}

/**
 * Keyframe definitions.
 *
 * PROVENANCE, stated plainly: this vocabulary is inherited from shadcn/Tailwind,
 * not authored as rafters motion primitives. The numeric values derive from the
 * progression ratio, but the SET -- which keyframes exist at all -- is a lift.
 * Sean's ruling (2026-07-23) is that keyframe character comes out of the intent
 * study; until that lands, these are relocated rather than blessed.
 *
 * DECIDED 2026-08-02 (#1991), previously left open:
 * - `bounce`'s two inline cubic-beziers STAY INLINE, and this is now a rule
 *   rather than a deferral. A timing function written INSIDE a keyframe is
 *   gravity geometry -- it describes the shape of the fall and the rebound, and
 *   it belongs to the keyframe that draws them. The `ease` namespace governs
 *   transitions and animation-LEVEL timing: the character of an interaction, not
 *   the physics inside a loop. The evidence is the down-phase itself,
 *   (0.8, 0, 1, 1): it has no member in the six-curve vocabulary and never
 *   should, because no interaction should accelerate like a falling object.
 *   Substituting the nearest curve (`exit`, (0.4, 0, 1, 1)) would change how
 *   bounce moves for the sake of tidiness -- an unforced value change.
 * - The looping set (`spin`, `ping`, `pulse`, `bounce`, `caret-blink`) are
 *   continuous animations rather than transitions, so no perceptual duration band
 *   applies. Their loop periods are the `period` namespace's job; the values in
 *   the animation definitions below are the same numbers, and the sweep that
 *   points the animations at `var(--rafters-period-*)` is component work, not
 *   token work.
 *
 * KEYFRAMES ARE SHAPES (#2017). A keyframe body carries GEOMETRY and nothing
 * else -- no duration, no curve, and no literal extent. The scale a surface
 * enters from is the `extent` namespace's job, so `scale-in` / `scale-out`
 * reference `var(--rafters-extent-pop)` rather than a number. This replaces the
 * `scaleStart = 1/ratio^0.25` derivation that shipped in #2012: a ratio formula
 * in value position is a second value for one knob, inside the namespace whose
 * whole premise is that motion values are entropy and not a progression. The
 * derivation is gone and `extent-pop` has its first consumer.
 *
 * EXIT REUSES `extent-pop` (operator ruling): a close is the symmetric scale
 * back to the same point. A separate exit extent would be a new matrix
 * dimension, and no study asks for one.
 *
 * THE TWO EXTENT CONSUMPTION CONTRACTS -- do not merge them:
 *   1. EMISSION SIDE (here). Keyframe bodies are generator-owned CSS, so they
 *      name the LEAF directly: `var(--rafters-extent-pop)`, declared in every
 *      emission path by `generateMotionNamespaceVars`.
 *   2. UTILITY SIDE. `@utility extent-pop` publishes the chosen extent under the
 *      fixed alias `--rafters-consumed-extent` (see `MOTION_NAMESPACE_PROPERTY`
 *      in the Tailwind exporter), which is how a CLASS-level consumer picks an
 *      extent without naming a member.
 * One contract per side. A keyframe reaching for the alias would read whatever
 * extent the consuming class last chose, which is not a property a shape has.
 *
 * DELETED 2026-07-23: `accordion-down` / `accordion-up`. They interpolated
 * `var(--radix-accordion-content-height)`, which Radix sets from JS measurement
 * and nothing in this system ever sets -- so they animated to an undefined height
 * in every consumer, silently, since #447. `motion-expand` / `motion-collapse`
 * replaced them with a `grid-template-rows` transition, which animates on an
 * element that stays present and needs no measured value.
 */
export const DEFAULT_KEYFRAME_DEFINITIONS: Record<string, KeyframeDef> = {
  'fade-in': {
    css: () => 'from { opacity: 0; } to { opacity: 1; }',
    meaning: 'Fade from transparent to opaque',
    contexts: ['enter', 'appear', 'show'],
  },
  'fade-out': {
    css: () => 'from { opacity: 1; } to { opacity: 0; }',
    meaning: 'Fade from opaque to transparent',
    contexts: ['exit', 'disappear', 'hide'],
  },
  'slide-in-from-top': {
    css: () => 'from { transform: translateY(-100%); } to { transform: translateY(0); }',
    meaning: 'Slide in from above',
    contexts: ['dropdown', 'notification', 'toast'],
  },
  'slide-in-from-bottom': {
    css: () => 'from { transform: translateY(100%); } to { transform: translateY(0); }',
    meaning: 'Slide in from below',
    contexts: ['sheet', 'drawer', 'mobile-menu'],
  },
  'slide-in-from-left': {
    css: () => 'from { transform: translateX(-100%); } to { transform: translateX(0); }',
    meaning: 'Slide in from left',
    contexts: ['sidebar', 'panel', 'drawer'],
  },
  'slide-in-from-right': {
    css: () => 'from { transform: translateX(100%); } to { transform: translateX(0); }',
    meaning: 'Slide in from right',
    contexts: ['sidebar', 'panel', 'drawer'],
  },
  'slide-out-to-top': {
    css: () => 'from { transform: translateY(0); } to { transform: translateY(-100%); }',
    meaning: 'Slide out upward',
    contexts: ['dropdown-exit', 'notification-dismiss'],
  },
  'slide-out-to-bottom': {
    css: () => 'from { transform: translateY(0); } to { transform: translateY(100%); }',
    meaning: 'Slide out downward',
    contexts: ['sheet-exit', 'drawer-close'],
  },
  'slide-out-to-left': {
    css: () => 'from { transform: translateX(0); } to { transform: translateX(-100%); }',
    meaning: 'Slide out to left',
    contexts: ['sidebar-close', 'panel-exit'],
  },
  'slide-out-to-right': {
    css: () => 'from { transform: translateX(0); } to { transform: translateX(100%); }',
    meaning: 'Slide out to right',
    contexts: ['sidebar-close', 'panel-exit'],
  },
  'scale-in': {
    css: () =>
      'from { transform: scale(var(--rafters-extent-pop)); opacity: 0; } to { transform: scale(1); opacity: 1; }',
    meaning: 'Scale up while fading in',
    contexts: ['modal', 'popover', 'dialog'],
  },
  'scale-out': {
    css: () =>
      'from { transform: scale(1); opacity: 1; } to { transform: scale(var(--rafters-extent-pop)); opacity: 0; }',
    meaning: 'Scale down while fading out',
    contexts: ['modal-exit', 'popover-close'],
  },
  'grow-in': {
    // scaleY, not a uniform scale -- a bar growing from the baseline to its
    // full height is STRUCTURAL geometry (fixed, like the accordion
    // chevron's 180deg rotation), not a pop: no opacity, no other numeric.
    // The transform-origin anchoring the growth at the bottom (the
    // value-axis baseline) is the caller-set `transform-origin`
    // (bar-chart.behavior.ts's `transformOriginFor`), not this keyframe --
    // this declares only the scaleY 0 -> 1 extent.
    css: () => 'from { transform: scaleY(0); } to { transform: scaleY(1); }',
    meaning:
      'Grow from zero to full height, anchored at the baseline (caller-set transform-origin)',
    contexts: ['bar-chart', 'value-display'],
  },
  'grow-in-x': {
    // The horizontal-layout counterpart of grow-in: scaleX, not scaleY --
    // `layout: 'horizontal'` swaps computeBars' value axis from y to x
    // (bar-chart.behavior.ts), so the structural growth axis swaps with it.
    // Same rationale as grow-in: no opacity, no other numeric, transform-
    // origin is caller-set (transformOriginFor).
    css: () => 'from { transform: scaleX(0); } to { transform: scaleX(1); }',
    meaning: 'Grow from zero to full width, anchored at the baseline (caller-set transform-origin)',
    contexts: ['bar-chart', 'value-display'],
  },
  spin: {
    css: () => 'from { transform: rotate(0deg); } to { transform: rotate(360deg); }',
    meaning: 'Continuous rotation',
    contexts: ['loading', 'spinner', 'refresh'],
  },
  ping: {
    css: (ctx) => `75%, 100% { transform: scale(${ctx.pingScale}); opacity: 0; }`,
    meaning: 'Expanding pulse that fades out',
    contexts: ['notification-badge', 'attention', 'pulse'],
  },
  pulse: {
    css: (ctx) => `0%, 100% { opacity: 1; } 50% { opacity: ${ctx.pulseOpacity}; }`,
    meaning: 'Gentle opacity pulse',
    contexts: ['skeleton', 'loading-placeholder'],
  },
  bounce: {
    // Inline beziers retained deliberately -- see the provenance note above.
    css: (ctx) =>
      `0%, 100% { transform: translateY(-${ctx.bouncePercent}%); animation-timing-function: cubic-bezier(0.8, 0, 1, 1); } 50% { transform: translateY(0); animation-timing-function: cubic-bezier(0, 0, 0.2, 1); }`,
    meaning: 'Bouncing motion',
    contexts: ['attention', 'scroll-indicator'],
  },
  'caret-blink': {
    css: () => '0%, 70%, 100% { opacity: 1; } 20%, 50% { opacity: 0; }',
    meaning: 'Text cursor blinking',
    contexts: ['input-caret', 'text-cursor'],
  },
};

/**
 * How an animation gets its duration. A transition reads a perceptual TIER; a
 * continuous animation has a LOOP PERIOD, which no band governs because nothing
 * is being tracked to a destination. Previously the generator distinguished these
 * by sniffing whether the string ended in "s" -- stringly-typed state standing in
 * for a real distinction.
 */
export type AnimationDuration = { tier: string } | { loopPeriod: string };

export interface AnimationDef {
  /** Key of DEFAULT_KEYFRAME_DEFINITIONS. */
  keyframe: string;
  duration: AnimationDuration;
  /** Key of DEFAULT_EASING_DEFINITIONS -- the current six-curve vocabulary. */
  curve: string;
  iterations?: string;
  meaning: string;
  contexts: string[];
}

/**
 * Animation definitions -- keyframe plus duration plus curve.
 *
 * These previously spoke the pre-#1903 easing vocabulary (`ease-out`, `ease-in`,
 * `ease-in-out`, `spring`) and survived the curve rename only through a
 * LEGACY_EASING_REMAP table inside the generator. They now name the six curves
 * directly and that remap is retired. The mapping applied was exactly the remap's:
 * ease-out -> enter, ease-in -> exit, ease-in-out -> standard, spring ->
 * spring-snappy, linear -> linear. Output is unchanged.
 *
 * Loop periods (`spin`, `ping`, `pulse`, `bounce`, `caret-blink`) carry the same
 * unblessed-vocabulary caveat as their keyframes.
 *
 * NO MATRIX CELL CONSUMES `scale-in` / `scale-out` ANY MORE (#2017). The three
 * components that did -- dialog, popover, dropdown-menu -- now consume their own
 * cell composites in DEFAULT_MOTION_CELL_ANIMATIONS, which is what fixes the
 * #2012 collapse. These two are left standing UNCHANGED and unretuned on
 * purpose: `scale-in` carries `spring-snappy`, which the July baseline reserves
 * for press/friendly feedback, and quietly repointing it at `enter` would be
 * inventing an assignment no cell made -- the same class of error as the
 * derivation this issue deletes. Whether they should exist at all is a deletion
 * call for the sweep, not a value change to slip into a conformance fix.
 */
export const DEFAULT_ANIMATION_DEFINITIONS: Record<string, AnimationDef> = {
  'fade-in': {
    keyframe: 'fade-in',
    duration: { tier: 'fast' },
    curve: 'enter',
    meaning: 'Fade in animation',
    contexts: ['enter', 'appear'],
  },
  'fade-out': {
    keyframe: 'fade-out',
    duration: { tier: 'fast' },
    curve: 'exit',
    meaning: 'Fade out animation',
    contexts: ['exit', 'disappear'],
  },
  'slide-in-from-top': {
    keyframe: 'slide-in-from-top',
    duration: { tier: 'normal' },
    curve: 'enter',
    meaning: 'Slide in from top',
    contexts: ['dropdown', 'notification'],
  },
  'slide-in-from-bottom': {
    keyframe: 'slide-in-from-bottom',
    duration: { tier: 'normal' },
    curve: 'enter',
    meaning: 'Slide in from bottom',
    contexts: ['sheet', 'drawer'],
  },
  'slide-in-from-left': {
    keyframe: 'slide-in-from-left',
    duration: { tier: 'normal' },
    curve: 'enter',
    meaning: 'Slide in from left',
    contexts: ['sidebar', 'panel'],
  },
  'slide-in-from-right': {
    keyframe: 'slide-in-from-right',
    duration: { tier: 'normal' },
    curve: 'enter',
    meaning: 'Slide in from right',
    contexts: ['sidebar', 'panel'],
  },
  'slide-out-to-top': {
    keyframe: 'slide-out-to-top',
    duration: { tier: 'fast' },
    curve: 'exit',
    meaning: 'Slide out to top',
    contexts: ['dropdown-exit'],
  },
  'slide-out-to-bottom': {
    keyframe: 'slide-out-to-bottom',
    duration: { tier: 'fast' },
    curve: 'exit',
    meaning: 'Slide out to bottom',
    contexts: ['sheet-exit'],
  },
  'slide-out-to-left': {
    keyframe: 'slide-out-to-left',
    duration: { tier: 'fast' },
    curve: 'exit',
    meaning: 'Slide out to left',
    contexts: ['sidebar-close'],
  },
  'slide-out-to-right': {
    keyframe: 'slide-out-to-right',
    duration: { tier: 'fast' },
    curve: 'exit',
    meaning: 'Slide out to right',
    contexts: ['sidebar-close'],
  },
  'scale-in': {
    keyframe: 'scale-in',
    duration: { tier: 'normal' },
    curve: 'spring-snappy',
    meaning: 'Scale in with spring',
    contexts: ['modal', 'popover'],
  },
  'scale-out': {
    keyframe: 'scale-out',
    duration: { tier: 'fast' },
    curve: 'exit',
    meaning: 'Scale out',
    contexts: ['modal-exit'],
  },
  spin: {
    keyframe: 'spin',
    duration: { loopPeriod: '1s' },
    curve: 'linear',
    iterations: 'infinite',
    meaning: 'Continuous spin',
    contexts: ['loading', 'spinner'],
  },
  ping: {
    keyframe: 'ping',
    duration: { loopPeriod: '1s' },
    curve: 'enter',
    iterations: 'infinite',
    meaning: 'Pinging pulse',
    contexts: ['notification'],
  },
  pulse: {
    keyframe: 'pulse',
    duration: { loopPeriod: '2s' },
    curve: 'standard',
    iterations: 'infinite',
    meaning: 'Gentle pulse',
    contexts: ['skeleton', 'loading'],
  },
  bounce: {
    keyframe: 'bounce',
    duration: { loopPeriod: '1s' },
    curve: 'standard',
    iterations: 'infinite',
    meaning: 'Bouncing',
    contexts: ['attention'],
  },
  'caret-blink': {
    keyframe: 'caret-blink',
    duration: { loopPeriod: '1.25s' },
    curve: 'enter',
    iterations: 'infinite',
    meaning: 'Caret blinking',
    contexts: ['input'],
  },
};

/**
 * ONE ANIMATED MATRIX CELL, as a composite of references (#2017).
 *
 * A cell is a (component, part, transition) triple in
 * `packages/ui/docs/spec/matrix/motion.jsonl`, and THE CELL IS THE SPEC: the
 * tier, the curve and the extent are read off the row, never inferred. This type
 * exists because #2012 collapsed three DISTINCT cells (dialog open, popover
 * open, dropdown-menu open) into one baked animation at normal + spring-snappy
 * -- the wrong curve class entirely, since spring-snappy is press/friendly
 * feedback and never an efficient entrance.
 *
 * WHY CELL-NAMED COMPOSITES ARE NOT A VOCABULARY VIOLATION (operator ruling).
 * The "no per-cell names" rule governs the five NAMESPACES: there is one `fast`,
 * everywhere, always, because two fasts is how drift starts. A composite that
 * REFERENCES `fast` mints no second value -- it is a statement about which
 * shared tier this moment uses. `motion-scale-in` is already a named composite
 * of exactly this shape; these are the same thing with the cell, rather than a
 * guess, choosing the members.
 *
 * Nothing here is a literal. `keyframe` names a shape, `tier` and `curve` name
 * leaves, and the emitted value is a var() per reference -- so retuning a leaf
 * moves one line of the sheet and every cell that points at it follows.
 */

/**
 * How a CELL gets its duration, as the matrix states it (#2154).
 *
 * `motion.jsonl`'s own `duration` column is a discriminated union and this
 * mirrors it exactly: a transition names a perceptual TIER, a loop names a
 * PERIOD. The two are not interchangeable and neither is a default for the
 * other -- a tier-kind cell runs once, a period-kind cell runs forever, and the
 * reduced-motion law treats them oppositely (the tier is zeroed, the period is
 * exempt because loops slow and never stop).
 *
 * The `kind` tag is what makes the difference REPRESENTABLE. A single
 * `durationTier: string` had no way to say "this cell loops", so the four
 * looping cells (skeleton, spinner, progress indeterminate, input-otp caret)
 * could not be transcribed at all.
 */
export type MotionCellDuration =
  /** Key of DEFAULT_DURATION_DEFINITIONS -- the cell's `duration.tier`. */
  | { kind: 'tier'; tier: string }
  /** Key of DEFAULT_PERIOD_NAMESPACE -- the cell's `duration.period`. */
  | { kind: 'period'; period: string };

export interface MotionCellAnimation {
  /** Key of DEFAULT_KEYFRAME_DEFINITIONS -- the SHAPE, carrying no timing. */
  keyframe: string;
  duration: MotionCellDuration;
  /**
   * Key of DEFAULT_EASING_DEFINITIONS -- the cell's `curve.role`.
   *
   * ABSENT means the cell declares `curve: {"kind":"none"}`, which every
   * period-kind row in the matrix does. Supplying one anyway would be inventing
   * an assignment no cell made -- the same class of error as the
   * `scaleStart = 1/ratio^0.25` derivation #2017 deleted. A tier-kind cell
   * without one fails the generator.
   */
  curve?: string;
  /** The matrix coordinates this composite transcribes, for review and for docs. */
  cell: { component: string; part: string; transition: string };
  meaning: string;
  contexts: string[];
}

/**
 * THE ANIMATED CELLS, transcribed from motion.jsonl. Each key becomes one
 * `motion-cell-<key>` token and one `animate-<key>` utility.
 *
 * WHICH ROWS APPEAR HERE -- the predicate, stated once so the both-directions
 * diff (cells-consumed vs cells-assigned) is reviewable:
 *
 *   1. The row's transition is PRESENCE (the part mounts or unmounts), an
 *      APPEARANCE (it arrives once, like an image load), or a LOOP. A
 *      state-to-state change on a part that stays mounted -- a hover colour, a
 *      highlight move, a chevron rotate, a fill -- is a TRANSITION, and
 *      `motion-semantic-*` is where transitions live. Keyframes there would
 *      restart on every state flip.
 *   2. The row's declared `properties` intersect what the keyframe vocabulary
 *      can express: `opacity` -> fade, `transform: scale` -> scale, `keyframes,
 *      infinite` -> a loop shape. WE EMIT ONLY THE INTERSECTION. Where a row
 *      declares more than the vocabulary covers, the entry says so in `meaning`
 *      rather than an invented shape being authored to fill the gap.
 *   3. `duration.kind` is `tier` or `period`. `pointer-rule`, `follows` and
 *      `none` rows are not animated at all -- the pointer rule is a law, and a
 *      `none` row (every `items / enter` stagger row) is waiting on the
 *      stagger-step work, not on a shape.
 *   4. The component the row names EXISTS in `packages/ui/src/components`. The
 *      matrix runs ahead of the library in two places (menubar, date-picker),
 *      and a utility for a component nobody can import is a token with no
 *      consumer.
 *   5. A cell here would not DOUBLE-DRIVE a property a transition is already
 *      driving. This bites exactly one shape of row: `opacity` +
 *      `grid-rows / height` (accordion content, collapsible content, a field
 *      message). No keyframe expresses `grid-template-rows`, so that moment can
 *      only run as a transition, and `motion-expand`/`motion-collapse` already
 *      transition `grid-template-rows` AND `opacity` together. A cell for the
 *      opacity half would put an animation and a transition on the same
 *      property at once -- the animation wins, and the transition's opacity is
 *      overridden mid-flight.
 *
 *      This is NOT the broader claim that an overlapping semantic property list
 *      excludes a row: `modal-in` also declares `opacity` + `transform`, and
 *      `dialog / content / closed -> open` is covered here all the same. The
 *      difference is that its non-opacity half IS a shape (`transform: scale`
 *      -> `scale-in`), so the whole moment runs as one animation and no
 *      transition is competing for opacity.
 *
 * EVERY ROW THIS PREDICATE EXCLUDES IS ENUMERATED, one line each with its
 * reason, in `EXCLUDED_ROWS` in `test/motion-cells.test.ts`, and the suite there
 * asserts that (cells-assigned - cells-consumed) equals that list EXACTLY. So a
 * new matrix row lands in CI as a failure until somebody either transcribes it
 * here or writes down why not, and a stale exclusion fails the same way. The
 * prose above says why the categories exist; the list says which rows are in
 * them.
 *
 * NO NEW KEYFRAME IS AUTHORED HERE, and that is the point rather than an
 * omission. Every entry below names a shape that already exists, so no geometry
 * enters the system in a coverage change -- which is exactly the move that
 * produced the #2012 defect (`scaleStart = 1/ratio^0.25`, a formula in value
 * position). The rows whose movement has no existing shape (drawer content's
 * per-side slide, carousel travel, the discrete swaps) are LEFT OUT rather than
 * approximated: an approximated shape is a value nobody chose.
 *
 * The extent is not named here because the KEYFRAME carries it (`scale-in` /
 * `scale-out` reference `var(--rafters-extent-pop)`), which is what "keyframes
 * are shapes" means: geometry rides with the shape, timing attaches at the cell.
 * A fade names no extent because there is no extent member for opacity -- the
 * namespace holds pop, press and draw, and inventing a fourth to satisfy a
 * symmetry would be a second value for a knob nobody turns.
 *
 * Components with identical assignments stay SEPARATE cells (popover and
 * dropdown-menu, tooltip and hover-card, every overlay fade). The matrix
 * declares distinct moments, and collapsing them is precisely the move that
 * produced #2012 -- the day one is retuned, a shared name would drag the others
 * with it silently.
 */
export const DEFAULT_MOTION_CELL_ANIMATIONS: Record<string, MotionCellAnimation> = {
  // ---------------------------------------------------------------- modal overlay
  'dialog-content-open': {
    keyframe: 'scale-in',
    duration: { kind: 'tier', tier: 'normal' },
    curve: 'enter',
    cell: { component: 'dialog', part: 'content', transition: 'closed -> open' },
    meaning: 'A dialog arriving: fade + zoom from the pop extent, on the arrival curve.',
    contexts: ['dialog', 'modal', 'alert-dialog'],
  },
  'dialog-content-close': {
    keyframe: 'scale-out',
    duration: { kind: 'tier', tier: 'moderate' },
    curve: 'exit',
    cell: { component: 'dialog', part: 'content', transition: 'open -> closed' },
    meaning: 'A dialog leaving: fade + zoom back to the pop extent, on the departure curve.',
    contexts: ['dialog', 'modal', 'alert-dialog'],
  },
  'dialog-overlay-open': {
    keyframe: 'fade-in',
    duration: { kind: 'tier', tier: 'normal' },
    curve: 'enter',
    cell: { component: 'dialog', part: 'overlay', transition: 'closed -> open' },
    meaning: 'The scrim behind a dialog, arriving with the surface it dims for.',
    contexts: ['dialog', 'overlay', 'scrim'],
  },
  'dialog-overlay-close': {
    keyframe: 'fade-out',
    duration: { kind: 'tier', tier: 'moderate' },
    curve: 'exit',
    cell: { component: 'dialog', part: 'overlay', transition: 'open -> closed' },
    meaning: 'The scrim behind a dialog, leaving with it.',
    contexts: ['dialog', 'overlay', 'scrim'],
  },
  'alert-dialog-content-open': {
    keyframe: 'scale-in',
    duration: { kind: 'tier', tier: 'normal' },
    curve: 'enter',
    cell: { component: 'alert-dialog', part: 'content', transition: 'closed -> open' },
    meaning: 'An alert dialog arriving: the dialog moment, declared on its own row.',
    contexts: ['alert-dialog', 'modal'],
  },
  'alert-dialog-content-close': {
    keyframe: 'scale-out',
    duration: { kind: 'tier', tier: 'moderate' },
    curve: 'exit',
    cell: { component: 'alert-dialog', part: 'content', transition: 'open -> closed' },
    meaning: 'An alert dialog leaving, once the choice it demanded has been made.',
    contexts: ['alert-dialog', 'modal'],
  },
  'alert-dialog-overlay-open': {
    keyframe: 'fade-in',
    duration: { kind: 'tier', tier: 'normal' },
    curve: 'enter',
    cell: { component: 'alert-dialog', part: 'overlay', transition: 'closed -> open' },
    meaning: 'The scrim behind an alert dialog, arriving with the surface it dims for.',
    contexts: ['alert-dialog', 'overlay', 'scrim'],
  },
  'alert-dialog-overlay-close': {
    keyframe: 'fade-out',
    duration: { kind: 'tier', tier: 'moderate' },
    curve: 'exit',
    cell: { component: 'alert-dialog', part: 'overlay', transition: 'open -> closed' },
    meaning: 'The scrim behind an alert dialog, leaving with it.',
    contexts: ['alert-dialog', 'overlay', 'scrim'],
  },
  'sheet-content-open': {
    keyframe: 'fade-in',
    duration: { kind: 'tier', tier: 'normal' },
    curve: 'spring-smooth',
    cell: { component: 'sheet', part: 'content', transition: 'closed -> open' },
    meaning:
      'A sheet arriving. The row declares slide (per side) + fade; the fade is emitted and the per-side slide is not, because the vocabulary has no side-agnostic slide shape and the matrix calls a physical side a defect.',
    contexts: ['sheet', 'panel', 'edge-anchored'],
  },
  'sheet-content-close': {
    keyframe: 'fade-out',
    duration: { kind: 'tier', tier: 'moderate' },
    curve: 'exit',
    cell: { component: 'sheet', part: 'content', transition: 'open -> closed' },
    meaning: 'A sheet leaving. The fade half of slide (per side) + fade, on the departure curve.',
    contexts: ['sheet', 'panel', 'edge-anchored'],
  },
  'sheet-overlay-open': {
    keyframe: 'fade-in',
    duration: { kind: 'tier', tier: 'normal' },
    curve: 'enter',
    cell: { component: 'sheet', part: 'overlay', transition: 'closed -> open' },
    meaning: 'The scrim behind a sheet, arriving with it.',
    contexts: ['sheet', 'overlay', 'scrim'],
  },
  'sheet-overlay-close': {
    keyframe: 'fade-out',
    duration: { kind: 'tier', tier: 'moderate' },
    curve: 'exit',
    cell: { component: 'sheet', part: 'overlay', transition: 'open -> closed' },
    meaning: 'The scrim behind a sheet, leaving with it.',
    contexts: ['sheet', 'overlay', 'scrim'],
  },
  'drawer-overlay-open': {
    keyframe: 'fade-in',
    duration: { kind: 'tier', tier: 'normal' },
    curve: 'enter',
    cell: { component: 'drawer', part: 'overlay', transition: 'closed -> open' },
    meaning: 'The scrim behind a drawer, arriving with it.',
    contexts: ['drawer', 'overlay', 'scrim'],
  },
  'drawer-overlay-close': {
    keyframe: 'fade-out',
    duration: { kind: 'tier', tier: 'moderate' },
    curve: 'exit',
    cell: { component: 'drawer', part: 'overlay', transition: 'open -> closed' },
    meaning: 'The scrim behind a drawer, leaving with it.',
    contexts: ['drawer', 'overlay', 'scrim'],
  },
  'sidebar-overlay-mobile-open': {
    keyframe: 'fade-in',
    duration: { kind: 'tier', tier: 'normal' },
    curve: 'spring-smooth',
    cell: { component: 'sidebar', part: 'overlay (mobile)', transition: 'open' },
    meaning:
      'A sidebar arriving as a mobile overlay. The row declares fade + slide; the fade is emitted and the slide is not, for the reason the sheet row gives -- no side-agnostic slide shape.',
    contexts: ['sidebar', 'overlay', 'mobile'],
  },
  'sidebar-overlay-mobile-close': {
    keyframe: 'fade-out',
    duration: { kind: 'tier', tier: 'moderate' },
    curve: 'exit',
    cell: { component: 'sidebar', part: 'overlay (mobile)', transition: 'close' },
    meaning:
      'A mobile sidebar overlay leaving. The fade half of fade + slide, on the departure curve.',
    contexts: ['sidebar', 'overlay', 'mobile'],
  },
  // --------------------------------------------------------------- anchored popup
  'popover-content-open': {
    keyframe: 'scale-in',
    duration: { kind: 'tier', tier: 'moderate' },
    curve: 'enter',
    cell: { component: 'popover', part: 'content', transition: 'closed -> open' },
    meaning: 'A popover arriving: smaller and nearer than a dialog, so one tier quicker.',
    contexts: ['popover', 'anchored-popup'],
  },
  'popover-content-close': {
    keyframe: 'scale-out',
    duration: { kind: 'tier', tier: 'fast' },
    curve: 'exit',
    cell: { component: 'popover', part: 'content', transition: 'open -> closed' },
    meaning: 'A popover leaving: the user already chose to dismiss it.',
    contexts: ['popover', 'anchored-popup'],
  },
  'dropdown-menu-content-open': {
    keyframe: 'scale-in',
    duration: { kind: 'tier', tier: 'moderate' },
    curve: 'enter',
    cell: { component: 'dropdown-menu', part: 'content', transition: 'closed -> open' },
    meaning: 'A menu arriving: same anchored-popup moment as popover, declared separately.',
    contexts: ['dropdown-menu', 'menu', 'anchored-popup'],
  },
  'dropdown-menu-content-close': {
    keyframe: 'scale-out',
    duration: { kind: 'tier', tier: 'fast' },
    curve: 'exit',
    cell: { component: 'dropdown-menu', part: 'content', transition: 'open -> closed' },
    meaning: 'A menu leaving, after a choice or a dismissal.',
    contexts: ['dropdown-menu', 'menu', 'anchored-popup'],
  },
  'context-menu-content-open': {
    keyframe: 'scale-in',
    duration: { kind: 'tier', tier: 'moderate' },
    curve: 'enter',
    cell: { component: 'context-menu', part: 'content', transition: 'closed -> open' },
    meaning: 'A context menu arriving at the pointer that summoned it.',
    contexts: ['context-menu', 'menu', 'anchored-popup'],
  },
  'context-menu-content-close': {
    keyframe: 'scale-out',
    duration: { kind: 'tier', tier: 'fast' },
    curve: 'exit',
    cell: { component: 'context-menu', part: 'content', transition: 'open -> closed' },
    meaning: 'A context menu leaving, after a choice or a dismissal.',
    contexts: ['context-menu', 'menu', 'anchored-popup'],
  },
  'select-content-open': {
    keyframe: 'scale-in',
    duration: { kind: 'tier', tier: 'moderate' },
    curve: 'enter',
    cell: { component: 'select', part: 'content', transition: 'closed -> open' },
    meaning: 'A select list arriving over its trigger.',
    contexts: ['select', 'listbox', 'anchored-popup'],
  },
  'select-content-close': {
    keyframe: 'scale-out',
    duration: { kind: 'tier', tier: 'fast' },
    curve: 'exit',
    cell: { component: 'select', part: 'content', transition: 'open -> closed' },
    meaning: 'A select list leaving, once a value is chosen or the list is dismissed.',
    contexts: ['select', 'listbox', 'anchored-popup'],
  },
  'combobox-content-open': {
    keyframe: 'scale-in',
    duration: { kind: 'tier', tier: 'moderate' },
    curve: 'enter',
    cell: { component: 'combobox', part: 'content', transition: 'closed -> open' },
    meaning: 'A combobox list arriving under the field being typed into.',
    contexts: ['combobox', 'listbox', 'anchored-popup'],
  },
  'combobox-content-close': {
    keyframe: 'scale-out',
    duration: { kind: 'tier', tier: 'fast' },
    curve: 'exit',
    cell: { component: 'combobox', part: 'content', transition: 'open -> closed' },
    meaning: 'A combobox list leaving, once a value is chosen or the field is left.',
    contexts: ['combobox', 'listbox', 'anchored-popup'],
  },
  'command-content-open': {
    keyframe: 'fade-in',
    duration: { kind: 'tier', tier: 'moderate' },
    curve: 'enter',
    cell: { component: 'command', part: 'content', transition: 'closed -> open' },
    meaning:
      'A command palette arriving. The row declares fade alone -- no zoom, unlike its anchored-popup siblings.',
    contexts: ['command', 'palette'],
  },
  'command-content-close': {
    keyframe: 'fade-out',
    duration: { kind: 'tier', tier: 'fast' },
    curve: 'exit',
    cell: { component: 'command', part: 'content', transition: 'open -> closed' },
    meaning: 'A command palette leaving, after a command is run or the palette is dismissed.',
    contexts: ['command', 'palette'],
  },
  'tooltip-content-open': {
    keyframe: 'scale-in',
    duration: { kind: 'tier', tier: 'moderate' },
    curve: 'enter',
    cell: { component: 'tooltip', part: 'content', transition: 'closed -> open' },
    meaning:
      'A tooltip arriving. The hover-intent delay its row also assigns is behaviour-owned, not part of this shape.',
    contexts: ['tooltip', 'anchored-popup'],
  },
  'tooltip-content-close': {
    keyframe: 'scale-out',
    duration: { kind: 'tier', tier: 'fast' },
    curve: 'exit',
    cell: { component: 'tooltip', part: 'content', transition: 'open -> closed' },
    meaning: 'A tooltip leaving as soon as the pointer does.',
    contexts: ['tooltip', 'anchored-popup'],
  },
  'hover-card-content-open': {
    keyframe: 'scale-in',
    duration: { kind: 'tier', tier: 'moderate' },
    curve: 'enter',
    cell: { component: 'hover-card', part: 'content', transition: 'closed -> open' },
    meaning: 'A hover card arriving: the tooltip moment at card weight, declared separately.',
    contexts: ['hover-card', 'anchored-popup'],
  },
  'hover-card-content-close': {
    keyframe: 'scale-out',
    duration: { kind: 'tier', tier: 'fast' },
    curve: 'exit',
    cell: { component: 'hover-card', part: 'content', transition: 'open -> closed' },
    meaning: 'A hover card leaving, after the linger grace its row assigns.',
    contexts: ['hover-card', 'anchored-popup'],
  },
  'navigation-menu-panel-open': {
    keyframe: 'scale-in',
    duration: { kind: 'tier', tier: 'moderate' },
    curve: 'enter',
    cell: { component: 'navigation-menu', part: 'panel', transition: 'closed -> open' },
    meaning: 'A navigation panel arriving under its trigger.',
    contexts: ['navigation-menu', 'anchored-popup'],
  },
  'navigation-menu-panel-close': {
    keyframe: 'scale-out',
    duration: { kind: 'tier', tier: 'fast' },
    curve: 'exit',
    cell: { component: 'navigation-menu', part: 'panel', transition: 'open -> closed' },
    meaning: 'A navigation panel leaving when the pointer goes elsewhere.',
    contexts: ['navigation-menu', 'anchored-popup'],
  },
  // ---------------------------------------------------------------- value display
  'calendar-grid-month-change': {
    keyframe: 'fade-in',
    duration: { kind: 'tier', tier: 'moderate' },
    curve: 'standard',
    cell: { component: 'calendar', part: 'grid', transition: 'month change' },
    meaning:
      'The incoming month grid. The row declares fade or slide (x) crossfade; the fade is emitted, the optional slide is not, because its distance is a grid width nothing names.',
    contexts: ['calendar', 'date-picker'],
  },
  'tabs-panel-active-change': {
    keyframe: 'fade-in',
    duration: { kind: 'tier', tier: 'fast' },
    curve: 'standard',
    cell: { component: 'tabs', part: 'panel', transition: 'active change' },
    meaning:
      'The incoming tab panel as the selection moves: the calendar month-change moment on a panel instead of a grid, one tier quicker because a panel swap covers no distance.',
    contexts: ['tabs', 'panel', 'crossfade'],
  },
  'bar-chart-bar-enter': {
    keyframe: 'grow-in',
    duration: { kind: 'tier', tier: 'normal' },
    curve: 'enter',
    cell: { component: 'bar-chart', part: 'bar', transition: 'enter' },
    meaning:
      'A bar arriving: grows from zero at the value-axis baseline (bar-chart.behavior.ts sets the transform-origin), on the arrival curve. Vertical layout, the default -- see bar-chart-bar-enter-x for the horizontal counterpart.',
    contexts: ['bar-chart', 'chart', 'value-display'],
  },
  'bar-chart-bar-enter-x': {
    keyframe: 'grow-in-x',
    duration: { kind: 'tier', tier: 'normal' },
    curve: 'enter',
    cell: { component: 'bar-chart', part: 'bar', transition: 'enter-horizontal' },
    meaning:
      'A bar arriving under layout: "horizontal": grows from zero at the value-axis baseline, now the left edge (bar-chart.behavior.ts sets the transform-origin), on the same arrival curve as the vertical bar-chart-bar-enter cell -- only the transform property (scaleX, not scaleY) changes with the swapped axis.',
    contexts: ['bar-chart', 'chart', 'value-display'],
  },
  'area-chart-area-enter': {
    keyframe: 'fade-in',
    duration: { kind: 'tier', tier: 'moderate' },
    curve: 'enter',
    cell: { component: 'area-chart', part: 'area', transition: 'enter' },
    meaning:
      'A filled area arriving on mount: fade, not scale -- unlike bar-chart-bar-enter, a stacked area series has no single baseline edge to grow from (its baseline is the previous series own top curve, area-chart.behavior.ts computeAreas), so opacity is the one property every area shares whether overlaid or stacked.',
    contexts: ['area-chart', 'chart', 'value-display'],
  },
  'line-chart-line-enter': {
    keyframe: 'fade-in',
    duration: { kind: 'tier', tier: 'moderate' },
    curve: 'enter',
    cell: { component: 'line-chart', part: 'line', transition: 'enter' },
    meaning:
      'A line series arriving on mount: fades in rather than snapping into place. The matrix assigns opacity over a stroke-dashoffset reveal for this cell -- a dashoffset keyframe needs a per-instance path-length value nothing here names, where a fade needs none.',
    contexts: ['line-chart', 'chart', 'value-display'],
  },
  // ------------------------------------------------------------- load / appearance
  'avatar-image-load': {
    keyframe: 'fade-in',
    duration: { kind: 'tier', tier: 'moderate' },
    curve: 'enter',
    cell: { component: 'avatar', part: 'image', transition: 'load' },
    meaning: 'An avatar image arriving once it has decoded, rather than snapping in.',
    contexts: ['avatar', 'image', 'load'],
  },
  'image-img-load': {
    keyframe: 'fade-in',
    duration: { kind: 'tier', tier: 'moderate' },
    curve: 'enter',
    cell: { component: 'image', part: 'img', transition: 'load' },
    meaning: 'An image arriving once it has decoded: the avatar moment, declared on its own row.',
    contexts: ['image', 'load'],
  },
  'embed-frame-load': {
    keyframe: 'fade-in',
    duration: { kind: 'tier', tier: 'moderate' },
    curve: 'enter',
    cell: { component: 'embed', part: 'frame', transition: 'load' },
    meaning: 'An embedded frame arriving once the thing inside it has loaded.',
    contexts: ['embed', 'iframe', 'load'],
  },
  'alert-root-appear': {
    keyframe: 'fade-in',
    duration: { kind: 'tier', tier: 'normal' },
    curve: 'enter',
    cell: { component: 'alert', part: 'root', transition: 'appear' },
    meaning:
      'An alert arriving in the flow. The row declares fade + a short translate; the fade is emitted and the translate is not, for the reason the sheet row gives.',
    contexts: ['alert', 'notice', 'appear'],
  },
  'scroll-area-scrollbar-show': {
    keyframe: 'fade-in',
    duration: { kind: 'tier', tier: 'fast' },
    curve: 'standard',
    cell: { component: 'scroll-area', part: 'scrollbar', transition: 'show' },
    meaning: 'A scrollbar surfacing when the pointer or a scroll says it is wanted.',
    contexts: ['scroll-area', 'scrollbar'],
  },
  'scroll-area-scrollbar-hide': {
    keyframe: 'fade-out',
    duration: { kind: 'tier', tier: 'fast' },
    curve: 'standard',
    cell: { component: 'scroll-area', part: 'scrollbar', transition: 'hide' },
    meaning: 'A scrollbar standing down once the scrolling that summoned it stops.',
    contexts: ['scroll-area', 'scrollbar'],
  },
  'skeleton-root-waiting': {
    keyframe: 'pulse',
    duration: { kind: 'period', period: 'shimmer' },
    cell: { component: 'skeleton', part: 'root', transition: 'waiting' },
    meaning:
      'A skeleton breathing while its content loads. A loop, so it takes a period rather than a tier -- and reduced motion may slow it but never stops it.',
    contexts: ['skeleton', 'loading-placeholder'],
  },
  'skeleton-root-content-ready': {
    keyframe: 'fade-out',
    duration: { kind: 'tier', tier: 'fast' },
    curve: 'exit',
    cell: { component: 'skeleton', part: 'root', transition: 'content ready' },
    meaning: 'A skeleton standing down once the real content has arrived.',
    contexts: ['skeleton', 'loading-placeholder'],
  },
  'spinner-root-busy': {
    keyframe: 'spin',
    duration: { kind: 'period', period: 'spin' },
    cell: { component: 'spinner', part: 'root', transition: 'busy' },
    meaning:
      'A spinner turning while the system works. A stopped spinner says the work stopped, so this loop is exempt from the reduced-motion zeroing.',
    contexts: ['spinner', 'loading', 'busy'],
  },
  'progress-root-indeterminate': {
    keyframe: 'pulse',
    duration: { kind: 'period', period: 'shimmer' },
    cell: { component: 'progress', part: 'root', transition: 'indeterminate' },
    meaning:
      'A progress bar with no known end, pulsing to say work continues. Exempt from the reduced-motion zeroing for the same reason as the spinner.',
    contexts: ['progress', 'indeterminate', 'loading'],
  },
  // -------------------------------------------------------------------- text input
  'input-otp-caret-idle': {
    keyframe: 'caret-blink',
    duration: { kind: 'period', period: 'blink' },
    cell: { component: 'input-otp', part: 'caret', transition: 'idle' },
    meaning: 'The caret in an empty OTP slot, blinking to say the field is waiting for a key.',
    contexts: ['input-otp', 'input-caret', 'text-cursor'],
  },
};

export interface MotionCompositePreset {
  /** Key of DEFAULT_DURATION_DEFINITIONS. */
  durationTier: string;
  /** Key of DEFAULT_EASING_DEFINITIONS -- the current six-curve vocabulary. */
  curve: string;
  meaning: string;
  contexts: string[];
}

/**
 * Composite presets -- a duration paired with a curve, emitted as one token.
 * Retained for backwards compatibility; the semantic motion tokens
 * (DEFAULT_MOTION_SEMANTIC_MAPPINGS) are the current way to express this, since
 * they also carry the property set and the reduced-motion degradation.
 *
 * The record key is the full token name, which these carry verbatim rather than
 * receiving a generated prefix. Like the animations, they spoke the pre-#1903
 * easing vocabulary and now name the six curves directly.
 */
export const DEFAULT_MOTION_COMPOSITE_PRESETS: Record<string, MotionCompositePreset> = {
  'motion-fade-in': {
    durationTier: 'fast',
    curve: 'enter',
    meaning: 'Fade in animation preset',
    contexts: ['fade-in', 'appear'],
  },
  'motion-fade-out': {
    durationTier: 'fast',
    curve: 'exit',
    meaning: 'Fade out animation preset',
    contexts: ['fade-out', 'disappear'],
  },
  'motion-slide-in': {
    durationTier: 'normal',
    curve: 'enter',
    meaning: 'Slide in animation preset',
    contexts: ['slide-in', 'panel-enter', 'modal-enter'],
  },
  'motion-slide-out': {
    durationTier: 'fast',
    curve: 'exit',
    meaning: 'Slide out animation preset',
    contexts: ['slide-out', 'panel-exit', 'modal-exit'],
  },
  'motion-scale-in': {
    durationTier: 'normal',
    curve: 'spring-snappy',
    meaning: 'Scale in with spring animation',
    contexts: ['pop-in', 'button-press', 'emphasis'],
  },
};

// =============================================================================
// SEMANTIC MOTION MAPPINGS
// =============================================================================

/**
 * Semantic motion token mapping. Each entry is the full transition specification
 * for one `motion-<name>` @utility: which properties transition, which duration
 * tier and easing curve, and how it degrades under prefers-reduced-motion.
 *
 * Duration/easing are referenced by NAME (resolved to `var(--duration-*)` /
 * `var(--ease-*)` at export), never inlined -- one source, override-propagating.
 * The value each token encodes is timing + property set; the from/to values are
 * the component's concern (see packages/ui/docs/spec/05-authoring.md).
 */
export interface MotionSemanticMapping {
  /** CSS properties this transition animates (become `transition-property`). */
  properties: string[];
  /**
   * How far the animated thing moves. THE input for anything spatial -- the
   * duration band and the curve both derive from it, so neither is named here.
   *
   * Ordinal rather than metric because the output is discrete: six perceptual
   * bands selected by a step function. A pixel or spacing-step figure would be
   * precision the decision never consumes.
   */
  travel: MotionTravel;
  /**
   * Interaction-only. hover, focus, press and toggle do not move through space,
   * so travel cannot select a band for them -- they separate by FEEDBACK KIND
   * instead (`micro` acknowledges that input landed, `fast` matches a cursor
   * already on target). Declared here rather than forced through a spatial rule
   * that would be fitting rather than deriving.
   *
   * Must be absent for `enter`/`exit`, where the band is derived.
   */
  band?: MotionBand;
  /**
   * Interaction-only, for the same reason as `band`. Feedback character is
   * per-token, not per-category. Absent for `enter`/`exit`, where the curve
   * derives from category and travel.
   */
  curve?: string;
  /**
   * prefers-reduced-motion override. `null` = preserved unchanged (feedback that
   * must survive: hover colour, focus ring). Otherwise the reduced property set
   * (transforms dropped, spatial motion becomes cross-fade) and an optional ms
   * override; omit `ms` to keep the tier duration.
   */
  reducedMotion: { properties: string[]; ms?: number } | null;
  /** enter/exit ride a presence change; interaction rides a state the component holds. */
  category: 'interaction' | 'enter' | 'exit';
  /** The size/distance reasoning behind the duration choice (docs/MOTION.md). */
  sizeReasoning: string;
  meaning: string;
  contexts: string[];
}

/**
 * The thirteen semantic motion tokens (docs/MOTION.md semantic table).
 *
 * Most `-in`/`-out` pairs encode the shorter exit in their tier choice (dropdown
 * moderate/fast, modal normal/moderate, expand/collapse normal/moderate) --
 * MOTION.md's "exits are faster" invariant, so authors inherit it without
 * re-deriving. `sheet` is the exception: both directions sit at the normal tier,
 * a spatial panel the user tracks in and out at the same pace. `expand`/`collapse`
 * transition `grid-template-rows` (0fr<->1fr), not `height`: height:auto is not
 * transitionable, grid-rows is, in pure CSS with no framework height var.
 */
export const DEFAULT_MOTION_SEMANTIC_MAPPINGS: Record<string, MotionSemanticMapping> = {
  hover: {
    properties: ['color', 'background-color', 'border-color'],
    travel: 'none',
    band: 'fast',
    curve: 'standard',
    reducedMotion: null,
    category: 'interaction',
    sizeReasoning:
      'Colour only, no movement -- the cursor is already on target, so the response matches its speed at the fast tier.',
    meaning: 'Hover-state colour transition. Acknowledges pointer presence.',
    contexts: ['hover', 'links', 'interactive-surfaces'],
  },
  focus: {
    properties: ['box-shadow', 'outline-color'],
    travel: 'none',
    band: 'micro',
    curve: 'linear',
    reducedMotion: null,
    category: 'interaction',
    sizeReasoning:
      'A ring appearing, not moving -- micro tier at linear velocity reads as the system marking focus, not a gesture. (Tailwind ring is box-shadow.)',
    meaning: 'Focus-ring transition. Marks the focused element.',
    contexts: ['focus-visible', 'keyboard-navigation'],
  },
  press: {
    properties: ['transform', 'color', 'background-color'],
    travel: 'none',
    band: 'micro',
    curve: 'spring-snappy',
    reducedMotion: { properties: ['color', 'background-color'] },
    category: 'interaction',
    sizeReasoning:
      'The fastest, tightest feedback -- micro tier with a snappy spring follows the finger. Under reduced motion the transform drops; the colour change survives.',
    meaning: 'Press/active feedback. Confirms the input was received.',
    contexts: ['press', 'active', 'buttons'],
  },
  toggle: {
    properties: ['color', 'background-color', 'transform'],
    travel: 'none',
    band: 'moderate',
    // `standard`, not `spring-snappy`. The 30-site study found 29 of 30 sites
    // carry zero overshoot curves, and the one that does is the friendly
    // exemplar -- spring-snappy belongs to friendly and effectively nowhere
    // else. Efficient is the shipped default intent and is characterised as
    // zero-overshoot, so a spring here contradicts the intent it ships under.
    // Matches the recorded ruling: an efficient toggle is crisp; friendly is
    // the intent that springs a switch.
    curve: 'standard',
    reducedMotion: { properties: ['color', 'background-color'] },
    category: 'interaction',
    sizeReasoning:
      'A thumb travelling a track is a small, tracked movement -- moderate tier at the standard curve. Reduced motion drops the transform to a colour cross-fade.',
    meaning: 'Toggle/switch state change. Shows the new state.',
    contexts: ['switch', 'toggle', 'checkbox'],
  },
  'dropdown-in': {
    properties: ['opacity', 'transform'],
    travel: 'short',
    reducedMotion: { properties: ['opacity'], ms: 100 },
    category: 'enter',
    sizeReasoning:
      'A dropdown is small and travels a short distance -- moderate tier, one step below the modal, with the arrival curve.',
    meaning: 'Dropdown/menu entrance.',
    contexts: ['dropdown', 'menu', 'select', 'popover'],
  },
  'dropdown-out': {
    properties: ['opacity', 'transform'],
    travel: 'short',
    reducedMotion: { properties: ['opacity'], ms: 100 },
    category: 'exit',
    sizeReasoning:
      'The exit of a small element -- fast tier (shorter than its moderate entrance) with the departure curve. The user already chose to dismiss it.',
    meaning: 'Dropdown/menu exit.',
    contexts: ['dropdown', 'menu', 'select', 'popover'],
  },
  'modal-in': {
    properties: ['opacity', 'transform'],
    travel: 'medium',
    reducedMotion: { properties: ['opacity'], ms: 150 },
    category: 'enter',
    sizeReasoning:
      'A modal is larger and travels farther than a dropdown -- normal tier, one step up, with the arrival curve. Size and distance produce the longer duration.',
    meaning: 'Modal/dialog entrance.',
    contexts: ['modal', 'dialog', 'alert-dialog'],
  },
  'modal-out': {
    properties: ['opacity', 'transform'],
    travel: 'medium',
    reducedMotion: { properties: ['opacity'], ms: 150 },
    category: 'exit',
    sizeReasoning:
      'The modal exit -- moderate tier (shorter than its normal entrance) with the departure curve.',
    meaning: 'Modal/dialog exit.',
    contexts: ['modal', 'dialog', 'alert-dialog'],
  },
  'sheet-in': {
    properties: ['transform'],
    travel: 'large',
    reducedMotion: { properties: ['opacity'], ms: 250 },
    category: 'enter',
    sizeReasoning:
      'A sheet is a large spatial movement -- normal tier with the physical settle of a smooth spring, because the user must track it into place. Reduced motion becomes a cross-fade.',
    meaning: 'Sheet/drawer entrance.',
    contexts: ['sheet', 'drawer', 'side-panel'],
  },
  'sheet-out': {
    properties: ['transform'],
    travel: 'large',
    reducedMotion: { properties: ['opacity'], ms: 250 },
    category: 'exit',
    sizeReasoning:
      'The sheet exit -- normal tier (shorter than its slow entrance) with the departure curve.',
    meaning: 'Sheet/drawer exit.',
    contexts: ['sheet', 'drawer', 'side-panel'],
  },
  expand: {
    properties: ['grid-template-rows', 'opacity'],
    travel: 'medium',
    reducedMotion: { properties: ['opacity'] },
    category: 'enter',
    sizeReasoning:
      'Content unfolding to its natural height -- normal tier with the arrival curve. Transitions grid-template-rows (0fr->1fr), the transitionable stand-in for height:auto. Reduced motion snaps the rows and fades opacity.',
    meaning: 'Expand/reveal collapsible content (accordion, disclosure).',
    contexts: ['accordion', 'collapsible', 'disclosure'],
  },
  collapse: {
    properties: ['grid-template-rows', 'opacity'],
    travel: 'medium',
    reducedMotion: { properties: ['opacity'] },
    category: 'exit',
    sizeReasoning:
      'Content folding away -- moderate tier (shorter than its normal expansion) with the departure curve. Reduced motion snaps the rows.',
    meaning: 'Collapse/hide collapsible content (accordion, disclosure).',
    contexts: ['accordion', 'collapsible', 'disclosure'],
  },
  page: {
    properties: ['opacity', 'transform'],
    travel: 'large',
    reducedMotion: { properties: ['opacity'], ms: 200 },
    category: 'enter',
    sizeReasoning:
      'A whole-view transition -- normal tier with the physical settle of a smooth spring, because the user reorients across a large distance.',
    meaning: 'Page/route transition.',
    contexts: ['page-transition', 'route-change', 'view-switch'],
  },
};

// =============================================================================
// THE MOTION NAMESPACES: delay, extent, period
// =============================================================================

/**
 * Where a value came from. This is the field that keeps the system honest about
 * what it knows, and it is prose-only -- it flows into the token's `description`
 * and never becomes a `Token` field, because `TokenSchema` does not change here.
 *
 *   baseline  the July efficient baseline -- what the system already ships
 *   observed  read off working code (a literal a component hardcodes today)
 *   proposed  a starting point nobody has tuned against a real component yet
 *
 * There is deliberately no `measured` or `tuned` member: nothing in this file
 * has been through the knobs instrument, and a value that claims it has is worse
 * than no value at all.
 */
export type MotionValueProvenance = 'baseline' | 'observed' | 'proposed';

/**
 * One member of one motion namespace -- a LEAF. It carries a literal and nothing
 * derives from it, which is what makes retuning a leaf a one-line change to the
 * emitted sheet.
 */
export interface MotionNamespaceMemberDef {
  /** The CSS value, verbatim. */
  value: string;
  provenance: MotionValueProvenance;
  /** Why this value is this value, in the words of whoever put it here. */
  note: string;
  meaning: string;
  contexts: string[];
}

/**
 * DELAY -- the relationship namespace. How long the system waits before it
 * reacts, which is a statement about how eager it is.
 *
 * `hover-intent` is the only value here with a claim on reality: 200ms is what
 * navigation-menu hardcoded before #1995 made both it and tooltip read this
 * token through the runtime accessor (tooltip's own literal was 700). The rest are
 * PROPOSED -- a coherent starting point for the knobs instrument, not findings.
 */
export const DEFAULT_DELAY_NAMESPACE: Record<string, MotionNamespaceMemberDef> = {
  'hover-intent': {
    value: '200ms',
    provenance: 'observed',
    note: 'Observed in navigation-menu, which hardcoded it before #1995 routed both it and tooltip through the runtime accessor. Observed in working code, not tuned.',
    meaning:
      'How long a pointer must rest before the system believes the hover was meant. Long enough to survive a pass-through, short enough that a deliberate hover does not feel ignored.',
    contexts: ['tooltip', 'hover-card', 'navigation-menu'],
  },
  linger: {
    value: '300ms',
    provenance: 'proposed',
    note: 'PROPOSED. The grace window before a hovered surface closes, so a diagonal cursor path to a submenu does not dismiss it.',
    meaning: 'How long a surface stays after the pointer leaves, so a near-miss is forgiven.',
    contexts: ['hover-card', 'navigation-menu', 'submenu'],
  },
  'choreo-step': {
    value: '50ms',
    provenance: 'proposed',
    note: 'PROPOSED. The offset between two parts of ONE surface moving together (panel then its content).',
    meaning: 'The beat between choreographed parts of a single surface.',
    contexts: ['modal-content', 'panel-content', 'sequenced-parts'],
  },
  'stagger-step': {
    value: '0ms',
    provenance: 'proposed',
    note: 'PROPOSED, and zero is a value: efficient does not stagger lists. A non-zero stagger is a character choice a designer makes, not a default.',
    meaning: 'The per-item offset when a list animates in.',
    contexts: ['staggered-lists', 'sequential-elements'],
  },
  skip: {
    value: '300ms',
    provenance: 'proposed',
    note: 'PROPOSED. The warm-reopen window: reopen inside it and the entrance delay is skipped, because the user is already oriented.',
    meaning: 'How long a just-closed surface stays warm enough to reopen without ceremony.',
    contexts: ['tooltip-reopen', 'menu-reopen'],
  },
};

/**
 * EXTENT -- the geometry namespace. How FAR a thing moves, scales or draws.
 *
 * This namespace compresses out of every motion discussion because extents are
 * the hardest dimension to name, which is exactly why it is here: extents carry
 * half the personality. Every value below is PROPOSED. They are mechanically
 * coherent (a pop that does not read as a jump, a press that reads as pressure)
 * and none of them has been tuned against a real component.
 */
export const DEFAULT_EXTENT_NAMESPACE: Record<string, MotionNamespaceMemberDef> = {
  pop: {
    value: '0.95',
    provenance: 'proposed',
    note: 'PROPOSED. The scale a surface enters from. Close to 1 so the entrance reads as arrival rather than as a zoom.',
    meaning: 'How far a surface scales up as it arrives.',
    contexts: ['modal', 'popover', 'dialog'],
  },
  press: {
    value: '0.97',
    provenance: 'proposed',
    note: 'PROPOSED. Depression under a press. Smaller than `pop` because the finger is the evidence -- the motion only confirms it.',
    meaning: 'How far a control depresses when pressed.',
    contexts: ['button', 'toggle', 'press-feedback'],
  },
  draw: {
    value: '1',
    provenance: 'proposed',
    note: 'PROPOSED. The completed fraction of a drawn indicator. 1 is full travel; a value below it is a deliberately incomplete stroke.',
    meaning: 'How far an indicator draws along its track.',
    contexts: ['tabs-indicator', 'underline', 'progress-stroke'],
  },
};

/**
 * PERIOD -- the loop namespace. How long one cycle of a continuous animation
 * takes. No perceptual band governs these, because nothing is being tracked to a
 * destination; the system is working, not communicating a change.
 *
 * These loops are also the one thing reduced motion does NOT zero. A stopped
 * spinner says the work stopped. The ruling is that loops slow rather than stop
 * -- and the slowdown factor is deliberately absent below, because nobody has
 * tuned one and an invented multiplier would read as a finding.
 */
export const DEFAULT_PERIOD_NAMESPACE: Record<string, MotionNamespaceMemberDef> = {
  spin: {
    value: '1s',
    provenance: 'baseline',
    note: 'The shipped loop period of the spin animation.',
    meaning: 'One full rotation of a working indicator.',
    contexts: ['loading', 'spinner', 'refresh'],
  },
  pulse: {
    value: '2s',
    provenance: 'baseline',
    note: 'The shipped loop period of the pulse animation.',
    meaning: 'One breath of a skeleton or placeholder.',
    contexts: ['skeleton', 'loading-placeholder'],
  },
  blink: {
    value: '1.25s',
    provenance: 'baseline',
    note: 'The shipped loop period of the caret-blink animation.',
    meaning: 'One blink of a text caret.',
    contexts: ['input-caret', 'text-cursor'],
  },
  shimmer: {
    value: '2s',
    provenance: 'proposed',
    note: 'PROPOSED. No shimmer animation ships yet; the period is here because the namespace is a vocabulary, not a list of what happens to exist.',
    meaning: 'One sweep of a shimmer across a loading surface.',
    contexts: ['skeleton', 'loading-placeholder'],
  },
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
 * Bounds for a generated scale.
 *
 * A progression needs somewhere to start and somewhere to stop, and neither is
 * arithmetic -- both are decisions. They live here with every other default
 * rather than inside a generator, because the generators are pure functions
 * that receive their data, and a value buried in one is a value no designer
 * can reach.
 */
export interface ScaleBounds {
  /** Position 0. Nothing below it exists. */
  floor: number;
  /** Past this, a value is a layout decision rather than a scale position. */
  ceiling: number;
}

/**
 * Spacing is measured in multipliers of `baseSpacingUnit`, so its floor is 1 --
 * position 0 IS the base. The ceiling is in the same unit.
 */
export const DEFAULT_SPACING_BOUNDS: ScaleBounds = {
  floor: 1,
  ceiling: 96,
};

/**
 * Shadow is measured in pixels and starts BELOW the spacing floor, deliberately:
 * a blur thinner than a device pixel does not render, and anchoring shadow where
 * spacing starts would make the smallest shadow heavier than the default one.
 */
export const DEFAULT_SHADOW_BOUNDS: ScaleBounds = {
  floor: 1,
  ceiling: 96,
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
// TYPOGRAPHY COMPOSITE MAPPINGS
// =============================================================================

/**
 * Typography composite mapping definition.
 * Maps a semantic typography role to its properties -- family, size, weight, line-height, tracking.
 * The exporter generates @utility classes from these composites.
 */
export interface TypographyCompositeMapping {
  /** Font-family role reference: 'heading' | 'body' | 'code' */
  fontFamily: 'heading' | 'body' | 'code';
  /** Font size scale key, e.g. '4xl', 'sm', 'base' */
  fontSize: string;
  /** Font weight key, e.g. 'bold', 'semibold', 'thin' */
  fontWeight: string;
  /** Line height scale key, e.g. '4xl', 'sm', 'base' -- or named value like 'relaxed' */
  lineHeight: string;
  /** Letter spacing scale key, e.g. '4xl', 'sm', 'base' -- or named value like 'widest' */
  letterSpacing: string;
  /** Optional CQ-responsive size overrides */
  responsive?: {
    sm?: { fontSize?: string };
    md?: { fontSize?: string };
    lg?: { fontSize?: string };
  };
  /** Semantic meaning for MCP intelligence */
  meaning: string;
  /** Usage contexts */
  contexts: string[];
  /** Do patterns */
  do: string[];
  /** Never patterns */
  never: string[];
  /** Trust level */
  trustLevel?: 'low' | 'medium' | 'high' | 'critical';
  /** Consequence of misuse */
  consequence?: 'reversible' | 'significant' | 'permanent' | 'destructive';
}

/**
 * Component consumers for each typography role.
 * Used for applicableComponents metadata on generated tokens.
 */
export const TYPOGRAPHY_ROLE_CONSUMERS: Record<string, string[]> = {
  'display-large': ['hero'],
  'display-medium': ['h1'],
  'title-large': ['h2'],
  'title-medium': [
    'h3',
    'card-title',
    'dialog-title',
    'sheet-title',
    'drawer-title',
    'empty-title',
    'alert-dialog-title',
  ],
  'title-small': ['h4', 'alert-title', 'accordion-trigger'],
  'body-large': ['lead'],
  'body-medium': ['p', 'list-item', 'blockquote', 'accordion-content'],
  'body-small': [
    'card-description',
    'dialog-description',
    'sheet-description',
    'alert-description',
    'field-description',
    'tooltip',
    'menu-item',
    'table-cell',
    'input',
    'select',
    'textarea',
  ],
  'label-large': ['button', 'tab-trigger', 'nav-trigger', 'toggle', 'pagination-link'],
  'label-medium': ['label', 'breadcrumb', 'button-sm', 'sidebar-item'],
  'label-small': ['badge', 'sidebar-label', 'caption', 'command-group-heading'],
  'code-large': ['code-block'],
  'code-small': ['code-inline', 'kbd'],
  shortcut: ['keyboard-shortcut'],
};

/**
 * Default typography composite mappings.
 * Single source of truth for all typography role definitions.
 * The exporter reads these to generate @utility classes.
 */
export const DEFAULT_TYPOGRAPHY_COMPOSITE_MAPPINGS: Record<string, TypographyCompositeMapping> = {
  'display-large': {
    fontFamily: 'heading',
    fontSize: '5xl',
    fontWeight: 'bold',
    lineHeight: '5xl',
    letterSpacing: '5xl',
    responsive: { lg: { fontSize: '6xl' } },
    meaning: 'Largest display text for hero sections and landing pages',
    contexts: ['hero-heading', 'landing-page'],
    do: ['Use sparingly for maximum visual impact', 'Pair with ample whitespace'],
    never: ['Use more than once per page', 'Use in constrained containers like cards'],
    trustLevel: 'high',
    consequence: 'reversible',
  },
  'display-medium': {
    fontFamily: 'heading',
    fontSize: '4xl',
    fontWeight: 'bold',
    lineHeight: '4xl',
    letterSpacing: '4xl',
    responsive: { lg: { fontSize: '5xl' } },
    meaning: 'Primary page heading -- one per page',
    contexts: ['page-title', 'h1'],
    do: ['Use once per page for the main title', 'Place at the top of the content area'],
    never: ['Use multiple times on a single page', 'Use inside cards or dialogs'],
    trustLevel: 'high',
    consequence: 'reversible',
  },
  'title-large': {
    fontFamily: 'heading',
    fontSize: '3xl',
    fontWeight: 'semibold',
    lineHeight: '3xl',
    letterSpacing: '3xl',
    meaning: 'Major section heading',
    contexts: ['section-title', 'h2'],
    do: ['Use to divide major content sections', 'Maintain heading hierarchy (h1 > h2 > h3)'],
    never: ['Skip heading levels (h1 then h3)', 'Use for decorative emphasis'],
    trustLevel: 'medium',
    consequence: 'reversible',
  },
  'title-medium': {
    fontFamily: 'heading',
    fontSize: 'lg',
    fontWeight: 'semibold',
    lineHeight: 'lg',
    letterSpacing: 'lg',
    meaning: 'Component and subsection title -- shared by card, dialog, sheet, drawer, empty state',
    contexts: ['h3', 'card-title', 'dialog-title', 'sheet-title', 'drawer-title', 'empty-title'],
    do: ['Use for component-level headings', 'Use consistently across all overlay and card titles'],
    never: ['Mix with other title sizes in the same component', 'Override without why-gate'],
    trustLevel: 'medium',
    consequence: 'reversible',
  },
  'title-small': {
    fontFamily: 'heading',
    fontSize: 'base',
    fontWeight: 'semibold',
    lineHeight: 'base',
    letterSpacing: 'base',
    meaning: 'Minor heading and alert title',
    contexts: ['h4', 'alert-title', 'accordion-trigger'],
    do: ['Use for subsections within a card or panel', 'Use for alert and accordion headings'],
    never: ['Use as the primary heading on a page'],
    trustLevel: 'medium',
    consequence: 'reversible',
  },
  'body-large': {
    fontFamily: 'body',
    fontSize: 'xl',
    fontWeight: 'normal',
    lineHeight: 'xl',
    letterSpacing: 'xl',
    meaning: 'Lead paragraph and introductory text',
    contexts: ['lead', 'introduction', 'hero-body'],
    do: ['Use for the first paragraph of a section', 'Use for hero body copy'],
    never: ['Use for all body text', 'Use in compact UI like sidebars'],
    trustLevel: 'low',
    consequence: 'reversible',
  },
  'body-medium': {
    fontFamily: 'body',
    fontSize: 'base',
    fontWeight: 'normal',
    lineHeight: 'base',
    letterSpacing: 'base',
    meaning: 'Default body text for paragraphs and content',
    contexts: ['paragraph', 'body-text', 'list-item', 'blockquote', 'accordion-content'],
    do: ['Use for all standard body content', 'Ensure sufficient contrast against background'],
    never: ['Use for labels or UI chrome', 'Set below 1rem'],
    trustLevel: 'low',
    consequence: 'reversible',
  },
  'body-small': {
    fontFamily: 'body',
    fontSize: 'sm',
    fontWeight: 'normal',
    lineHeight: 'sm',
    letterSpacing: 'sm',
    meaning: 'Secondary text -- descriptions, tooltips, menu items, table cells',
    contexts: ['description', 'tooltip', 'menu-item', 'table-cell', 'input-text', 'helper-text'],
    do: ['Use for supplementary information', 'Use for compact UI elements like menus and tables'],
    never: ['Use for primary content that users must read', 'Set below 0.875rem for body text'],
    trustLevel: 'low',
    consequence: 'reversible',
  },
  'label-large': {
    fontFamily: 'body',
    fontSize: 'base',
    fontWeight: 'medium',
    lineHeight: 'base',
    letterSpacing: 'base',
    meaning: 'Interactive element text -- buttons, tabs, nav triggers, toggles',
    contexts: ['button', 'tab-trigger', 'nav-trigger', 'toggle', 'pagination'],
    do: ['Use for primary interactive controls', 'Ensure touch target meets 24px minimum'],
    never: ['Use for passive content', 'Mix with body text styling'],
    trustLevel: 'medium',
    consequence: 'reversible',
  },
  'label-medium': {
    fontFamily: 'body',
    fontSize: 'sm',
    fontWeight: 'medium',
    lineHeight: 'sm',
    letterSpacing: 'sm',
    meaning: 'Form labels, breadcrumbs, small buttons, sidebar items',
    contexts: ['label', 'breadcrumb', 'small-button', 'sidebar-item'],
    do: ['Use for form field labels', 'Use for secondary navigation'],
    never: ['Use for headings', 'Use for primary call-to-action buttons'],
    trustLevel: 'low',
    consequence: 'reversible',
  },
  'label-small': {
    fontFamily: 'body',
    fontSize: 'xs',
    fontWeight: 'medium',
    lineHeight: 'xs',
    letterSpacing: 'xs',
    meaning: 'Smallest label text -- badges, sidebar labels, captions',
    contexts: ['badge', 'sidebar-label', 'caption', 'command-group-heading'],
    do: ['Use only for tertiary UI information', 'Ensure adequate contrast at small size'],
    never: ['Use for content users must read to complete a task', 'Set below 0.75rem'],
    trustLevel: 'low',
    consequence: 'reversible',
  },
  'code-large': {
    fontFamily: 'code',
    fontSize: 'base',
    fontWeight: 'normal',
    lineHeight: 'base',
    letterSpacing: 'base',
    meaning: 'Code blocks and pre-formatted text',
    contexts: ['code-block', 'pre', 'terminal-output'],
    do: ['Use for multi-line code content', 'Pair with syntax highlighting'],
    never: ['Use for inline code snippets', 'Use for non-code content'],
    trustLevel: 'low',
    consequence: 'reversible',
  },
  'code-small': {
    fontFamily: 'code',
    fontSize: 'sm',
    fontWeight: 'normal',
    lineHeight: 'sm',
    letterSpacing: 'sm',
    meaning: 'Inline code and keyboard key indicators',
    contexts: ['code-inline', 'kbd', 'technical-term'],
    do: ['Use for code references within prose', 'Use for keyboard shortcut labels'],
    never: ['Use for multi-line code blocks', 'Use for body text'],
    trustLevel: 'low',
    consequence: 'reversible',
  },
  shortcut: {
    fontFamily: 'code',
    fontSize: 'xs',
    fontWeight: 'normal',
    lineHeight: 'xs',
    letterSpacing: 'widest',
    meaning: 'Keyboard shortcut indicators in menus',
    contexts: ['keyboard-shortcut', 'command-shortcut', 'menu-shortcut'],
    do: ['Use for keyboard shortcut text in menus and command palettes'],
    never: ['Use for regular text content', 'Use outside of menu/command contexts'],
    trustLevel: 'low',
    consequence: 'reversible',
  },
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
  // NEUTRAL ROLE
  // ============================================================================
  neutral: {
    light: { family: 'zinc', position: '500' },
    dark: { family: 'zinc', position: '400' },
    meaning: 'Neutral base family for surfaces, text, and borders',
    contexts: ['surfaces', 'text', 'borders', 'chrome'],
    do: ['Assign a low-chroma or achromatic palette as the neutral role'],
    never: ['Use a saturated palette as neutral'],
  },

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
    dark: { family: 'neutral', position: '700' },
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
    dark: { family: 'neutral', position: '600' },
    meaning: 'Card hover state background',
    contexts: ['card-hover'],
    do: ['Use for card hover states'],
    never: ['Use as default card background'],
  },
  'card-border': {
    light: { family: 'neutral', position: '200' },
    dark: { family: 'neutral', position: '500' },
    meaning: 'Card border color',
    contexts: ['card-borders'],
    do: ['Use for card borders'],
    never: ['Use for dividers within cards'],
  },
  panel: {
    light: { family: 'neutral', position: '200' },
    dark: { family: 'neutral', position: '800' },
    meaning: 'Persistent elevated chrome -- headers, docks, fixed toolbars',
    contexts: ['panels', 'toolbars', 'headers', 'docks'],
    do: ['Use for persistent elevated chrome', 'Pair with panel-foreground'],
    never: ['Use for page-level backgrounds', 'Use for transient surfaces'],
  },
  'panel-foreground': {
    light: { family: 'neutral', position: '950' },
    dark: { family: 'neutral', position: '50' },
    meaning: 'Text and icons on panel surfaces',
    contexts: ['panel-text'],
    do: ['Use on panel backgrounds'],
    never: ['Use on page background'],
  },
  'panel-hover': {
    light: { family: 'neutral', position: '200' },
    dark: { family: 'neutral', position: '700' },
    meaning: 'Panel surface hover state',
    contexts: ['panel-interaction'],
    do: ['Use for hoverable panel regions'],
    never: ['Use as a resting surface'],
  },
  'panel-border': {
    light: { family: 'neutral', position: '200' },
    dark: { family: 'neutral', position: '600' },
    meaning: 'Borders separating panel from surrounding surfaces',
    contexts: ['panel-edges'],
    do: ['Use to delimit panels'],
    never: ['Use as text color'],
  },

  // Popover surfaces
  popover: {
    light: { family: 'neutral', position: '50' },
    dark: { family: 'neutral', position: '700' },
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
    light: { family: 'neutral', position: '100' },
    dark: { family: 'neutral', position: '900' },
    meaning: 'Base chrome surface -- toolbars, app shell, UI frame',
    contexts: ['chrome', 'app-shell', 'toolbars'],
    do: ['Use for application chrome'],
    never: ['Use for page background', 'Use for content containers'],
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
  'secondary-subtle': {
    light: { family: 'neutral', position: '100' },
    dark: { family: 'neutral', position: '900' },
    meaning: 'Subtle secondary background for badges/alerts',
    contexts: ['secondary-badges', 'secondary-alerts'],
    do: ['Use for subtle secondary backgrounds'],
    never: ['Use for secondary buttons'],
  },
  'secondary-subtle-foreground': {
    light: { family: 'neutral', position: '900' },
    dark: { family: 'neutral', position: '100' },
    meaning: 'Text on subtle secondary backgrounds',
    contexts: ['secondary-subtle-text'],
    do: ['Use for text on subtle secondary'],
    never: ['Use without secondary-subtle background'],
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
  'accent-subtle': {
    light: { family: 'neutral', position: '100' },
    dark: { family: 'neutral', position: '900' },
    meaning: 'Subtle accent background for badges/alerts',
    contexts: ['accent-badges', 'accent-alerts'],
    do: ['Use for subtle accent backgrounds'],
    never: ['Use for accent buttons'],
  },
  'accent-subtle-foreground': {
    light: { family: 'neutral', position: '900' },
    dark: { family: 'neutral', position: '100' },
    meaning: 'Text on subtle accent backgrounds',
    contexts: ['accent-subtle-text'],
    do: ['Use for text on subtle accent'],
    never: ['Use without accent-subtle background'],
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
    light: { family: 'neutral', position: '100' },
    dark: { family: 'neutral', position: '900' },
    meaning: 'Sidebar background -- almost on the surface',
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
    dark: { family: 'neutral', position: '900' },
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
    dark: { family: 'neutral', position: '900' },
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
    dark: { family: 'neutral', position: '800' },
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
