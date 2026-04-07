/**
 * classy-wc -- CSS composition for Web Component shadow DOM
 *
 * The WC companion to classy.ts. Where classy composes Tailwind class strings,
 * classy-wc composes CSS property maps into scoped stylesheet text for shadow roots.
 *
 * Components use .styles.ts files (parallel to .classes.ts) that export
 * CSSProperties maps. classy-wc composes these into CSS rule blocks.
 *
 * No Tailwind dependency. Token values come from DTCG JSON via the shared
 * token stylesheet set on RaftersElement.
 */

// ============================================================================
// Types
// ============================================================================

/** CSS property-value map using kebab-case property names */
export type CSSProperties = Record<string, string>;

/**
 * Input types for style composition.
 * Mirrors classy's flexible input pattern.
 */
export type StyleInput = CSSProperties | string | StyleInput[] | null | undefined | false;

/**
 * Conditional style map -- keys are CSS property names, values are included
 * only when the associated condition is truthy.
 */
export type ConditionalStyles = Record<string, [condition: unknown, value: string]>;

// ============================================================================
// Core Composition
// ============================================================================

/**
 * Flatten nested StyleInput arrays into a flat list of non-null entries.
 */
function flattenInputs(
  inputs: StyleInput[],
  out: Array<CSSProperties | string> = [],
): Array<CSSProperties | string> {
  for (const input of inputs) {
    if (input == null || input === false) continue;
    if (Array.isArray(input)) {
      flattenInputs(input, out);
    } else {
      out.push(input);
    }
  }
  return out;
}

/**
 * Merge CSS property maps. Later entries override earlier ones (cascade order).
 * String inputs are treated as raw CSS declaration blocks and appended as-is.
 */
function mergeProperties(inputs: Array<CSSProperties | string>): {
  props: CSSProperties;
  raw: string[];
} {
  const props: CSSProperties = {};
  const raw: string[] = [];

  for (const input of inputs) {
    if (typeof input === 'string') {
      raw.push(input);
    } else {
      for (const [property, value] of Object.entries(input)) {
        props[property] = value;
      }
    }
  }

  return { props, raw };
}

/**
 * Render a CSSProperties map to a CSS declarations string.
 */
function renderDeclarations(props: CSSProperties, indent = '  '): string {
  return Object.entries(props)
    .map(([prop, val]) => `${indent}${prop}: ${val};`)
    .join('\n');
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Compose CSS property maps into a declarations string (no selector wrapper).
 *
 * @example
 * ```ts
 * composeDeclarations(
 *   { 'background-color': 'var(--color-card)', 'color': 'var(--color-card-foreground)' },
 *   { 'border-radius': 'var(--radius-lg)' }
 * );
 * // "background-color: var(--color-card);\n  color: var(--color-card-foreground);\n  border-radius: var(--radius-lg);"
 * ```
 */
export function composeDeclarations(...inputs: StyleInput[]): string {
  const flat = flattenInputs(inputs);
  const { props, raw } = mergeProperties(flat);
  const parts: string[] = [];

  const rendered = renderDeclarations(props);
  if (rendered) parts.push(rendered);

  for (const r of raw) {
    parts.push(`  ${r.trim()}`);
  }

  return parts.join('\n');
}

/**
 * Build a complete CSS rule block with a selector.
 *
 * @example
 * ```ts
 * styleRule(':host', { display: 'block', 'background-color': 'var(--color-card)' });
 * // ":host {\n  display: block;\n  background-color: var(--color-card);\n}"
 *
 * styleRule(':host(:hover)', { 'background-color': 'var(--color-card-hover)' });
 * // ":host(:hover) {\n  background-color: var(--color-card-hover);\n}"
 * ```
 */
export function styleRule(selector: string, ...inputs: StyleInput[]): string {
  const body = composeDeclarations(...inputs);
  if (!body.trim()) return '';
  return `${selector} {\n${body}\n}`;
}

/**
 * Build a complete component stylesheet from multiple rules.
 * Filters out empty rules.
 *
 * @example
 * ```ts
 * stylesheet(
 *   styleRule(':host', cardBase),
 *   styleRule('.header', cardHeader),
 *   styleRule(':host(:hover)', cardHover),
 * );
 * ```
 */
export function stylesheet(...rules: string[]): string {
  return rules.filter((r) => r.trim()).join('\n\n');
}

/**
 * Conditionally include style inputs.
 * Returns the inputs if condition is truthy, null otherwise.
 *
 * @example
 * ```ts
 * styleRule(':host', cardBase, when(isInteractive, cardInteractive));
 * ```
 */
export function when(condition: unknown, ...inputs: StyleInput[]): StyleInput {
  return condition ? inputs : null;
}

/**
 * Pick properties from a style map based on a condition map.
 * Useful for variant-driven style selection.
 *
 * @example
 * ```ts
 * const variants = {
 *   default: { 'background-color': 'var(--color-primary)', color: 'var(--color-primary-foreground)' },
 *   destructive: { 'background-color': 'var(--color-destructive)', color: 'var(--color-destructive-foreground)' },
 * };
 * styleRule(':host', baseStyles, pick(variants, variant));
 * ```
 */
export function pick<K extends string>(
  map: Record<K, CSSProperties>,
  key: K | undefined,
  fallback?: K,
): StyleInput {
  if (key && key in map) return map[key];
  if (fallback && fallback in map) return map[fallback];
  return null;
}

/**
 * Wrap rules in a media query or other at-rule block.
 *
 * @example
 * ```ts
 * atRule('@media (prefers-reduced-motion: reduce)',
 *   styleRule(':host', { transition: 'none' })
 * );
 * ```
 */
export function atRule(query: string, ...rules: string[]): string {
  const inner = rules.filter((r) => r.trim()).join('\n\n');
  if (!inner) return '';
  // Indent inner rules
  const indented = inner
    .split('\n')
    .map((line) => (line.trim() ? `  ${line}` : line))
    .join('\n');
  return `${query} {\n${indented}\n}`;
}

/**
 * Create a reusable style mixin (a function that returns CSSProperties).
 * Convenience for documenting composable style fragments.
 *
 * @example
 * ```ts
 * const focusRing = mixin({
 *   outline: 'none',
 *   'box-shadow': '0 0 0 2px var(--color-ring)',
 * });
 * styleRule(':host(:focus-visible)', baseStyles, focusRing);
 * ```
 */
export function mixin(properties: CSSProperties): CSSProperties {
  return properties;
}

// ============================================================================
// Token-Aware Helpers
// ============================================================================

/**
 * Reference a design token as a CSS custom property.
 * Generates var(--{name}) with optional fallback.
 *
 * @example
 * ```ts
 * tokenVar('color-primary');        // "var(--color-primary)"
 * tokenVar('color-card', '#fff');   // "var(--color-card, #fff)"
 * ```
 */
export function tokenVar(name: string, fallback?: string): string {
  return fallback ? `var(--${name}, ${fallback})` : `var(--${name})`;
}

/**
 * Build a transition shorthand from token-aware values.
 *
 * @example
 * ```ts
 * transition(['background-color', 'box-shadow'], '150ms');
 * // "background-color 150ms, box-shadow 150ms"
 * ```
 */
export function transition(properties: string[], duration: string, easing = 'ease'): string {
  return properties.map((p) => `${p} ${duration} ${easing}`).join(', ');
}
