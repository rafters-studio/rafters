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
   * Returns null if the token doesn't exist or can't be resolved.
   */
  resolve(name: string): { property: string; value: string } | null {
    const token = this.tokens[name];
    if (!token) return null;

    const value = token.$value;
    if (typeof value !== 'string' && typeof value !== 'number') return null;

    const property = tokenToProperty(name);
    if (!property) return null;

    return { property, value: String(value) };
  }

  /**
   * Resolve a semantic color token to its CSS value.
   * Handles both direct values and DTCG references.
   */
  resolveColor(name: string): string | null {
    const token = this.tokens[name];
    if (!token) return null;

    const value = token.$value;
    if (typeof value === 'string') return value;
    return null;
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
