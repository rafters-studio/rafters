/**
 * Tailwind v4 CSS Exporter
 *
 * Converts TokenRegistry contents to Tailwind v4 CSS format with:
 * - @theme block for raw color scales
 * - :root --rafters-* namespace tokens (light/dark mode)
 * - Semantic variables that switch via .dark class (Tailwind v4 @custom-variant)
 * - @theme inline bridge pattern
 *
 * Reads semantic color mappings from DEFAULT_SEMANTIC_COLOR_MAPPINGS (single source of truth).
 *
 * @see https://tailwindcss.com/docs/theme
 * @see https://ui.shadcn.com/docs/theming
 */

import type { ColorReference, ColorValue, Token } from '@rafters/shared';
import { DEFAULT_SEMANTIC_COLOR_MAPPINGS } from '../generators/defaults.js';
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
  elevation: Token[];
  focus: Token[];
  other: Token[];
}

/**
 * Convert SemanticColorMapping to the string format needed for Tailwind CSS
 * e.g., { family: 'neutral', position: '50' } -> 'neutral-50'
 */
function colorRefToString(ref: { family: string; position: string }): string {
  return `${ref.family}-${ref.position}`;
}

/**
 * Build semantic mappings from actual tokens in the registry.
 * Falls back to DEFAULT_SEMANTIC_COLOR_MAPPINGS for tokens not in registry.
 *
 * @param semanticTokens - Semantic tokens from the registry
 * @returns { light: 'neutral-50', dark: 'neutral-950' } format
 */
function getSemanticMappingsFromTokens(
  semanticTokens: Token[],
): Record<string, { light: string; dark: string }> {
  const mappings: Record<string, { light: string; dark: string }> = {};

  for (const token of semanticTokens) {
    const { name, value, dependsOn } = token;

    // Skip non-ColorReference values (state variants like primary-hover have string values)
    if (typeof value !== 'object' || value === null || !('family' in value)) {
      continue;
    }

    const colorRef = value as ColorReference;
    const lightRef = `${colorRef.family}-${colorRef.position}`;

    // Dark mode is in dependsOn[1] as string like 'neutral-50'
    // If not available, use light mode as fallback
    const darkRef = dependsOn?.[1] ?? lightRef;

    mappings[name] = { light: lightRef, dark: darkRef };
  }

  // Fill in any missing mappings from defaults (for completeness)
  for (const [name, mapping] of Object.entries(DEFAULT_SEMANTIC_COLOR_MAPPINGS)) {
    if (!mappings[name]) {
      mappings[name] = {
        light: colorRefToString(mapping.light),
        dark: colorRefToString(mapping.dark),
      };
    }
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
    elevation: [],
    focus: [],
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
      case 'elevation':
        groups.elevation.push(token);
        break;
      case 'focus':
        groups.focus.push(token);
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
  lines.push(':root {');

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

  // Color scales with --color- prefix
  if (groups.color.length > 0) {
    for (const token of groups.color) {
      const value = tokenValueToCSS(token);
      if (value === null) continue;
      lines.push(`  --color-${token.name}: ${value};`);
    }
    lines.push('');
  }

  // Spacing tokens
  if (groups.spacing.length > 0) {
    for (const token of groups.spacing) {
      const value = tokenValueToCSS(token);
      if (value === null) continue;
      lines.push(`  --spacing-${token.name}: ${value};`);
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
    }
    lines.push('');
  }

  // Radius tokens
  if (groups.radius.length > 0) {
    for (const token of groups.radius) {
      const value = tokenValueToCSS(token);
      if (value === null) continue;
      lines.push(`  --radius-${token.name}: ${value};`);
    }
    lines.push('');
  }

  // Shadow tokens
  if (groups.shadow.length > 0) {
    for (const token of groups.shadow) {
      const value = tokenValueToCSS(token);
      if (value === null) continue;
      lines.push(`  --shadow-${token.name}: ${value};`);
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

  // Motion tokens
  if (groups.motion.length > 0) {
    for (const token of groups.motion) {
      const value = tokenValueToCSS(token);
      if (value === null) continue;
      lines.push(`  --${token.name}: ${value};`);
    }
    lines.push('');
  }

  // Breakpoint tokens
  if (groups.breakpoint.length > 0) {
    for (const token of groups.breakpoint) {
      const value = tokenValueToCSS(token);
      if (value === null) continue;
      lines.push(`  --${token.name}: ${value};`);
    }
    lines.push('');
  }

  // Elevation tokens
  if (groups.elevation.length > 0) {
    for (const token of groups.elevation) {
      const value = tokenValueToCSS(token);
      if (value === null) continue;
      lines.push(`  --${token.name}: ${value};`);
    }
    lines.push('');
  }

  // Focus tokens
  if (groups.focus.length > 0) {
    for (const token of groups.focus) {
      const value = tokenValueToCSS(token);
      if (value === null) continue;
      lines.push(`  --${token.name}: ${value};`);
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
  // Paragraphs
  ['p', 'leading-relaxed mb-4'],
  ['p:last-child', 'mb-0'],

  // Headings
  ['h1', 'text-4xl font-bold tracking-tight mb-4 mt-0 text-accent-foreground'],
  ['h2', 'text-3xl font-semibold tracking-tight mb-3 mt-8 text-accent-foreground'],
  ['h2:first-child', 'mt-0'],
  ['h3', 'text-2xl font-semibold mb-2 mt-6 text-accent-foreground'],
  ['h4', 'text-xl font-semibold mb-2 mt-4 text-accent-foreground'],
  ['h5', 'text-lg font-semibold mb-2 mt-4 text-accent-foreground'],
  ['h6', 'text-base font-semibold mb-2 mt-4 text-accent-foreground'],

  // Lists
  ['ul', 'list-disc pl-6 mb-4'],
  ['ol', 'list-decimal pl-6 mb-4'],
  ['li', 'mb-1'],
  ['li > ul,\n  article li > ol', 'mt-1 mb-0'],

  // Links
  ['a', 'text-primary underline underline-offset-4'],
  ['a:hover', 'text-primary/80'],

  // Blockquotes
  ['blockquote', 'border-l-4 border-muted pl-4 italic my-4'],

  // Code
  ['code', 'bg-muted px-1.5 py-0.5 rounded text-sm font-mono'],
  ['pre', 'bg-muted p-4 rounded-lg overflow-x-auto my-4 text-sm font-mono'],
  ['pre code', 'bg-transparent p-0 rounded-none text-[inherit]'],
  ['kbd', 'bg-muted border border-border rounded px-1.5 py-0.5 text-sm font-mono'],

  // Horizontal rules
  ['hr', 'border-border my-8'],

  // Media
  ['img', 'rounded-lg my-4 max-w-full h-auto'],
  ['video', 'rounded-lg my-4 max-w-full h-auto'],

  // Tables
  ['table', 'w-full my-4 border-collapse'],
  ['caption', 'mt-2 text-sm text-muted-foreground text-left'],
  ['th', 'border border-border px-3 py-2 text-left font-semibold'],
  ['td', 'border border-border px-3 py-2'],

  // Figures
  ['figure', 'my-4'],
  ['figcaption', 'mt-2 text-sm text-muted-foreground'],

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
  ['small', 'text-sm'],
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
export function tokensToTailwind(tokens: Token[], options: TailwindExportOptions = {}): string {
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
  const tokens = registry.list();
  return tokensToTailwind(tokens, options);
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

  // Spacing tokens
  if (groups.spacing.length > 0) {
    for (const token of groups.spacing) {
      lines.push(`  --spacing-${token.name}: var(--rafters-spacing-${token.name});`);
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
    }
    lines.push('');
  }

  // Radius tokens
  if (groups.radius.length > 0) {
    for (const token of groups.radius) {
      lines.push(`  --radius-${token.name}: var(--rafters-radius-${token.name});`);
    }
    lines.push('');
  }

  // Shadow tokens
  if (groups.shadow.length > 0) {
    for (const token of groups.shadow) {
      lines.push(`  --shadow-${token.name}: var(--rafters-shadow-${token.name});`);
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

  // Motion tokens
  if (groups.motion.length > 0) {
    for (const token of groups.motion) {
      lines.push(`  --${token.name}: var(--rafters-${token.name});`);
    }
    lines.push('');
  }

  // Breakpoint tokens
  if (groups.breakpoint.length > 0) {
    for (const token of groups.breakpoint) {
      lines.push(`  --${token.name}: var(--rafters-${token.name});`);
    }
    lines.push('');
  }

  // Elevation tokens
  if (groups.elevation.length > 0) {
    for (const token of groups.elevation) {
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

  // Animation utility tokens (from motion-animation-* tokens)
  const animationTokens = groups.motion.filter((t) => t.name.startsWith('motion-animation-'));
  if (animationTokens.length > 0) {
    for (const token of animationTokens) {
      const animName = token.animationName || token.name.replace('motion-animation-', '');
      lines.push(`  --animate-${animName}: var(--rafters-animate-${animName});`);
    }
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * Generate :root block with actual token values for Studio HMR
 * Uses --rafters-* namespace so @theme block can reference via var()
 */
function generateVarsRootBlock(groups: GroupedTokens): string {
  const lines: string[] = [];
  lines.push(':root {');

  // Color scales
  if (groups.color.length > 0) {
    for (const token of groups.color) {
      const value = tokenValueToCSS(token);
      if (value === null) continue;
      lines.push(`  --rafters-color-${token.name}: ${value};`);
    }
    lines.push('');
  }

  // Spacing tokens
  if (groups.spacing.length > 0) {
    for (const token of groups.spacing) {
      const value = tokenValueToCSS(token);
      if (value === null) continue;
      lines.push(`  --rafters-spacing-${token.name}: ${value};`);
    }
    lines.push('');
  }

  // Typography tokens
  if (groups.typography.length > 0) {
    for (const token of groups.typography) {
      const value = tokenValueToCSS(token);
      if (value === null) continue;
      lines.push(`  --rafters-${token.name}: ${value};`);
      if (token.lineHeight) {
        lines.push(`  --rafters-${token.name}--line-height: ${token.lineHeight};`);
      }
    }
    lines.push('');
  }

  // Radius tokens
  if (groups.radius.length > 0) {
    for (const token of groups.radius) {
      const value = tokenValueToCSS(token);
      if (value === null) continue;
      lines.push(`  --rafters-radius-${token.name}: ${value};`);
    }
    lines.push('');
  }

  // Shadow tokens
  if (groups.shadow.length > 0) {
    for (const token of groups.shadow) {
      const value = tokenValueToCSS(token);
      if (value === null) continue;
      lines.push(`  --rafters-shadow-${token.name}: ${value};`);
    }
    lines.push('');
  }

  // Depth (z-index) tokens
  if (groups.depth.length > 0) {
    for (const token of groups.depth) {
      const value = tokenValueToCSS(token);
      if (value === null) continue;
      lines.push(`  --rafters-${token.name}: ${value};`);
    }
    lines.push('');
  }

  // Motion tokens
  if (groups.motion.length > 0) {
    for (const token of groups.motion) {
      const value = tokenValueToCSS(token);
      if (value === null) continue;
      lines.push(`  --rafters-${token.name}: ${value};`);
    }
    lines.push('');
  }

  // Breakpoint tokens
  if (groups.breakpoint.length > 0) {
    for (const token of groups.breakpoint) {
      const value = tokenValueToCSS(token);
      if (value === null) continue;
      lines.push(`  --rafters-${token.name}: ${value};`);
    }
    lines.push('');
  }

  // Elevation tokens
  if (groups.elevation.length > 0) {
    for (const token of groups.elevation) {
      const value = tokenValueToCSS(token);
      if (value === null) continue;
      lines.push(`  --rafters-${token.name}: ${value};`);
    }
    lines.push('');
  }

  // Focus tokens
  if (groups.focus.length > 0) {
    for (const token of groups.focus) {
      const value = tokenValueToCSS(token);
      if (value === null) continue;
      lines.push(`  --rafters-${token.name}: ${value};`);
    }
    lines.push('');
  }

  // Other tokens
  if (groups.other.length > 0) {
    for (const token of groups.other) {
      const value = tokenValueToCSS(token);
      if (value === null) continue;
      lines.push(`  --rafters-${token.name}: ${value};`);
    }
    lines.push('');
  }

  // Animation tokens
  const animationTokens = groups.motion.filter((t) => t.name.startsWith('motion-animation-'));
  if (animationTokens.length > 0) {
    for (const token of animationTokens) {
      const animName = token.animationName || token.name.replace('motion-animation-', '');
      lines.push(`  --rafters-animate-${animName}: ${token.value};`);
    }
    lines.push('');
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * Export registry tokens to static Tailwind CSS for Studio
 *
 * This produces the @theme block with var() references - processed once by Tailwind.
 * Used with registryToVars() for instant HMR in Studio:
 * - rafters.tailwind.css = this function (static, processed once)
 * - rafters.vars.css = registryToVars() (dynamic, instant HMR)
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
  const tokens = registry.list();

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

  // Article type system - @layer base with @apply compositions
  sections.push('');
  sections.push(generateArticleBaseLayer());

  return sections.join('\n');
}

/**
 * Export registry tokens to pure CSS variables for Studio HMR
 *
 * This produces only :root CSS variables - instant HMR without Tailwind reprocessing.
 * Used with registryToTailwindStatic() for instant HMR in Studio:
 * - rafters.tailwind.css = registryToTailwindStatic() (static, processed once)
 * - rafters.vars.css = this function (dynamic, instant HMR)
 *
 * @param registry - TokenRegistry containing tokens
 * @returns Pure CSS variables for HMR
 *
 * @example
 * ```typescript
 * // In Studio on token change
 * registry.setChangeCallback(async () => {
 *   const varsCSS = registryToVars(registry);
 *   await writeFile('.rafters/output/rafters.vars.css', varsCSS);
 *   // Vite HMR detects change, hot-reloads CSS instantly
 * });
 * ```
 */
export function registryToVars(registry: TokenRegistry): string {
  const tokens = registry.list();

  if (tokens.length === 0) {
    throw new Error('Registry is empty');
  }

  const groups = groupTokens(tokens);
  const sections: string[] = [];

  // :root block with actual token values (--rafters-* namespace)
  const varsBlock = generateVarsRootBlock(groups);
  sections.push(varsBlock);
  sections.push('');

  // Include semantic variable blocks for light/dark mode switching
  const rootBlock = generateRootBlock(groups.semantic);
  sections.push(rootBlock);

  return sections.join('\n');
}

/**
 * Options for compiled CSS export
 */
export interface CompiledCssOptions {
  /** Minify the output (default: true) */
  minify?: boolean;
  /** Include @import "tailwindcss" in source (default: true) */
  includeImport?: boolean;
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
  const { minify = true, includeImport = true } = options;

  // Generate the Tailwind theme CSS
  const themeCss = registryToTailwind(registry, { includeImport });

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

  // Create temp dir in the package location where tailwindcss can be resolved
  const tempDir = mkdtempSync(join(pkgDir, '.tmp-compile-'));
  const tempInput = join(tempDir, 'input.css');
  const tempOutput = join(tempDir, 'output.css');

  try {
    // Write theme CSS to temp file
    writeFileSync(tempInput, themeCss);

    // Run Tailwind CLI
    const args = [binPath, '-i', tempInput, '-o', tempOutput];
    if (minify) {
      args.push('--minify');
    }
    execFileSync('node', args, { stdio: 'pipe' });

    // Read and return compiled output
    return readFileSync(tempOutput, 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to compile CSS: ${message}`);
  } finally {
    // Clean up temp dir
    rmSync(tempDir, { recursive: true, force: true });
  }
}
