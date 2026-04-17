/**
 * Shadow DOM style definitions for Typography web component
 *
 * Parallel to typography.classes.ts (React variant). CSS property maps
 * instead of Tailwind class strings. Each variant references a single
 * composite typography role via --font-{role}-{family|size|weight|line-height|letter-spacing}
 * custom properties. The resolver in resolve-tokens.ts is responsible for
 * producing those values; this module only emits the var() references.
 *
 * TypographyTokenOverrides mirrors the shape of TypographyTokenProps from
 * typography.classes.ts. Each override resolves to a bare token reference
 * via tokenVar() (size/weight/color/line/tracking/family), or emits a
 * literal CSS value (align/transform). No raw var() calls -- always
 * through tokenVar(). No --duration-* or --ease-* -- always
 * --motion-duration-* and --motion-ease-* when motion is needed.
 */

import type { CSSProperties } from '../../primitives/classy-wc';
import { styleRule, stylesheet, tokenVar } from '../../primitives/classy-wc';

// ============================================================================
// Variant Surface
// ============================================================================

export type TypographyVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'p'
  | 'lead'
  | 'large'
  | 'small'
  | 'muted'
  | 'code'
  | 'blockquote'
  | 'ul'
  | 'ol'
  | 'li'
  | 'codeblock'
  | 'mark'
  | 'abbr';

/**
 * Variant -> composite typography role.
 * The role name drives the --font-{role}-{dimension} custom property
 * references emitted by compositeRoleProperties().
 */
export const variantToCompositeRole: Record<TypographyVariant, string> = {
  h1: 'display-large',
  h2: 'display-medium',
  h3: 'title-large',
  h4: 'title-medium',
  p: 'body-medium',
  lead: 'body-large',
  large: 'body-large',
  small: 'body-small',
  muted: 'body-small',
  code: 'code-small',
  blockquote: 'body-medium',
  ul: 'body-medium',
  ol: 'body-medium',
  li: 'body-medium',
  codeblock: 'code-small',
  mark: 'body-medium',
  abbr: 'body-medium',
};

/**
 * Variant -> semantic HTML tag (the element rendered inside shadow DOM).
 * Unknown variants fall back to 'p' at the caller layer -- NEVER throw.
 */
export const variantToTag: Record<TypographyVariant, string> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  p: 'p',
  lead: 'p',
  large: 'p',
  small: 'small',
  muted: 'p',
  code: 'code',
  blockquote: 'blockquote',
  ul: 'ul',
  ol: 'ol',
  li: 'li',
  codeblock: 'pre',
  mark: 'mark',
  abbr: 'abbr',
};

// ============================================================================
// Per-variant :host Display
// ============================================================================

/**
 * Headings, paragraphs, lists, blockquote, and codeblock flow as blocks.
 * small/code/mark/abbr are inline phrasing content.
 */
const INLINE_VARIANTS = new Set<TypographyVariant>(['small', 'code', 'mark', 'abbr']);

function hostDisplay(variant: TypographyVariant): CSSProperties {
  return { display: INLINE_VARIANTS.has(variant) ? 'inline' : 'block' };
}

// ============================================================================
// Composite Role Property Map
// ============================================================================

/**
 * Build the five composite dimension var() references for a role.
 * Each variant references these -- the resolver populates the real values.
 */
function compositeRoleProperties(role: string): CSSProperties {
  return {
    'font-family': tokenVar(`font-${role}-family`),
    'font-size': tokenVar(`font-${role}-size`),
    'font-weight': tokenVar(`font-${role}-weight`),
    'line-height': tokenVar(`font-${role}-line-height`),
    'letter-spacing': tokenVar(`font-${role}-letter-spacing`),
  };
}

// ============================================================================
// Variant Style Extensions (beyond the composite role defaults)
// ============================================================================

/**
 * Per-variant style extensions. These layer on top of the composite
 * role properties. Keys that also appear in the composite role map
 * (e.g. color) override for this variant.
 */
export const typographyVariantStyles: Record<TypographyVariant, CSSProperties> = {
  h1: {
    color: tokenVar('color-foreground'),
    margin: '0',
  },
  h2: {
    color: tokenVar('color-foreground'),
    margin: '0',
  },
  h3: {
    color: tokenVar('color-foreground'),
    margin: '0',
  },
  h4: {
    color: tokenVar('color-foreground'),
    margin: '0',
  },
  p: {
    color: tokenVar('color-foreground'),
    margin: '0',
  },
  lead: {
    color: tokenVar('color-muted-foreground'),
    margin: '0',
  },
  large: {
    'font-weight': tokenVar('font-weight-semibold'),
    color: tokenVar('color-foreground'),
    margin: '0',
  },
  small: {
    'font-weight': tokenVar('font-weight-medium'),
    color: tokenVar('color-foreground'),
  },
  muted: {
    color: tokenVar('color-muted-foreground'),
    margin: '0',
  },
  code: {
    'background-color': tokenVar('color-muted'),
    color: tokenVar('color-foreground'),
    'border-radius': tokenVar('radius-sm'),
    'padding-left': tokenVar('spacing-1'),
    'padding-right': tokenVar('spacing-1'),
    'padding-top': tokenVar('spacing-0-5'),
    'padding-bottom': tokenVar('spacing-0-5'),
  },
  blockquote: {
    color: tokenVar('color-foreground'),
    'border-left-width': '2px',
    'border-left-style': 'solid',
    'border-left-color': tokenVar('color-border'),
    'padding-left': tokenVar('spacing-6'),
    'font-style': 'italic',
    margin: '0',
  },
  ul: {
    color: tokenVar('color-foreground'),
    'list-style-type': 'disc',
    'margin-top': tokenVar('spacing-6'),
    'margin-bottom': tokenVar('spacing-6'),
    'margin-left': tokenVar('spacing-6'),
    'padding-left': '0',
  },
  ol: {
    color: tokenVar('color-foreground'),
    'list-style-type': 'decimal',
    'margin-top': tokenVar('spacing-6'),
    'margin-bottom': tokenVar('spacing-6'),
    'margin-left': tokenVar('spacing-6'),
    'padding-left': '0',
  },
  li: {
    color: tokenVar('color-foreground'),
    'margin-top': tokenVar('spacing-2'),
  },
  codeblock: {
    color: tokenVar('color-foreground'),
    'background-color': tokenVar('color-muted'),
    'border-radius': tokenVar('radius-lg'),
    padding: tokenVar('spacing-4'),
    'overflow-x': 'auto',
    margin: '0',
  },
  mark: {
    'background-color': tokenVar('color-accent'),
    color: tokenVar('color-accent-foreground'),
    'border-radius': tokenVar('radius-sm'),
    'padding-left': tokenVar('spacing-1'),
    'padding-right': tokenVar('spacing-1'),
  },
  abbr: {
    cursor: 'help',
    'text-decoration-line': 'underline',
    'text-decoration-style': 'dotted',
    'text-underline-offset': tokenVar('spacing-1'),
  },
};

// ============================================================================
// TypographyTokenOverrides
// ============================================================================

/**
 * Token-level overrides. Mirrors TypographyTokenProps from typography.classes.ts.
 * Each override has an explicit mapping to a CSS property:
 *   size -> font-size -> var(--font-size-{value})
 *   weight -> font-weight -> var(--font-weight-{value})
 *   color -> color -> var(--color-{value})
 *   line -> line-height -> var(--line-height-{value})
 *   tracking -> letter-spacing -> var(--letter-spacing-{value})
 *   family -> font-family -> var(--font-{value})
 *   align -> text-align -> literal value ({value})
 *   transform -> text-transform -> literal value ({value})
 */
export interface TypographyTokenOverrides {
  size?: string;
  weight?: string;
  color?: string;
  line?: string;
  tracking?: string;
  family?: string;
  align?: string;
  transform?: string;
}

/**
 * Convert override keys to CSS property assignments.
 * Size/weight/color/line/tracking/family resolve via tokenVar().
 * Align/transform emit the literal CSS value (per spec).
 */
export function tokenOverridesToProperties(overrides: TypographyTokenOverrides): CSSProperties {
  const out: CSSProperties = {};
  if (overrides.size) out['font-size'] = tokenVar(`font-size-${overrides.size}`);
  if (overrides.weight) out['font-weight'] = tokenVar(`font-weight-${overrides.weight}`);
  if (overrides.color) out.color = tokenVar(`color-${overrides.color}`);
  if (overrides.line) out['line-height'] = tokenVar(`line-height-${overrides.line}`);
  if (overrides.tracking) out['letter-spacing'] = tokenVar(`letter-spacing-${overrides.tracking}`);
  if (overrides.family) out['font-family'] = tokenVar(`font-${overrides.family}`);
  if (overrides.align) out['text-align'] = overrides.align;
  if (overrides.transform) out['text-transform'] = overrides.transform;
  return out;
}

// ============================================================================
// Stylesheet Assembly
// ============================================================================

/**
 * Build the complete typography stylesheet for a given variant + overrides.
 *
 * Emission order is deliberate -- later rules override earlier ones per the
 * CSS cascade. We split into three :host rules so every earlier reference
 * remains visible in the output even when a later layer overrides the same
 * property:
 *   1. Composite role references (--font-{role}-*)
 *   2. Per-variant style extensions (color, borders, padding, etc.)
 *   3. TypographyTokenOverrides (size/weight/color/line/tracking/family/align/transform)
 *
 * Unknown variants coerce to 'p'. NEVER throws.
 */
export function typographyStylesheet(
  options: { variant?: TypographyVariant; overrides?: TypographyTokenOverrides } = {},
): string {
  const variant = resolveVariant(options.variant);
  const overrides = options.overrides ?? {};
  const role = variantToCompositeRole[variant];
  const overrideProps = tokenOverridesToProperties(overrides);
  const hasOverrides = Object.keys(overrideProps).length > 0;

  return stylesheet(
    styleRule(':host', hostDisplay(variant)),
    styleRule(':host', compositeRoleProperties(role)),
    styleRule(':host', typographyVariantStyles[variant]),
    hasOverrides ? styleRule(':host', overrideProps) : '',
  );
}

/**
 * Coerce an arbitrary string to a known variant. Unknown values fall back
 * to 'p'. NEVER throws. Used by both typographyStylesheet and the
 * RaftersTypography element.
 */
export function resolveVariant(value: unknown): TypographyVariant {
  if (typeof value !== 'string' || value.length === 0) return 'p';
  if (value in variantToCompositeRole) return value as TypographyVariant;
  return 'p';
}
