/**
 * Tailwind v4 CSS Exporter
 *
 * Converts TokenRegistry contents to Tailwind v4 CSS format with:
 * - @theme block for raw color scales
 * - :root --rafters-* namespace tokens (light/dark mode)
 * - Semantic variables that switch via .dark class (Tailwind v4 @custom-variant)
 * - @theme inline bridge pattern
 *
 * Semantic color mappings come from the registry -- the exporter only outputs what the registry contains.
 *
 * @see https://tailwindcss.com/docs/theme
 * @see https://ui.shadcn.com/docs/theming
 */

import * as csstree from 'css-tree';
import type { ColorReference, ColorValue, Token, TypographyElementOverride } from '@rafters/shared';
import type { MotionNamespace } from '../generators/motion.js';
import type { TokenRegistry } from '../registry.js';

/**
 * Options for Tailwind CSS export
 */
export interface TailwindExportOptions {
  /** Include comments with token metadata (default: false) */
  includeComments?: boolean;
  /** Include @import "tailwindcss" at top */
  includeImport?: boolean;
  /** Dark mode strategy: 'class' (.dark class toggle) or 'media' (OS preference). Default: 'class' */
  darkMode?: 'class' | 'media';
}

const SHADOW_PART_SUFFIX = /-(offset-x|offset-y|blur|spread|color)$/;

/**
 * THE FIVE MOTION NAMESPACES (ruling 019fc49f, issue #1991).
 *
 * Each member is emitted as one `--rafters-<namespace>-<member>` custom property
 * carrying a LITERAL, plus one `@utility <namespace>-<member>` block that
 * references it by NAME. That split is the whole mechanism:
 *
 *   - the var is the only place a motion value exists, so Studio retuning one
 *     leaf changes exactly one line of the emitted sheet;
 *   - the utility never contains a value, so every @utility block is
 *     byte-identical across a retune. One fast, everywhere, always.
 *
 * We generate these blocks ourselves rather than leaning on Tailwind theme
 * inference, because NONE of the five is a Tailwind v4 theme namespace --
 * `duration-*` takes bare numbers (the #1955 trap: `duration-moderate` reads as
 * correct and compiles to nothing), and `delay-*`, `extent-*` and `period-*` are
 * not namespaces at all. `ease-*` is the single exception, and it gets an
 * explicit block anyway so all five behave identically.
 */
const MOTION_NAMESPACE_PROPERTY = {
  duration: 'transition-duration',
  ease: 'transition-timing-function',
  delay: 'transition-delay',
  // Extents are consumed inside transforms, so the utility publishes the chosen
  // extent under a fixed name the consuming rule reads. The name comes from toy
  // 9 (worktree-toy-motion-registry).
  //
  // THIS IS THE UTILITY-SIDE CONTRACT, and it is one of TWO (#2017). A CLASS
  // picks an extent by naming a member (`extent-pop`) and the rule downstream
  // reads `--rafters-consumed-extent` without knowing which member won.
  // KEYFRAME BODIES DO NOT USE THIS ALIAS: they are generator-owned emission and
  // reference the LEAF directly (`var(--rafters-extent-pop)`, see
  // DEFAULT_KEYFRAME_DEFINITIONS). A shape is not a function of whatever extent
  // the consuming class last selected. Do not merge the two contracts.
  extent: '--rafters-consumed-extent',
  period: 'animation-duration',
} as const satisfies Record<MotionNamespace, string>;

// The exporter never imports generator RUNTIME (registry-in, not
// generator-internals-in), but the namespace SET must not be re-declarable by
// hand: `satisfies Record<MotionNamespace, string>` fails the build the moment
// the generator's union gains or loses a member this map does not mirror, and
// the token regex below derives from the map so it cannot drift separately.
const MOTION_NAMESPACE_NAMES = Object.keys(MOTION_NAMESPACE_PROPERTY) as readonly MotionNamespace[];

/**
 * Namespaces the reduced-motion law zeroes.
 *
 * Under `prefers-reduced-motion: reduce` every duration and every delay resolves
 * to zero. `period` is deliberately absent: loops slow, they never stop, because
 * a stopped spinner says the work stopped. No slowdown factor is written here --
 * nobody has tuned one, and an invented multiplier would read as a finding.
 * `ease` and `extent` are absent because zeroing the duration already removes
 * the motion they shape.
 */
const REDUCED_MOTION_ZEROED: ReadonlySet<MotionNamespace> = new Set(['duration', 'delay']);

const MOTION_NAMESPACE_TOKEN = new RegExp(`^rafters-(${MOTION_NAMESPACE_NAMES.join('|')})-(.+)$`);

/** Split a `rafters-<ns>-<member>` token name, or null if it is not one. */
function motionNamespaceParts(name: string): { namespace: MotionNamespace; member: string } | null {
  const match = MOTION_NAMESPACE_TOKEN.exec(name);
  if (!match?.[1] || !match[2]) return null;
  return { namespace: match[1] as MotionNamespace, member: match[2] };
}

/** Check if a shadow token name is a decomposed part rather than a composite */
function isShadowDecomposedPart(name: string): boolean {
  return SHADOW_PART_SUFFIX.test(name);
}

/** Check if a breakpoint token is a media query condition, not a dimension */
function isMediaQueryToken(token: Token): boolean {
  return typeof token.value === 'string' && token.value.startsWith('(');
}

/**
 * Group tokens by their namespace
 */
interface GroupedTokens {
  semantic: Token[];
  color: Token[];
  spacing: Token[];
  typography: Token[];
  radius: Token[];
  shadow: Token[];
  depth: Token[];
  motion: Token[];
  breakpoint: Token[];
  focus: Token[];
  'typography-composite': Token[];
  other: Token[];
}

/**
 * Build semantic mappings from actual tokens in the registry.
 * Tokens not present are omitted from output.
 *
 * @param semanticTokens - Semantic tokens from the registry
 * @returns { light: 'neutral-50', dark: 'neutral-950' } format
 */
function getSemanticMappingsFromTokens(
  semanticTokens: Token[],
): Record<string, { light: string; dark: string }> {
  const mappings: Record<string, { light: string; dark: string }> = {};
  const tokensByName = new Map<string, Token>();
  for (const t of semanticTokens) tokensByName.set(t.name, t);

  for (const token of semanticTokens) {
    const { name, value, dependsOn } = token;

    if (name.endsWith('--dark')) continue;

    if (typeof value !== 'object' || value === null || !('family' in value)) {
      continue;
    }

    const colorRef = value as ColorReference;
    const lightRef = `${colorRef.family}-${colorRef.position}`;

    let darkRef = lightRef;
    const darkTokenName = dependsOn?.[1];
    if (darkTokenName) {
      const darkToken = tokensByName.get(darkTokenName);
      if (darkToken?.value && typeof darkToken.value === 'object' && 'family' in darkToken.value) {
        const darkColorRef = darkToken.value as ColorReference;
        darkRef = `${darkColorRef.family}-${darkColorRef.position}`;
      }
    }

    mappings[name] = { light: lightRef, dark: darkRef };
  }

  return mappings;
}

/**
 * Convert a token value to CSS string.
 * Returns null for values that cannot be represented as CSS (e.g. JSON objects/arrays).
 */
function tokenValueToCSS(token: Token): string | null {
  const { value } = token;

  // String values pass through, but skip JSON object/array strings
  if (typeof value === 'string') {
    if (value.startsWith('{') || value.startsWith('[')) {
      return null;
    }
    return value;
  }

  // ColorValue - convert OKLCH to CSS
  if (typeof value === 'object' && value !== null) {
    if ('scale' in value) {
      const colorValue = value as ColorValue;
      // Return OKLCH string for the base color (position 500 = index 5)
      const baseColor = colorValue.scale[5];
      if (baseColor) {
        return `oklch(${formatNumber(baseColor.l)} ${formatNumber(baseColor.c)} ${formatNumber(baseColor.h)})`;
      }
    }
    // ColorReference - return as var() reference
    if ('family' in value && 'position' in value) {
      const ref = value as ColorReference;
      return `var(--color-${ref.family}-${ref.position})`;
    }
  }

  return String(value);
}

/**
 * Format a number for CSS output
 */
function formatNumber(value: number, decimals = 3): string {
  return Number(value.toFixed(decimals)).toString();
}

/**
 * Group tokens by namespace
 */
function groupTokens(tokens: Token[]): GroupedTokens {
  const groups: GroupedTokens = {
    semantic: [],
    color: [],
    spacing: [],
    typography: [],
    radius: [],
    shadow: [],
    depth: [],
    motion: [],
    breakpoint: [],
    focus: [],
    'typography-composite': [],
    other: [],
  };

  for (const token of tokens) {
    switch (token.namespace) {
      case 'semantic':
        groups.semantic.push(token);
        break;
      case 'color':
        groups.color.push(token);
        break;
      case 'spacing':
        groups.spacing.push(token);
        break;
      case 'typography':
        groups.typography.push(token);
        break;
      case 'radius':
        groups.radius.push(token);
        break;
      case 'shadow':
        groups.shadow.push(token);
        break;
      case 'depth':
        groups.depth.push(token);
        break;
      case 'motion':
        groups.motion.push(token);
        break;
      case 'breakpoint':
        groups.breakpoint.push(token);
        break;
      case 'focus':
        groups.focus.push(token);
        break;
      case 'typography-composite':
        groups['typography-composite'].push(token);
        break;
      default:
        groups.other.push(token);
    }
  }

  return groups;
}

/**
 * Generate @theme inline block for semantic color bridges
 * These reference :root variables and must use @theme inline for dynamic resolution
 * @see https://tailwindcss.com/docs/theme#using-custom-values
 */
function generateThemeInlineBlock(semanticTokens: Token[]): string {
  const semanticMappings = getSemanticMappingsFromTokens(semanticTokens);
  const lines: string[] = [];
  lines.push('@theme inline {');

  // Semantic color bridges (reference :root variables)
  for (const name of Object.keys(semanticMappings)) {
    lines.push(`  --color-${name}: var(--${name});`);
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * Generate :root block with --rafters-* namespace and dark mode via .dark class
 * Reads semantic mappings from actual tokens in the registry.
 */
function generateRootBlock(semanticTokens: Token[], darkMode: 'class' | 'media' = 'class'): string {
  const semanticMappings = getSemanticMappingsFromTokens(semanticTokens);
  const lines: string[] = [];
  lines.push(':root, :host {');

  // Light mode --rafters-* tokens
  for (const [name, mapping] of Object.entries(semanticMappings)) {
    lines.push(`  --rafters-${name}: var(--color-${mapping.light});`);
  }

  lines.push('');

  // Dark mode --rafters-dark-* tokens
  for (const [name, mapping] of Object.entries(semanticMappings)) {
    lines.push(`  --rafters-dark-${name}: var(--color-${mapping.dark});`);
  }

  lines.push('');

  // Semantic tokens default to light mode
  for (const name of Object.keys(semanticMappings)) {
    lines.push(`  --${name}: var(--rafters-${name});`);
  }

  lines.push('}');
  lines.push('');

  if (darkMode === 'class') {
    // Tailwind v4 custom variant for class-based dark mode
    lines.push('@custom-variant dark (&:where(.dark, .dark *));');
    lines.push('');

    // Dark mode via .dark class
    lines.push('.dark {');
  } else {
    // Dark mode via OS preference
    lines.push('@media (prefers-color-scheme: dark) {');
    lines.push('  :root {');
  }

  for (const name of Object.keys(semanticMappings)) {
    const indent = darkMode === 'media' ? '    ' : '  ';
    lines.push(`${indent}--${name}: var(--rafters-dark-${name});`);
  }

  if (darkMode === 'media') {
    lines.push('  }');
  }
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate @theme block with raw color scales and utility tokens
 * Note: Semantic color bridges are NOT included here - they go in @theme inline
 */
function generateThemeBlock(groups: GroupedTokens): string {
  const lines: string[] = [];
  lines.push('@theme {');

  if (groups.color.length > 0) {
    for (const token of groups.color) {
      const value = tokenValueToCSS(token);
      if (value === null) continue;
      lines.push(`  --color-${token.name}: ${value};`);
    }
    lines.push('');
  }

  // Spacing tokens -- Tailwind v4 reads --spacing-* for p-*, m-*, gap-*
  // Token values reference var(--rafters-spacing-base) for the :root layer,
  // but @theme needs var(--spacing-base) since that's the @theme variable name
  if (groups.spacing.length > 0) {
    for (const token of groups.spacing) {
      const value = tokenValueToCSS(token);
      if (value === null) continue;
      const key = token.name.replace(/^spacing-/, '');
      const themeValue = value.replaceAll('var(--rafters-spacing-base)', 'var(--spacing-base)');
      lines.push(`  --spacing-${key}: ${themeValue};`);
    }
    lines.push('');
  }

  // Typography tokens
  if (groups.typography.length > 0) {
    for (const token of groups.typography) {
      const value = tokenValueToCSS(token);
      if (value === null) continue;
      lines.push(`  --${token.name}: ${value};`);
      if (token.lineHeight) {
        lines.push(`  --${token.name}--line-height: ${token.lineHeight};`);
      }
      // Tailwind v4 reads --leading-* as a NAMED theme namespace for the
      // leading-* utility (leading-tight, leading-relaxed, ...). The registry
      // names these tokens line-height-*, so bridge to the Tailwind-native
      // name here -- same stripped-prefix pattern as --spacing-* / --radius-*
      // below. Additive: --line-height-* keeps carrying its existing meaning
      // (the font-size-*--line-height pairing) for whatever already reads it.
      if (token.name.startsWith('line-height-')) {
        const key = token.name.replace(/^line-height-/, '');
        lines.push(`  --leading-${key}: ${value};`);
      }
    }
    lines.push('');
  }

  // Radius tokens -- Tailwind v4 reads --radius-* for rounded-*
  // Rewrite internal var names to @theme names: radius-base derives from
  // spacing-base (#2035), so the spacing reference must also be rewritten.
  if (groups.radius.length > 0) {
    for (const token of groups.radius) {
      const value = tokenValueToCSS(token);
      if (value === null) continue;
      const key = token.name.replace(/^radius-/, '');
      const themeValue = value
        .replaceAll('var(--rafters-spacing-base)', 'var(--spacing-base)')
        .replaceAll('var(--rafters-radius-base)', 'var(--radius-base)')
        .replaceAll('var(--rafters-radius-tl)', 'var(--radius-tl)')
        .replaceAll('var(--rafters-radius-tr)', 'var(--radius-tr)')
        .replaceAll('var(--rafters-radius-bl)', 'var(--radius-bl)')
        .replaceAll('var(--rafters-radius-br)', 'var(--radius-br)');
      lines.push(`  --radius-${key}: ${themeValue};`);
    }
    lines.push('');
  }

  // Shadow tokens -- Tailwind v4 reads --shadow-* for shadow-*
  // Decomposed parts are emitted as --rafters-* (not --shadow-*) so composite
  // tokens can reference them via var(--rafters-shadow-offset-x) etc.
  if (groups.shadow.length > 0) {
    for (const token of groups.shadow) {
      const value = tokenValueToCSS(token);
      if (value === null) continue;
      if (isShadowDecomposedPart(token.name)) {
        // Decomposed parts: --rafters-* only, no Tailwind utility
        lines.push(`  --rafters-${token.name}: ${value};`);
      } else {
        // Composites: --shadow-* for Tailwind utility generation
        const key = token.name.replace(/^shadow-/, '');
        lines.push(`  --shadow-${key}: ${value};`);
      }
    }
    lines.push('');
  }

  // Depth (z-index) tokens
  if (groups.depth.length > 0) {
    for (const token of groups.depth) {
      const value = tokenValueToCSS(token);
      if (value === null) continue;
      lines.push(`  --${token.name}: ${value};`);
    }
    lines.push('');
  }

  // The five motion namespaces -- the system LEAVES. These carry the literals.
  const motionNamespaceLines = generateMotionNamespaceVars(groups.motion);
  if (motionNamespaceLines) {
    lines.push(motionNamespaceLines);
    lines.push('');
  }

  // Motion tokens (raw values for non-duration/easing)
  if (groups.motion.length > 0) {
    for (const token of groups.motion) {
      // Duration and easing tokens get special Tailwind-native names below
      if (token.name.startsWith('motion-duration-') && token.name !== 'motion-duration-base')
        continue;
      if (token.name.startsWith('motion-easing-')) continue;
      if (motionNamespaceParts(token.name)) continue;
      const value = tokenValueToCSS(token);
      if (value === null) continue;
      lines.push(`  --${token.name}: ${value};`);
    }
    lines.push('');
  }

  // The Tailwind-facing duration/ease names, as REFERENCES to the leaves above.
  const bridgeLines = generateMotionBridgeVars(groups.motion);
  if (bridgeLines) {
    lines.push(bridgeLines);
    lines.push('');
  }

  // Breakpoint tokens (exclude media query tokens -- their values are
  // conditions like "(prefers-reduced-motion: reduce)", not dimensions,
  // and Tailwind would generate invalid CSS like @media (width >= ...))
  if (groups.breakpoint.length > 0) {
    for (const token of groups.breakpoint) {
      const value = tokenValueToCSS(token);
      if (value === null) continue;
      if (isMediaQueryToken(token)) continue;
      lines.push(`  --${token.name}: ${value};`);
    }
    lines.push('');
  }

  // Focus tokens -- focus-ring-width derives from spacing-base (#2035),
  // and per-config tokens chain through focus-ring-width.
  if (groups.focus.length > 0) {
    for (const token of groups.focus) {
      const value = tokenValueToCSS(token);
      if (value === null) continue;
      const themeValue = value
        .replaceAll('var(--rafters-spacing-base)', 'var(--spacing-base)')
        .replaceAll('var(--rafters-focus-ring-width)', 'var(--focus-ring-width)');
      lines.push(`  --${token.name}: ${themeValue};`);
    }
    lines.push('');
  }

  // Other tokens
  if (groups.other.length > 0) {
    for (const token of groups.other) {
      const value = tokenValueToCSS(token);
      if (value === null) continue;
      lines.push(`  --${token.name}: ${value};`);
    }
    lines.push('');
  }

  // Animation utility tokens (from motion-animation-* tokens)
  const animationTokens = generateAnimationTokens(groups.motion);
  if (animationTokens) {
    lines.push(animationTokens);
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * Article element type system - maps HTML elements to @apply utility compositions
 *
 * Each entry is [selector, utilityClasses]. The utilities reference design tokens
 * (font sizes, weights, spacing, colors, leading, tracking) that are already in @theme.
 * The exporter composes them here; the tokens are the atomic values.
 */
const ARTICLE_ELEMENT_STYLES: Array<[string, string]> = [
  // Paragraphs -- composition for metrics, structural for spacing
  ['p', 'text-body-medium ts-body-medium leading-relaxed mb-4'],
  ['p:last-child', 'mb-0'],

  // Headings -- compositions carry size/weight/tracking/leading/family
  ['h1', 'text-display-medium ts-display-medium mb-4 mt-0 text-accent-foreground'],
  ['h2', 'text-title-large ts-title-large mb-3 mt-8 text-accent-foreground'],
  ['h2:first-child', 'mt-0'],
  ['h3', 'text-title-medium ts-title-medium mb-2 mt-6 text-accent-foreground'],
  ['h4', 'text-title-small ts-title-small mb-2 mt-4 text-accent-foreground'],
  ['h5', 'text-title-small ts-title-small mb-2 mt-4 text-accent-foreground'],
  ['h6', 'text-title-small ts-title-small mb-2 mt-4 text-accent-foreground'],

  // Lists -- structural only (type metrics cascade from parent)
  ['ul', 'list-disc pl-6 mb-4'],
  ['ol', 'list-decimal pl-6 mb-4'],
  ['li', 'mb-1'],
  ['li > ul,\n  article li > ol', 'mt-1 mb-0'],

  // Links
  ['a', 'text-primary underline underline-offset-4'],
  ['a:hover', 'text-primary/80'],

  // Blockquotes
  ['blockquote', 'border-l-4 border-muted pl-4 italic my-4'],

  // Code -- composition for metrics + family, structural for bg/padding/radius
  ['code', 'text-code-small ts-code-small bg-muted px-1.5 py-0.5 rounded'],
  ['pre', 'text-code-large ts-code-large bg-muted p-4 rounded-lg overflow-x-auto my-4'],
  ['pre code', 'bg-transparent p-0 rounded-none text-[inherit]'],
  ['kbd', 'text-code-small ts-code-small bg-muted border border-border rounded px-1.5 py-0.5'],

  // Horizontal rules
  ['hr', 'border-border my-8'],

  // Media
  ['img', 'rounded-lg my-4 max-w-full h-auto'],
  ['video', 'rounded-lg my-4 max-w-full h-auto'],

  // Tables
  ['table', 'w-full my-4 border-collapse'],
  ['caption', 'text-label-small ts-label-small mt-2 text-muted-foreground text-left'],
  ['th', 'border border-border px-3 py-2 text-left font-semibold'],
  ['td', 'border border-border px-3 py-2'],

  // Figures
  ['figure', 'my-4'],
  ['figcaption', 'text-label-small ts-label-small mt-2 text-muted-foreground'],

  // Definition lists
  ['dl', 'my-4'],
  ['dt', 'font-semibold mt-2'],
  ['dd', 'pl-4 mb-2'],

  // Details/Summary
  ['details', 'my-4'],
  ['summary', 'cursor-pointer font-semibold'],

  // Inline formatting
  ['strong,\n  article b', 'font-semibold'],
  ['mark', 'bg-accent text-accent-foreground px-1 rounded'],
  ['small', 'text-label-small ts-label-small'],
  ['sub', 'text-xs align-sub'],
  ['sup', 'text-xs align-super'],
  ['abbr[title]', 'underline decoration-dotted underline-offset-4 cursor-help'],
  ['s,\n  article del', 'line-through'],
  ['ins', 'underline'],
];

/**
 * Generate @layer base block with article type system
 *
 * Composes design token utilities via @apply for all HTML content elements
 * inside <article>. Every class referenced here is backed by a design token
 * in @theme - font sizes, weights, leading, tracking, spacing, colors.
 */
function generateArticleBaseLayer(): string {
  const lines: string[] = [];
  lines.push('@layer base {');

  for (const [selector, utilities] of ARTICLE_ELEMENT_STYLES) {
    // Compound selectors already contain "article" for second+ parts
    if (selector.includes('\n')) {
      lines.push(`  article ${selector} {`);
    } else {
      lines.push(`  article ${selector} {`);
    }
    lines.push(`    @apply ${utilities};`);
    lines.push('  }');
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * Generate @keyframes from motion-keyframe-* tokens
 */
function generateKeyframes(motionTokens: Token[]): string {
  const keyframeTokens = motionTokens.filter((t) => t.name.startsWith('motion-keyframe-'));

  if (keyframeTokens.length === 0) {
    return '';
  }

  const lines: string[] = [];

  for (const token of keyframeTokens) {
    const keyframeName = token.keyframeName || token.name.replace('motion-keyframe-', '');
    lines.push(`@keyframes ${keyframeName} {`);
    lines.push(`  ${token.value}`);
    lines.push('}');
    lines.push('');
  }

  return lines.join('\n').trim();
}

/**
 * Generate animation utility tokens for @theme block from motion-animation-* tokens
 * These create --animate-* tokens that can be used with Tailwind's animate-* utilities
 */
function generateAnimationTokens(motionTokens: Token[]): string {
  const animationTokens = motionTokens.filter((t) => t.name.startsWith('motion-animation-'));

  if (animationTokens.length === 0) {
    return '';
  }

  const lines: string[] = [];

  for (const token of animationTokens) {
    const animName = token.animationName || token.name.replace('motion-animation-', '');
    lines.push(`  --animate-${animName}: ${token.value};`);
  }

  return lines.join('\n');
}

/**
 * Depth words as real utilities (#1638 S3, the Tailwind namespace rule).
 *
 * Agents need WORDS to say where something sits -- z-depth-modal, not z-40 --
 * and components already use this vocabulary (sheet, alert-dialog,
 * context-menu, date-picker). Tailwind v4 does not theme z-index, so without
 * these @utility rules every z-depth-* class is a silent no-op.
 */
function generateDepthUtilities(depthTokens: Token[]): string {
  if (depthTokens.length === 0) return '';
  const lines: string[] = ['/* Depth (z-index) utilities -- words over numbers */'];
  for (const token of depthTokens) {
    // Only z-index-valued tokens become utilities; reference tokens like
    // depth-scale (JSON) have no --var in :root to point at.
    if (typeof token.value !== 'string' || !/^-?\d+$/.test(token.value)) continue;
    lines.push(`@utility z-${token.name} {`);
    lines.push(`  z-index: var(--${token.name});`);
    lines.push('}');
  }
  return lines.join('\n');
}

/**
 * Generate @utility classes from composite typography tokens.
 *
 * Each composite produces a @utility block using CSS properties with var() references.
 * var() is correct HERE because this is the exporter layer -- the boundary between
 * tokens and CSS. Components reference `text-display-medium` and never see var().
 */
/**
 * Named Tailwind tracking values -- used when a composite specifies a named
 * letter-spacing key rather than a scale position.
 */
const NAMED_TRACKING: Record<string, string> = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0em',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
};

function trackingRef(key: string): string {
  const named = NAMED_TRACKING[key];
  if (named !== undefined) return named;
  return `var(--letter-spacing-${key})`;
}

interface ParsedComposite {
  name: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  responsive?: Record<string, { fontSize?: string }>;
}

function parseComposites(compositeTokens: Token[]): ParsedComposite[] {
  return compositeTokens
    .map((t) => {
      try {
        const parsed = JSON.parse(t.value as string) as Omit<ParsedComposite, 'name'>;
        return { name: t.name, ...parsed };
      } catch {
        return null;
      }
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);
}

/**
 * Generate the @theme inline block for typography composition assignments.
 * Each composition becomes --text-{name} entries selecting scale positions
 * via var(), plus --rafters-ts-{name} entries for font-family (which
 * --text-* cannot carry). Zero new values -- pure references.
 */
function generateTypographyCompositeThemeInline(compositeTokens: Token[]): string {
  const mappings = parseComposites(compositeTokens);
  if (mappings.length === 0) return '';

  const lines: string[] = [];
  lines.push('@theme inline {');

  for (const m of mappings) {
    lines.push(`  --text-${m.name}: var(--font-size-${m.fontSize});`);
    lines.push(`  --text-${m.name}--line-height: var(--font-size-${m.lineHeight}--line-height);`);
    lines.push(`  --text-${m.name}--letter-spacing: ${trackingRef(m.letterSpacing)};`);
    lines.push(`  --text-${m.name}--font-weight: var(--font-weight-${m.fontWeight});`);

    lines.push(`  --rafters-ts-${m.name}: var(--font-${m.fontFamily});`);

    if (m.responsive) {
      for (const [bp, overrides] of Object.entries(m.responsive)) {
        if (overrides.fontSize) {
          lines.push(`  --rafters-ts-${m.name}-${bp}: var(--font-size-${overrides.fontSize});`);
          lines.push(
            `  --rafters-ts-${m.name}-${bp}-leading: var(--font-size-${overrides.fontSize}--line-height);`,
          );
        }
      }
    }
    lines.push('');
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * Emit the single @utility ts-* wildcard. Carries font-family and
 * text-transform -- everything --text-* cannot.
 */
function generateTypographyCompositeUtility(compositeTokens: Token[]): string {
  if (compositeTokens.length === 0) return '';

  return [
    '@utility ts-* {',
    '  font-family: --value(--rafters-ts-*);',
    '  text-transform: --value(--rafters-ts-*-transform);',
    '  @container (min-width: 640px) {',
    '    font-size: --value(--rafters-ts-*-md);',
    '    line-height: --value(--rafters-ts-*-md-leading);',
    '  }',
    '  @container (min-width: 1024px) {',
    '    font-size: --value(--rafters-ts-*-lg);',
    '    line-height: --value(--rafters-ts-*-lg-leading);',
    '  }',
    '}',
  ].join('\n');
}

/**
 * Generate `motion-<name>` @utility classes from the semantic motion tokens
 * (motion-semantic-* tokens carrying property/duration-tier/curve JSON).
 *
 * Each token becomes one transition LONGHAND @utility: transition-property +
 * transition-duration (var(--duration-*)) + transition-timing-function
 * (var(--ease-*)). Longhand, not shorthand, so a nested
 * `@media (prefers-reduced-motion: reduce)` can re-set a single property
 * (drop transforms, become a cross-fade) without restating the whole rule.
 * The var() refs resolve against the duration and ease theme vars in @theme.
 *
 * @utility lands in @layer utilities, so `transition-none` / `motion-reduce:`
 * overrides still win normally, and a NEW namespace means no @theme-generated
 * built-in shadows it. The @media-inside-@utility mirrors the
 * @container-inside-@utility nesting in generateTypographyCompositeUtility.
 */
function generateMotionUtilities(motionTokens: Token[]): string {
  const semanticTokens = motionTokens.filter((t) => t.name.startsWith('motion-semantic-'));
  if (semanticTokens.length === 0) {
    return '';
  }

  interface MotionSpec {
    properties: string[];
    durationTier: string;
    curve: string;
    reducedMotion: { properties: string[]; ms?: number } | null;
  }

  const lines: string[] = ['/* Semantic motion utilities -- transition longhand per token */'];

  for (const token of semanticTokens) {
    if (typeof token.value !== 'string') continue;
    let spec: MotionSpec;
    try {
      spec = JSON.parse(token.value) as MotionSpec;
    } catch {
      continue;
    }

    const className = token.name.replace('motion-semantic-', 'motion-');
    lines.push(`@utility ${className} {`);
    lines.push(`  transition-property: ${spec.properties.join(', ')};`);
    lines.push(`  transition-duration: var(--duration-${spec.durationTier});`);
    lines.push(`  transition-timing-function: var(--ease-${spec.curve});`);

    if (spec.reducedMotion) {
      lines.push('  @media (prefers-reduced-motion: reduce) {');
      lines.push(`    transition-property: ${spec.reducedMotion.properties.join(', ')};`);
      if (typeof spec.reducedMotion.ms === 'number') {
        lines.push(`    transition-duration: ${spec.reducedMotion.ms}ms;`);
      }
      lines.push('  }');
    }

    lines.push('}');
  }

  return lines.join('\n');
}

/** The duration form a cell spec carries -- the matrix's own tagged union. */
type CellDurationSpec = { kind: 'tier'; tier: string } | { kind: 'period'; period: string };

interface CellSpec {
  keyframe: string;
  duration: CellDurationSpec;
  /** Absent on a period-kind cell: every period row declares curve "none". */
  curve?: string;
}

/**
 * Read one cell token's value.
 *
 * `null` means A PINNED CELL -- the operator wrote an animation shorthand over
 * the JSON spec, and the exporter emits it verbatim. That is the ONLY reason
 * this returns null. A value that parses as a JSON object but is not a valid
 * spec THROWS: emitting `animation: {"keyframe":...}` would be a silently broken
 * rule, and skipping the token would delete the utility and stop the component
 * animating with no error at all.
 */
function parseCellSpec(tokenName: string, raw: string): CellSpec | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;

  const candidate = parsed as { keyframe?: unknown; duration?: unknown; curve?: unknown };
  if (typeof candidate.keyframe !== 'string') {
    throw new Error(`tailwind exporter: motion cell token "${tokenName}" has no keyframe name.`);
  }
  const duration: unknown = candidate.duration;
  const kind: unknown =
    typeof duration === 'object' && duration !== null
      ? (duration as { kind?: unknown }).kind
      : undefined;

  if (kind === 'tier') {
    const tier: unknown = (duration as { tier?: unknown }).tier;
    if (typeof tier !== 'string') {
      throw new Error(
        `tailwind exporter: motion cell token "${tokenName}" names no duration tier.`,
      );
    }
    if (typeof candidate.curve !== 'string') {
      throw new Error(
        `tailwind exporter: motion cell token "${tokenName}" is tier-kind and names no curve.`,
      );
    }
    return {
      keyframe: candidate.keyframe,
      duration: { kind: 'tier', tier },
      curve: candidate.curve,
    };
  }

  if (kind === 'period') {
    const period: unknown = (duration as { period?: unknown }).period;
    if (typeof period !== 'string') {
      throw new Error(`tailwind exporter: motion cell token "${tokenName}" names no loop period.`);
    }
    return { keyframe: candidate.keyframe, duration: { kind: 'period', period } };
  }

  // Neither form. A silent fallback to a default duration would let an
  // unrepresented cell compile as if it had a value.
  throw new Error(
    `tailwind exporter: motion cell token "${tokenName}" has an unrecognized ` +
      `duration.kind ${JSON.stringify(kind ?? null)}. Known duration.kind values: period, tier.`,
  );
}

/**
 * Emit one `@utility animate-<cell>` block per animated matrix cell (#2017).
 *
 * The cell composite is emitted as LONGHAND -- animation-name, -duration,
 * -timing-function -- for the same reason `generateMotionUtilities` emits
 * transition longhand: a nested `@media (prefers-reduced-motion: reduce)` can
 * then re-set ONE property without restating the rule.
 *
 * REDUCED MOTION IS MECHANISM B: zero `animation-duration` in the emission. The
 * alternative, `motion-reduce:animate-none` on the consuming class, was measured
 * against this one (toy 14) and loses on three counts:
 *   - `animation: none` removes the animation, so the element never reaches the
 *     keyframe's END STATE. Zeroing the duration completes it instantly and
 *     keeps the end state;
 *   - a zero duration still FIRES `animationend`, which is what the presence
 *     contract releases the unmount on. `animate-none` fires nothing, so a
 *     closing dialog would be released by the backstop timer instead;
 *   - the period exemption (loops slow, they never stop) is expressible here as
 *     SET MEMBERSHIP -- this function emits the block for the tier-kind cells
 *     and withholds it from the period-kind ones, and the period utilities do
 *     not carry it either -- while `animate-none` compiles to one cell-blind
 *     rule whose exemption exists only if the author remembers not to type it
 *     on a spinner.
 *
 * THE TWO MECHANISMS MUST NOT BOTH APPLY. Wherever `animate-none` wins it wins
 * DESTRUCTIVELY: `animation: none` resets the whole shorthand and discards the
 * zeroed duration with it. That is why the three consuming classes files dropped
 * `motion-reduce:animate-none` when they took up these utilities.
 *
 * No value appears in any UNPINNED block -- duration and curve are var()s onto
 * the leaves -- so the derived set is byte-identical across a retune, the toy-9
 * invariant.
 *
 * A PINNED CELL IS STILL A CELL. `registry.set` on one of these writes a plain
 * animation shorthand over the JSON spec, which is the sanctioned way an
 * operator hand-tunes a single moment (toy 13 measures it, and an explicit
 * `registry.bind()` is the one exit that clears the pin). The pin therefore
 * emits as the shorthand it is, and keeps whatever reduced-motion treatment its
 * cell already had -- read from the token's `reducedMotionAware`, not from the
 * overwritten value, as the emission site explains. Deciding from the value
 * would silently take a hand-tuned cell out of the reduced-motion law or drag a
 * hand-tuned loop into it, and skipping the token entirely would delete the
 * utility and stop the component animating with no error at all. All are the
 * 019fb063 silent-resolution failure arriving from inside our own emission.
 */
function generateMotionCellUtilities(motionTokens: Token[]): string {
  const cellTokens = motionTokens.filter((t) => t.name.startsWith('motion-cell-'));
  if (cellTokens.length === 0) return '';

  // The period members this sheet actually declares. The exporter holds no
  // definition tables, so the leaves already in the token list ARE the
  // vocabulary -- and checking against them is the exporter-side mirror of the
  // generator's `requireDef`. Without it a mistyped period emits
  // `var(--rafters-period-shimmr)`, which compiles clean, resolves to nothing
  // and leaves the loop standing still (reflection 019fb063).
  const periodMembers = new Set<string>();
  for (const token of motionTokens) {
    const parts = motionNamespaceParts(token.name);
    if (parts?.namespace === 'period') periodMembers.add(parts.member);
  }

  const lines: string[] = [
    '/* Motion cells -- one utility per animated (component, part, transition) */',
  ];

  for (const token of cellTokens) {
    if (typeof token.value !== 'string') continue;
    const spec = parseCellSpec(token.name, token.value);

    lines.push(`@utility ${token.name.replace('motion-cell-', 'animate-')} {`);
    if (spec === null) {
      // A user-pinned cell: the value is an animation shorthand, verbatim.
      lines.push(`  animation: ${token.value};`);
    } else if (spec.duration.kind === 'period') {
      const { period } = spec.duration;
      if (!periodMembers.has(period)) {
        throw new Error(
          `tailwind exporter: motion cell token "${token.name}" references unknown period ` +
            `"${period}". Known periods: ${[...periodMembers].sort().join(', ')}.`,
        );
      }
      // A LOOP. It takes a period, it repeats forever, and it names no curve --
      // every period row in the matrix declares curve "none", and supplying one
      // here would be inventing an assignment no cell made.
      lines.push(`  animation-name: ${spec.keyframe};`);
      lines.push(`  animation-duration: var(--rafters-period-${period});`);
      lines.push('  animation-iteration-count: infinite;');
    } else {
      // A TRANSITION. It runs ONCE, so no iteration count is written: the CSS
      // initial value is already 1, and writing it would be a literal standing
      // where the absence of one says the same thing.
      lines.push(`  animation-name: ${spec.keyframe};`);
      lines.push(`  animation-duration: var(--rafters-duration-${spec.duration.tier});`);
      lines.push(`  animation-timing-function: var(--rafters-ease-${spec.curve});`);
    }
    // The reduced-motion law reaches derived and pinned cells alike. It lands
    // AFTER the shorthand in the pinned case, so it wins on the duration and
    // only on the duration -- exactly what mechanism B is.
    //
    // THE PERIOD EXEMPTION IS SET MEMBERSHIP HERE TOO. `reducedMotionAware` is
    // false on exactly the period-kind cells (the generator sets it from the
    // same tagged union `REDUCED_MOTION_ZEROED` encodes for the namespaces), so
    // a loop simply gets no block -- loops slow, they never stop. Reading the
    // token field rather than `spec` is deliberate: a PINNED loop has no spec
    // left to read, and gating on the spec would silently zero a hand-tuned
    // spinner.
    if (token.reducedMotionAware !== false) {
      lines.push('  @media (prefers-reduced-motion: reduce) {');
      lines.push('    animation-duration: 0s;');
      lines.push('  }');
    }
    lines.push('}');
  }

  return lines.join('\n');
}

/**
 * Emit the five motion namespaces as `--rafters-<namespace>-<member>` leaves.
 *
 * Indented for the @theme block. These are the only place a motion value is
 * written down, in either emission path -- the static Studio sheet included,
 * because a sheet whose `--duration-*` bridges point at properties it never
 * declares is the exact silent failure reflection 019fb063 records.
 */
function generateMotionNamespaceVars(motionTokens: Token[]): string {
  const lines: string[] = [];
  for (const token of motionTokens) {
    if (!motionNamespaceParts(token.name)) continue;
    const value = tokenValueToCSS(token);
    if (value === null) continue;
    lines.push(`  --${token.name}: ${value};`);
  }
  if (lines.length === 0) return '';
  return [
    '  /* The five motion namespaces -- system leaves, the values live here */',
    ...lines,
  ].join('\n');
}

/**
 * Emit the Tailwind-facing `--duration-*` / `--ease-*` names as REFERENCES to
 * the namespace leaves. Indented for the @theme block.
 *
 * Purely additive: every name that existed before still exists, and every
 * consumer of `var(--duration-moderate)` keeps working. What changed is that
 * these no longer hold a second copy of the value -- a literal here would mean
 * retuning one leaf moved two lines, and the two could then disagree. They die
 * in the component sweep, when their consumers do.
 *
 * KNOWN LIMITATION until that sweep: the bridge names carry NO reduced-motion
 * path -- the zeroing law lives in the generated utilities, which are the ONLY
 * compliant consumption path today. Never `var(--duration-*)` directly, or the
 * law is silently escaped. A typed runtime accessor for JS-consumed cells is
 * #1995 and does not exist yet. Pre-existing posture, disclosed here so nobody
 * reaches for the bridge expecting compliance.
 *
 * Both emission paths (`generateThemeBlock` and `generateThemeBlockWithVarRefs`)
 * call this, because after #1991 the bridge is the same line in both: the
 * dynamic sheet used to write a literal here and the static one a reference, and
 * that difference is exactly what the leaf layer removed.
 */
function generateMotionBridgeVars(motionTokens: Token[]): string {
  const lines: string[] = [];
  for (const token of motionTokens) {
    if (token.name.startsWith('motion-duration-') && token.name !== 'motion-duration-base') {
      const key = token.name.replace('motion-duration-', '');
      lines.push(`  --duration-${key}: var(--rafters-duration-${key});`);
    }
    if (token.name.startsWith('motion-easing-')) {
      const key = token.name.replace('motion-easing-', '');
      lines.push(`  --ease-${key}: var(--rafters-ease-${key});`);
    }
  }
  return lines.join('\n');
}

/**
 * Emit one `@utility <namespace>-<member>` block per namespace member.
 *
 * Every block references a var by NAME and contains no motion value, so the
 * whole set is byte-identical across any retune -- the toy-9 invariant, asserted
 * in `motion-css-golden.test.ts`. The only literal any block may contain is the
 * reduced-motion zero, which is a law rather than a tuned value.
 */
function generateMotionNamespaceUtilities(motionTokens: Token[]): string {
  const lines: string[] = ['/* The five motion namespaces -- one utility per member */'];
  let emitted = 0;

  for (const token of motionTokens) {
    const parts = motionNamespaceParts(token.name);
    if (!parts) continue;
    // Total by construction: parts.namespace is MotionNamespace and the map
    // satisfies Record<MotionNamespace, string> -- no silent-drop branch.
    const property = MOTION_NAMESPACE_PROPERTY[parts.namespace];

    emitted++;
    lines.push(`@utility ${parts.namespace}-${parts.member} {`);
    lines.push(`  ${property}: var(--${token.name});`);
    if (REDUCED_MOTION_ZEROED.has(parts.namespace)) {
      lines.push('  @media (prefers-reduced-motion: reduce) {');
      lines.push(`    ${property}: 0ms;`);
      lines.push('  }');
    }
    lines.push('}');
  }

  return emitted === 0 ? '' : lines.join('\n');
}

/**
 * Map a typography override property to a Tailwind utility class.
 */
function overridePropertyToUtility(property: string, value: string): string {
  switch (property) {
    case 'fontFamily':
      return `font-${value}`;
    case 'fontWeight':
      return `font-${value}`;
    case 'fontSize':
      return `text-${value}`;
    case 'lineHeight':
      return `leading-${value}`;
    case 'letterSpacing':
      return `tracking-${value}`;
    default:
      return '';
  }
}

/**
 * Generate element-level typography override CSS from registry overrides.
 * Each override produces a CSS rule with @apply using the base role utility
 * plus the overridden Tailwind utilities.
 */
function generateTypographyOverrideCSS(overrides: TypographyElementOverride[]): string {
  if (overrides.length === 0) {
    return '';
  }

  const lines: string[] = [];
  lines.push('/* -- Typography Element Overrides -- */');

  for (const override of overrides) {
    const overrideUtilities: string[] = [];
    for (const [prop, val] of Object.entries(override.overrides)) {
      if (val) {
        const utility = overridePropertyToUtility(prop, val);
        if (utility) {
          overrideUtilities.push(utility);
        }
      }
    }

    if (overrideUtilities.length > 0) {
      lines.push(`/* ${override.element}: diverges from ${override.role} (${override.why}) */`);
      lines.push(`${override.element} {`);
      lines.push(`  @apply text-${override.role} ${overrideUtilities.join(' ')};`);
      lines.push('}');
    }
  }

  return lines.join('\n');
}

/**
 * Export tokens to Tailwind v4 CSS format
 *
 * @param tokens - Array of tokens to export
 * @param options - Export options
 * @returns Tailwind v4 compatible CSS string
 *
 * @example
 * ```typescript
 * import { generateBaseSystem } from '@rafters/design-tokens';
 * import { tokensToTailwind } from '@rafters/design-tokens/exporters';
 *
 * const result = generateBaseSystem();
 * const css = tokensToTailwind(result.allTokens);
 *
 * // Write to file
 * fs.writeFileSync('theme.css', css);
 * ```
 */
export function tokensToTailwind(
  tokens: Token[],
  options: TailwindExportOptions = {},
  typographyOverrides: TypographyElementOverride[] = [],
): string {
  const { includeImport = true } = options;

  if (tokens.length === 0) {
    throw new Error('Registry is empty');
  }

  const groups = groupTokens(tokens);
  const sections: string[] = [];

  // Tailwind import
  if (includeImport) {
    sections.push('@import "tailwindcss";');
    sections.push('');
  }

  // @theme block with raw color scales and utility tokens
  const themeBlock = generateThemeBlock(groups);
  sections.push(themeBlock);
  sections.push('');

  // @theme inline block for semantic color bridges (reference :root variables)
  const themeInlineBlock = generateThemeInlineBlock(groups.semantic);
  sections.push(themeInlineBlock);
  sections.push('');

  // :root block with --rafters-* namespace and dark mode
  const rootBlock = generateRootBlock(groups.semantic, options.darkMode ?? 'class');
  sections.push(rootBlock);
  sections.push('');

  // Keyframes for animations (from motion-keyframe-* tokens)
  const keyframes = generateKeyframes(groups.motion);
  if (keyframes) {
    sections.push(keyframes);
  }

  // Typography composition assignments (@theme inline + ts-* utility)
  const typographyThemeInline = generateTypographyCompositeThemeInline(
    groups['typography-composite'],
  );
  if (typographyThemeInline) {
    sections.push('');
    sections.push(typographyThemeInline);
  }
  const typographyTsUtility = generateTypographyCompositeUtility(groups['typography-composite']);
  if (typographyTsUtility) {
    sections.push('');
    sections.push(typographyTsUtility);
  }

  // Depth (z-index) @utility words
  const depthUtilities = generateDepthUtilities(groups.depth);
  if (depthUtilities) {
    sections.push('');
    sections.push(depthUtilities);
  }

  // The five motion namespaces (duration-*, ease-*, delay-*, extent-*, period-*)
  const namespaceUtilities = generateMotionNamespaceUtilities(groups.motion);
  if (namespaceUtilities) {
    sections.push('');
    sections.push(namespaceUtilities);
  }

  // Semantic motion @utility classes (motion-*)
  const motionUtilities = generateMotionUtilities(groups.motion);
  if (motionUtilities) {
    sections.push('');
    sections.push(motionUtilities);
  }

  // Per-cell animation @utility classes (animate-<component>-<part>-<transition>)
  const cellUtilities = generateMotionCellUtilities(groups.motion);
  if (cellUtilities) {
    sections.push('');
    sections.push(cellUtilities);
  }

  // Typography element overrides (if any)
  const overrideCSS = generateTypographyOverrideCSS(typographyOverrides);
  if (overrideCSS) {
    sections.push('');
    sections.push(overrideCSS);
  }

  // Article type system - @layer base with @apply compositions
  sections.push('');
  sections.push(generateArticleBaseLayer());

  return sections.join('\n');
}

/**
 * Export registry tokens to Tailwind v4 CSS format
 *
 * This is the interface required by issue #392.
 *
 * @param registry - TokenRegistry containing tokens
 * @param options - Export options
 * @returns Tailwind v4 compatible CSS string
 *
 * @example
 * ```typescript
 * import { TokenRegistry } from '@rafters/design-tokens';
 * import { registryToTailwind } from '@rafters/design-tokens/exporters';
 *
 * const registry = new TokenRegistry(tokens);
 * const css = registryToTailwind(registry);
 *
 * await writeFile('.rafters/output/theme.css', css);
 * ```
 */
export function registryToTailwind(
  registry: TokenRegistry,
  options?: TailwindExportOptions,
): string {
  const tokens = [...registry.list()];
  return tokensToTailwind(tokens, options, []);
}

/**
 * Generate @theme block with var() references instead of actual values
 * Used for Studio static CSS - Tailwind processes once and references CSS variables
 */
function generateThemeBlockWithVarRefs(groups: GroupedTokens): string {
  const lines: string[] = [];
  lines.push('@theme {');

  // Color scales with --color- prefix referencing vars
  if (groups.color.length > 0) {
    for (const token of groups.color) {
      lines.push(`  --color-${token.name}: var(--rafters-color-${token.name});`);
    }
    lines.push('');
  }

  // Spacing tokens -- strip namespace prefix for Tailwind v4
  if (groups.spacing.length > 0) {
    for (const token of groups.spacing) {
      const key = token.name.replace(/^spacing-/, '');
      lines.push(`  --spacing-${key}: var(--rafters-${token.name});`);
    }
    lines.push('');
  }

  // Typography tokens
  if (groups.typography.length > 0) {
    for (const token of groups.typography) {
      lines.push(`  --${token.name}: var(--rafters-${token.name});`);
      if (token.lineHeight) {
        lines.push(`  --${token.name}--line-height: var(--rafters-${token.name}--line-height);`);
      }
      // Same --leading-* bridge as the dynamic path (generateThemeBlock) --
      // the two must stay in parity or Studio's leading-* utilities compile
      // to nothing while the consumer sheet's work.
      if (token.name.startsWith('line-height-')) {
        const key = token.name.replace(/^line-height-/, '');
        lines.push(`  --leading-${key}: var(--rafters-${token.name});`);
      }
    }
    lines.push('');
  }

  // Radius tokens -- strip namespace prefix for Tailwind v4
  if (groups.radius.length > 0) {
    for (const token of groups.radius) {
      const key = token.name.replace(/^radius-/, '');
      lines.push(`  --radius-${key}: var(--rafters-${token.name});`);
    }
    lines.push('');
  }

  // Shadow tokens -- strip namespace prefix for Tailwind v4
  // Skip decomposed parts -- only composites map to Tailwind utilities
  if (groups.shadow.length > 0) {
    for (const token of groups.shadow) {
      if (isShadowDecomposedPart(token.name)) continue;
      const key = token.name.replace(/^shadow-/, '');
      lines.push(`  --shadow-${key}: var(--rafters-${token.name});`);
    }
    lines.push('');
  }

  // Depth (z-index) tokens
  if (groups.depth.length > 0) {
    for (const token of groups.depth) {
      lines.push(`  --${token.name}: var(--rafters-${token.name});`);
    }
    lines.push('');
  }

  // The five motion namespaces -- leaves, so they carry the literal even here.
  // Everything else in this block is a var() reference; these are what the
  // references point AT, and a reference whose target is never declared resolves
  // to nothing without erroring (019fb063).
  const motionNamespaceLines = generateMotionNamespaceVars(groups.motion);
  if (motionNamespaceLines) {
    lines.push(motionNamespaceLines);
    lines.push('');
  }

  // Motion tokens (raw values for non-duration/easing)
  if (groups.motion.length > 0) {
    for (const token of groups.motion) {
      if (token.name.startsWith('motion-duration-') && token.name !== 'motion-duration-base')
        continue;
      if (token.name.startsWith('motion-easing-')) continue;
      // Semantic motion tokens are JSON specs consumed by generateMotionUtilities,
      // not raw custom properties -- no --var to reference.
      if (token.name.startsWith('motion-semantic-')) continue;
      // Motion cells are JSON specs consumed by generateMotionCellUtilities, for
      // the same reason: there is no --var to point a bridge at, and emitting
      // one would declare `--motion-cell-x: var(--rafters-motion-cell-x)` onto a
      // property nothing declares -- the silent dangling reference of 019fb063.
      if (token.name.startsWith('motion-cell-')) continue;
      if (motionNamespaceParts(token.name)) continue;
      lines.push(`  --${token.name}: var(--rafters-${token.name});`);
    }
    lines.push('');
  }

  // Motion duration/easing tokens with Tailwind-native names, bridged onto the
  // namespace leaves -- byte-identical to the dynamic path, and shared with it.
  const bridgeLines = generateMotionBridgeVars(groups.motion);
  if (bridgeLines) {
    lines.push(bridgeLines);
    lines.push('');
  }

  // Breakpoint tokens (exclude media query tokens)
  if (groups.breakpoint.length > 0) {
    for (const token of groups.breakpoint) {
      if (isMediaQueryToken(token)) continue;
      lines.push(`  --${token.name}: var(--rafters-${token.name});`);
    }
    lines.push('');
  }

  // Focus tokens
  if (groups.focus.length > 0) {
    for (const token of groups.focus) {
      lines.push(`  --${token.name}: var(--rafters-${token.name});`);
    }
    lines.push('');
  }

  // Other tokens
  if (groups.other.length > 0) {
    for (const token of groups.other) {
      lines.push(`  --${token.name}: var(--rafters-${token.name});`);
    }
    lines.push('');
  }

  // Animation utility tokens (from motion-animation-* tokens).
  //
  // The VALUE, not a `var(--rafters-animate-*)` bridge -- the same line the
  // dynamic path emits. `--rafters-animate-*` was invented here and declared
  // nowhere: no token is named `animate-*`, so no leaf of that name exists in
  // either sheet, and every `animate-*` utility in the static Studio sheet
  // resolved to nothing. Retheming still reaches these, because the value is an
  // animation shorthand whose duration and easing are THEMSELVES var()s onto
  // the declared `--rafters-duration-*` / `--rafters-ease-*` leaves. The
  // indirection was never needed; it was only ever a dangling reference.
  const animationTokens = groups.motion.filter((t) => t.name.startsWith('motion-animation-'));
  if (animationTokens.length > 0) {
    lines.push(generateAnimationTokens(groups.motion));
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * Export registry tokens to static Tailwind CSS for Studio
 *
 * This produces the @theme block with var() references - processed once by Tailwind.
 *
 * @param registry - TokenRegistry containing tokens
 * @returns Static Tailwind CSS with var() references
 *
 * @example
 * ```typescript
 * // In Studio setup
 * const staticCSS = registryToTailwindStatic(registry);
 * await writeFile('.rafters/output/rafters.tailwind.css', staticCSS);
 * ```
 */
export function registryToTailwindStatic(registry: TokenRegistry): string {
  const tokens = [...registry.list()];

  if (tokens.length === 0) {
    throw new Error('Registry is empty');
  }

  const groups = groupTokens(tokens);
  const sections: string[] = [];

  // Tailwind import
  sections.push('@import "tailwindcss";');
  sections.push('');

  // @theme block with var() references (static - processed once by Tailwind)
  const themeBlock = generateThemeBlockWithVarRefs(groups);
  sections.push(themeBlock);
  sections.push('');

  // @theme inline block for semantic color bridges
  const themeInlineBlock = generateThemeInlineBlock(groups.semantic);
  sections.push(themeInlineBlock);
  sections.push('');

  // Keyframes for animations (these don't change with token values)
  const keyframes = generateKeyframes(groups.motion);
  if (keyframes) {
    sections.push(keyframes);
  }

  // Per-cell animation @utility classes -- BOTH emission paths, deliberately.
  //
  // The other animate-* utilities reach this sheet by THEME INFERENCE: the
  // `--animate-*` entries above are a Tailwind v4 namespace, so Tailwind
  // generates `.animate-<name>` for them. Motion cells are not in that
  // namespace (on purpose -- a theme-inferred rule sets the animation
  // SHORTHAND, which would reset the reduced-motion zeroed duration), so
  // without this call the three components that consume them would compile to
  // nothing in the Studio sheet while working in the dynamic one. That split is
  // the 019fb063 silent failure with a second path to arrive by.
  //
  // Safe to share: the function emits references only and reads nothing but
  // tokens, so both sheets carry byte-identical blocks -- which is the property
  // the golden asserts.
  //
  // KNOWN LIMITATION, unchanged by this: the five-namespace and semantic-motion
  // @utility blocks are still absent from the static sheet. Those never worked
  // here and adding them is the utility-parity sweep, not this fix.
  const cellUtilities = generateMotionCellUtilities(groups.motion);
  if (cellUtilities) {
    sections.push('');
    sections.push(cellUtilities);
  }

  // Typography composition assignments + ts-* utility
  const staticTypoTheme = generateTypographyCompositeThemeInline(groups['typography-composite']);
  if (staticTypoTheme) {
    sections.push('');
    sections.push(staticTypoTheme);
  }
  const staticTypoUtility = generateTypographyCompositeUtility(groups['typography-composite']);
  if (staticTypoUtility) {
    sections.push('');
    sections.push(staticTypoUtility);
  }

  // Article type system - @layer base with @apply compositions
  sections.push('');
  sections.push(generateArticleBaseLayer());

  return sections.join('\n');
}

/**
 * Options for compiled CSS export
 */
export interface CompiledCssOptions {
  /** Minify the output (default: true) */
  minify?: boolean;
  /**
   * Absolute paths (files or directories) Tailwind should scan for utility
   * candidates, emitted as explicit `@source` directives. The compiled sheet
   * is a standalone artifact, so it always uses `@import "tailwindcss"
   * source(none)` to disable Tailwind's content auto-detection -- the output
   * is then a pure function of (registry values, contentSources), never of
   * the process CWD. When empty, only theme tokens and base layers are
   * emitted (no utility rules).
   */
  contentSources?: string[];
}

/**
 * Export registry tokens to fully compiled CSS
 *
 * Generates Tailwind theme CSS and runs it through the Tailwind CLI
 * to produce standalone CSS with all utilities resolved.
 * No Tailwind installation required by consumers.
 *
 * @param registry - TokenRegistry containing tokens
 * @param options - Compilation options
 * @returns Fully compiled CSS string
 *
 * @example
 * ```typescript
 * import { TokenRegistry, registryToCompiled } from '@rafters/design-tokens';
 *
 * const registry = new TokenRegistry(tokens);
 * const css = await registryToCompiled(registry);
 *
 * await writeFile('.rafters/output/rafters.standalone.css', css);
 * ```
 */
export async function registryToCompiled(
  registry: TokenRegistry,
  options: CompiledCssOptions = {},
): Promise<string> {
  const { minify = true, contentSources = [] } = options;

  // Theme body without its own @import -- the standalone sheet supplies the
  // import with source(none) below so utilities come only from contentSources.
  const themeBody = registryToTailwind(registry, { includeImport: false });

  // source(none) disables Tailwind's CWD content auto-detection; each
  // contentSource is scanned explicitly. Output is then independent of where
  // this runs -- a pure function of (registry values, contentSources).
  const sourceDirectives = contentSources.map((src) => `@source "${src}";`).join('\n');
  const input = `@import "tailwindcss" source(none);\n${sourceDirectives}\n${themeBody}`;

  const { execFileSync } = await import('node:child_process');
  const { mkdtempSync, writeFileSync, readFileSync, rmSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { createRequire } = await import('node:module');

  // Resolve the @tailwindcss/cli package location using createRequire
  const require = createRequire(import.meta.url);
  let pkgDir: string;
  try {
    const pkgJsonPath = require.resolve('@tailwindcss/cli/package.json');
    pkgDir = dirname(pkgJsonPath);
  } catch {
    throw new Error('Failed to resolve @tailwindcss/cli');
  }

  // The bin is at dist/index.mjs relative to package.json
  const binPath = join(pkgDir, 'dist', 'index.mjs');

  // The temp input lives inside the @tailwindcss/cli package so the CLI can
  // resolve `@import "tailwindcss"` (the engine) via normal node resolution.
  // With source(none) this location does NOT influence content scanning, so
  // it has no effect on output -- only the explicit @source paths do.
  const tempDir = mkdtempSync(join(pkgDir, '.tmp-compile-'));
  const tempInput = join(tempDir, 'input.css');
  const tempOutput = join(tempDir, 'output.css');

  try {
    writeFileSync(tempInput, input);

    const args = [binPath, '-i', tempInput, '-o', tempOutput];
    if (minify) {
      args.push('--minify');
    }
    // Explicit cwd = the package dir (not the inherited process CWD), so a
    // stray Tailwind config or content root in the caller's tree cannot leak in.
    execFileSync('node', args, { stdio: 'pipe', timeout: 30_000, cwd: pkgDir });

    return readFileSync(tempOutput, 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to compile CSS: ${message}`);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

const COLOR_UTILITIES = [
  'bg',
  'text',
  'border',
  'ring',
  'outline',
  'fill',
  'stroke',
  'accent',
  'caret',
  'decoration',
  'divide',
  'shadow',
  'placeholder',
] as const;

const SPACING_UTILITIES = [
  'p',
  'px',
  'py',
  'pt',
  'pr',
  'pb',
  'pl',
  'm',
  'mx',
  'my',
  'mt',
  'mr',
  'mb',
  'ml',
  'gap',
  'gap-x',
  'gap-y',
  'w',
  'h',
  'size',
  'inset',
  'top',
  'right',
  'bottom',
  'left',
  'space-x',
  'space-y',
] as const;

const RADIUS_UTILITIES = [
  'rounded',
  'rounded-t',
  'rounded-r',
  'rounded-b',
  'rounded-l',
  'rounded-tl',
  'rounded-tr',
  'rounded-br',
  'rounded-bl',
] as const;

const STATE_VARIANTS = ['hover', 'focus-visible', 'focus', 'active', 'dark'] as const;

const CONTAINER_LAYOUT_UTILITIES = [
  'grid-cols',
  'gap',
  'p',
  'px',
  'py',
  'pt',
  'pr',
  'pb',
  'pl',
  'h',
  'w',
  'max-w',
  'flex-row',
  'flex-col',
  'flex-col-reverse',
  'flex-wrap',
  'items-center',
  'justify-end',
  'justify-center',
  'justify-between',
  'text-left',
  'text-center',
  'text-right',
  'space-x',
  'space-y',
  'mt',
  'rounded',
  'rounded-sm',
  'rounded-md',
  'rounded-lg',
] as const;

/**
 * Derive the complete set of Tailwind utility candidates from theme custom
 * properties. Each --color-<slug> becomes bg-<slug>, text-<slug>, etc.; each
 * --spacing-<slug> becomes p-<slug>, m-<slug>, gap-<slug>, etc. The result is
 * the exhaustive base utility surface the token graph can produce -- no
 * component scanning required.
 */
function extractThemeBlocks(css: string): string[] {
  const blocks: string[] = [];
  const re = /@theme\s*(?:inline\s*)?\{/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(css)) !== null) {
    let depth = 1;
    const start = match.index + match[0].length;
    for (let i = start; i < css.length; i++) {
      if (css[i] === '{') depth++;
      if (css[i] === '}') {
        depth--;
        if (depth === 0) {
          blocks.push(css.slice(start, i));
          break;
        }
      }
    }
  }
  return blocks;
}

function deriveCandidates(themeCSS: string): string[] {
  const themeVarNames: string[] = [];
  for (const block of extractThemeBlocks(themeCSS)) {
    const varRe = /--([a-z][a-z0-9-]*)\s*:/g;
    let varMatch: RegExpExecArray | null;
    while ((varMatch = varRe.exec(block)) !== null) {
      if (varMatch[1]) themeVarNames.push(varMatch[1]);
    }
  }

  const candidates = new Set<string>();

  for (const name of themeVarNames) {
    if (name.startsWith('color-')) {
      const slug = name.slice(6);
      for (const p of COLOR_UTILITIES) candidates.add(`${p}-${slug}`);
    } else if (name.startsWith('spacing-')) {
      const slug = name.slice(8);
      for (const p of SPACING_UTILITIES) candidates.add(`${p}-${slug}`);
    } else if (name.startsWith('radius-')) {
      const slug = name.slice(7);
      for (const p of RADIUS_UTILITIES) candidates.add(`${p}-${slug}`);
    } else if (name.startsWith('shadow-') && !/-(blur|spread|offset|color|inset)/.test(name)) {
      candidates.add(`shadow-${name.slice(7)}`);
    } else if (name.startsWith('font-size-')) {
      candidates.add(`text-${name.slice(10)}`);
    } else if (name.startsWith('font-weight-')) {
      candidates.add(`font-${name.slice(12)}`);
    } else if (name.startsWith('ease-')) {
      candidates.add(name);
    } else if (name.startsWith('leading-')) {
      candidates.add(name);
    } else if (name.startsWith('animate-')) {
      candidates.add(name);
    } else if (name.startsWith('text-') && !name.includes('--')) {
      candidates.add(`text-${name.slice(5)}`);
    } else if (name.startsWith('rafters-ts-') && !name.endsWith('-transform')) {
      candidates.add(`ts-${name.slice(11)}`);
    }
  }

  const base = [...candidates];
  for (const variant of STATE_VARIANTS) {
    for (const c of base) {
      candidates.add(`${variant}:${c}`);
    }
  }

  // Container query variants for layout utilities. Only layout-shaped
  // utilities get container prefixes -- crossing the full color/shadow
  // surface with 13 container sizes would produce ~18MB.
  const containerSizes = themeVarNames
    .filter((n) => n.startsWith('container-'))
    .map((n) => n.slice(10));
  const layoutCandidates = base.filter((c) =>
    CONTAINER_LAYOUT_UTILITIES.some((u) => c === u || c.startsWith(`${u}-`)),
  );
  for (const size of containerSizes) {
    for (const c of layoutCandidates) {
      candidates.add(`@${size}:${c}`);
    }
  }

  return [...candidates];
}

/**
 * Produce the complete documentation stylesheet -- every utility the token
 * graph can emit at base + state variants PLUS every utility the installed
 * components actually reference. The candidate file covers the token surface;
 * the content sources cover the component surface (flex, grid, w-full, etc.).
 * Veneer treeshakes the result at bake time; during dev it is adopted whole.
 */
export async function registryToDocumentation(
  registry: TokenRegistry,
  options: { minify?: boolean; contentSources?: string[] } = {},
): Promise<string> {
  const { minify = true, contentSources = [] } = options;
  const themeBody = registryToTailwind(registry, { includeImport: false });
  const candidates = deriveCandidates(themeBody);

  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { createRequire } = await import('node:module');

  const require = createRequire(import.meta.url);
  let pkgDir: string;
  try {
    const pkgJsonPath = require.resolve('@tailwindcss/cli/package.json');
    pkgDir = dirname(pkgJsonPath);
  } catch {
    throw new Error(
      'Failed to resolve @tailwindcss/cli -- install it to generate documentation CSS',
    );
  }

  const tempDir = mkdtempSync(join(pkgDir, '.tmp-doc-compile-'));
  const candidateFile = join(tempDir, 'candidates.txt');
  writeFileSync(candidateFile, candidates.join('\n'));

  const sourceDirectives = [
    `@source "${candidateFile}";`,
    ...contentSources.map((src) => `@source "${src}";`),
  ].join('\n');
  const input = `@import "tailwindcss" source(none);\n${sourceDirectives}\n${themeBody}`;

  const tempInput = join(tempDir, 'input.css');
  const tempOutput = join(tempDir, 'output.css');

  try {
    writeFileSync(tempInput, input);

    const { execFileSync } = await import('node:child_process');
    const binPath = join(pkgDir, 'dist', 'index.mjs');
    const args = [binPath, '-i', tempInput, '-o', tempOutput];
    if (minify) args.push('--minify');
    execFileSync('node', args, { stdio: 'pipe', timeout: 60_000, cwd: pkgDir });

    const { readFileSync } = await import('node:fs');
    const raw = readFileSync(tempOutput, 'utf-8');
    return postProcessDocSheet(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to compile documentation CSS: ${message}`);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * Post-process the compiled documentation sheet for shadow-DOM adoption.
 *
 * The sheet is SELF-CONTAINED: adopt it, get a correct render, need nothing
 * else on the page. Every top-level construct Tailwind v4 emits is kept;
 * selectors are rewritten for shadow-DOM scope (:root -> :host, universal
 * selector gains :host). The Tailwind banner comment and the bare @layer
 * order declaration are the only things dropped.
 *
 * Uses css-tree for AST walking instead of regex extraction -- the compiled
 * output is a real stylesheet and should be processed as one.
 */
function postProcessDocSheet(css: string): string {
  const ast = csstree.parse(css);
  const parts: string[] = [];
  let hasHostContainer = false;

  const atruleNames = new Set(['layer', 'property', 'keyframes']);
  csstree.walk(ast, {
    visit: 'Atrule',
    enter(node) {
      if (!atruleNames.has(node.name)) return;

      if (node.name === 'layer') {
        const prelude = node.prelude ? csstree.generate(node.prelude) : '';
        if (prelude === 'theme' && node.block) {
          let content = csstree.generate(node.block);
          content = content.replace(/^\{/, '').replace(/\}$/, '');
          content = rewriteRootToHost(content);
          if (!hasHostContainer) {
            parts.push(`:host{container-type:inline-size}${content}`);
            hasHostContainer = true;
          } else {
            parts.push(content);
          }
        } else if (/^(base|components|utilities)/.test(prelude) && node.block) {
          parts.push(csstree.generate(node));
        } else if (prelude.startsWith('properties') && node.block) {
          let block = csstree.generate(node);
          block = rewritePropertiesSelector(block);
          parts.push(block);
        }
      } else {
        parts.push(csstree.generate(node));
      }
    },
  });

  // Top-level rules (not inside @layer): semantic color layer, dark mode,
  // data-theme selectors. These carry --primary, --foreground, etc.
  csstree.walk(ast, {
    visit: 'Rule',
    enter(node, _item, list) {
      if (list !== (ast as import('css-tree').StyleSheet).children) return;

      let block = csstree.generate(node);
      block = rewriteRootToHost(block);
      parts.push(block);
    },
  });

  return parts.join('');
}

function rewriteRootToHost(css: string): string {
  return css
    .replace(/:root\s*,\s*:host/g, ':host')
    .replace(/:root\[data-theme/g, ':host[data-theme')
    .replace(/:root(?=[{\s,[])/g, ':host');
}

function rewritePropertiesSelector(css: string): string {
  return css.replace(
    /\*\s*,\s*:?:?before\s*,\s*:?:?after\s*,\s*:?:?backdrop/g,
    ':host,*,::before,::after',
  );
}
