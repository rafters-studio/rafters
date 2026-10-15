/**
 * DTCG Token Resolver
 *
 * Reads DTCG JSON token data and resolves token names to CSS property values.
 * Used by classy-wc and rafters-element to generate scoped shadow DOM styles
 * from the design token system without any Tailwind dependency.
 *
 * The DTCG JSON is consumed at build time. No JSON ships to the browser.
 */

interface DTCGToken {
  $value: unknown;
  $type?: string;
  $description?: string;
  $extensions?: Record<string, unknown>;
}

interface FlatDTCGMap {
  [tokenName: string]: DTCGToken;
}

/**
 * Structured error data shape for resolver failures.
 * Attached to plain Error instances via Object.assign -- no OOP error class hierarchies.
 */
export type ResolveTokenError =
  | { kind: 'cycle'; chain: string[] }
  | { kind: 'max-depth'; chain: string[]; depth: number }
  | { kind: 'invalid-composite'; name: string; reason: string };

/**
 * Map of CSS property names to their resolved values.
 * Produced by resolveComposite() for typography composite tokens.
 */
export type CSSPropertyMap = Record<string, string>;

/**
 * Maximum depth for walking chained DTCG references.
 * Guards against runaway recursion on pathological reference chains.
 */
export const MAX_REFERENCE_DEPTH = 16;

/**
 * DTCG reference syntax: "{group.token}" or "{group.sub.token}".
 * Braces wrap a dot-path into the nested token tree.
 */
const DTCG_REFERENCE_PATTERN = /^\{[^{}]+\}$/;

/**
 * Shape of the JSON payload stored in a typography composite token's $value.
 * Matches the payload written by `generateTypographyCompositeUtilities` in
 * packages/design-tokens/src/exporters/tailwind.ts.
 */
interface TypographyCompositePayload {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  responsive?: Record<string, { fontSize?: string }>;
}

/**
 * CSS property mappings for token categories.
 * Maps token name prefixes to the CSS properties they control.
 */
const TOKEN_CSS_MAP: Record<string, string> = {
  'font-size': 'font-size',
  'font-weight': 'font-weight',
  'font-sans': 'font-family',
  'font-serif': 'font-family',
  'font-mono': 'font-family',
  'font-heading': 'font-family',
  'font-body': 'font-family',
  'font-code': 'font-family',
  'line-height': 'line-height',
  'letter-spacing': 'letter-spacing',
  spacing: 'gap',
  radius: 'border-radius',
  shadow: 'box-shadow',
};

/**
 * Resolve a token name prefix to its CSS property.
 */
function tokenToProperty(name: string): string | undefined {
  for (const [prefix, property] of Object.entries(TOKEN_CSS_MAP)) {
    if (name === prefix || name.startsWith(`${prefix}-`)) {
      return property;
    }
  }
  return undefined;
}

/**
 * Convert a DTCG reference string like "{color.primary.500}" to a flat map key
 * like "color-primary-500". Returns null if the input is not a reference.
 */
function referenceToFlatKey(value: unknown): string | null {
  if (typeof value !== 'string' || !DTCG_REFERENCE_PATTERN.test(value)) {
    return null;
  }
  return value.slice(1, -1).replaceAll('.', '-');
}

/**
 * Build a plain Error with structured ResolveTokenError fields attached.
 * Per convention (feedback_no_error_classes) we never create error subclasses.
 */
function raiseResolveTokenError(message: string, data: ResolveTokenError): never {
  throw Object.assign(new Error(message), data);
}

/**
 * Token resolver that maps design token names to CSS values.
 */
export class TokenResolver {
  private tokens: FlatDTCGMap;

  constructor(dtcgJson: FlatDTCGMap) {
    this.tokens = dtcgJson;
  }

  /**
   * Get the raw value of a token by name.
   */
  get(name: string): unknown | undefined {
    return this.tokens[name]?.$value;
  }

  /**
   * Get the DTCG type of a token.
   */
  type(name: string): string | undefined {
    return this.tokens[name]?.$type;
  }

  /**
   * Resolve a token name to a CSS property-value pair.
   * Walks DTCG references (e.g. "{spacing.base}") to their leaf scalar.
   * Returns null if the token doesn't exist, is a typography composite
   * (callers use resolveComposite), or can't be mapped to a CSS property.
   */
  resolve(name: string): { property: string; value: string } | null {
    const token = this.tokens[name];
    if (!token) return null;

    // Typography composites have object/JSON payloads that don't map to a
    // single CSS property -- callers must invoke resolveComposite directly.
    if (token.$type === 'typography') return null;

    const property = tokenToProperty(name);
    if (!property) return null;

    const raw = token.$value;

    // Reference value: walk to leaf then use that scalar.
    if (typeof raw === 'string' && DTCG_REFERENCE_PATTERN.test(raw)) {
      const resolved = this.resolveReference(raw);
      if (resolved === null) return null;
      return { property, value: resolved };
    }

    if (typeof raw !== 'string' && typeof raw !== 'number') return null;

    return { property, value: String(raw) };
  }

  /**
   * Resolve a semantic color token to its CSS value.
   * Walks DTCG references so `color-button-bg` whose $value is
   * `{color.primary.500}` yields the leaf OKLCH string.
   */
  resolveColor(name: string): string | null {
    const token = this.tokens[name];
    if (!token) return null;

    const value = token.$value;
    if (typeof value !== 'string') return null;

    if (DTCG_REFERENCE_PATTERN.test(value)) {
      return this.resolveReference(value);
    }

    return value;
  }

  /**
   * Resolve a spacing token to its CSS value.
   */
  resolveSpacing(name: string): string | null {
    const fullName = name.startsWith('spacing-') ? name : `spacing-${name}`;
    const value = this.get(fullName);
    return typeof value === 'string' ? value : null;
  }

  /**
   * Resolve a radius token to its CSS value.
   */
  resolveRadius(name: string): string | null {
    const fullName = name.startsWith('radius-') ? name : `radius-${name}`;
    const value = this.get(fullName);
    return typeof value === 'string' ? value : null;
  }

  /**
   * Walk a DTCG reference (e.g. "{color.primary.500}") to its leaf $value.
   *
   * Returns null when:
   * - `value` is not a string
   * - `value` is not a DTCG reference shape
   * - the referenced token is not registered
   *
   * Throws a plain Error with {@link ResolveTokenError} fields on cycles or
   * when depth exceeds {@link MAX_REFERENCE_DEPTH}.
   */
  resolveReference(value: unknown): string | null {
    const firstKey = referenceToFlatKey(value);
    if (firstKey === null) return null;

    const chain: string[] = [];
    const seen = new Set<string>();
    let currentKey = firstKey;

    for (let depth = 0; depth <= MAX_REFERENCE_DEPTH; depth++) {
      chain.push(currentKey);

      if (seen.has(currentKey)) {
        raiseResolveTokenError(`reference cycle: ${chain.join(' -> ')}`, {
          kind: 'cycle',
          chain: [...chain],
        });
      }
      seen.add(currentKey);

      const token = this.tokens[currentKey];
      if (!token) {
        // Missing target -- first-hop returns null per spec; mid-chain also returns null.
        return null;
      }

      const nextKey = referenceToFlatKey(token.$value);
      if (nextKey === null) {
        // Reached a non-reference leaf: coerce to string and return.
        const raw = token.$value;
        if (raw === undefined || raw === null) return null;
        if (typeof raw !== 'string' && typeof raw !== 'number') return null;
        return String(raw);
      }

      currentKey = nextKey;
    }

    // Loop exited without returning a leaf -- depth budget exhausted.
    raiseResolveTokenError(
      `reference depth exceeded (${MAX_REFERENCE_DEPTH}): ${chain.join(' -> ')}`,
      {
        kind: 'max-depth',
        chain: [...chain],
        depth: MAX_REFERENCE_DEPTH,
      },
    );
  }

  /**
   * Resolve a typography composite token to a CSS property map.
   *
   * The composite's $value is a JSON string with shape
   * `{ fontFamily, fontSize, fontWeight, lineHeight, letterSpacing, responsive? }`.
   * Each member is looked up via its flat DTCG key (e.g. `font-size-${fontSize}`)
   * and reference-walked via {@link resolveReference}. Missing member tokens are
   * omitted from the output. A missing composite root returns null.
   *
   * The `responsive` substructure is out of scope for this pass.
   *
   * @throws a plain Error with {@link ResolveTokenError} (kind: 'invalid-composite')
   * when the payload fails to parse or lacks required keys.
   */
  resolveComposite(name: string): CSSPropertyMap | null {
    const token = this.tokens[name];
    if (!token) return null;
    if (token.$type !== 'typography') return null;

    const raw = token.$value;
    if (typeof raw !== 'string') {
      raiseResolveTokenError(`typography composite "${name}" has non-string $value`, {
        kind: 'invalid-composite',
        name,
        reason: 'non-string $value',
      });
    }

    let payload: TypographyCompositePayload;
    try {
      payload = JSON.parse(raw) as TypographyCompositePayload;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown parse error';
      raiseResolveTokenError(`typography composite "${name}" $value is not valid JSON: ${reason}`, {
        kind: 'invalid-composite',
        name,
        reason: `invalid JSON (${reason})`,
      });
    }

    if (typeof payload !== 'object' || payload === null) {
      raiseResolveTokenError(`typography composite "${name}" payload is not an object`, {
        kind: 'invalid-composite',
        name,
        reason: 'payload is not an object',
      });
    }

    const requiredKeys = [
      'fontFamily',
      'fontSize',
      'fontWeight',
      'lineHeight',
      'letterSpacing',
    ] as const;
    for (const key of requiredKeys) {
      if (typeof payload[key] !== 'string') {
        raiseResolveTokenError(`typography composite "${name}" missing required key "${key}"`, {
          kind: 'invalid-composite',
          name,
          reason: `missing required key "${key}"`,
        });
      }
    }

    const members: Array<[string, string]> = [
      ['font-family', `font-${payload.fontFamily}`],
      ['font-size', `font-size-${payload.fontSize}`],
      ['font-weight', `font-weight-${payload.fontWeight}`],
      ['line-height', `line-height-${payload.lineHeight}`],
      ['letter-spacing', `letter-spacing-${payload.letterSpacing}`],
    ];

    const out: CSSPropertyMap = {};
    for (const [cssProperty, memberKey] of members) {
      const memberToken = this.tokens[memberKey];
      if (!memberToken) continue;

      const memberValue = memberToken.$value;
      let resolved: string | null = null;

      if (typeof memberValue === 'string' && DTCG_REFERENCE_PATTERN.test(memberValue)) {
        resolved = this.resolveReference(memberValue);
      } else if (typeof memberValue === 'string' || typeof memberValue === 'number') {
        resolved = String(memberValue);
      }

      if (resolved !== null) {
        out[cssProperty] = resolved;
      }
    }

    return out;
  }

  /**
   * Resolve multiple token names to a CSS declarations string.
   * Used by WC components to generate scoped style blocks.
   */
  toCSS(tokenNames: string[]): string {
    const declarations: string[] = [];
    for (const name of tokenNames) {
      const resolved = this.resolve(name);
      if (resolved) {
        declarations.push(`${resolved.property}: ${resolved.value};`);
      }
    }
    return declarations.join('\n  ');
  }

  /**
   * Check if a token exists in the registry.
   */
  has(name: string): boolean {
    return name in this.tokens;
  }

  /**
   * List all token names.
   */
  names(): string[] {
    return Object.keys(this.tokens);
  }
}

/**
 * Create a TokenResolver from a flat DTCG JSON object.
 * Use toDTCG(tokens, { nested: false }) to generate the input.
 */
export function createResolver(dtcgJson: FlatDTCGMap): TokenResolver {
  return new TokenResolver(dtcgJson);
}
