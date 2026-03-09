/**
 * TypeScript Exporter
 *
 * Converts TokenRegistry contents to TypeScript constants and type definitions
 * for type-safe token access in code.
 *
 * Features:
 * - Const assertions for literal types
 * - Namespace-organized token objects
 * - Type aliases for each namespace
 * - Type-safe getToken helper function
 * - JSDoc comments from semanticMeaning
 */

import type { ColorReference, ColorValue, Token } from '@rafters/shared';
import type { TokenRegistry } from '../registry.js';

/**
 * Options for TypeScript export
 */
export interface TypeScriptExportOptions {
  /** Export format: 'const' for object literal, 'enum' for string enums */
  format?: 'const' | 'enum';
  /** Include JSDoc comments from semanticMeaning */
  includeJSDoc?: boolean;
}

/**
 * Convert a token value to TypeScript string representation
 */
function tokenValueToTS(token: Token): string {
  const { value } = token;

  // String values - JSON object/array strings are emitted as raw literals
  if (typeof value === 'string') {
    if (value.startsWith('{') || value.startsWith('[')) {
      return value;
    }
    return escapeStringValue(value);
  }

  // ColorValue - convert to OKLCH string
  if (typeof value === 'object' && value !== null) {
    if ('scale' in value) {
      const colorValue = value as ColorValue;
      // Return OKLCH string for the base color (position 500 = index 5)
      const baseColor = colorValue.scale[5];
      if (baseColor) {
        const oklch = `oklch(${baseColor.l.toFixed(3)} ${baseColor.c.toFixed(3)} ${baseColor.h.toFixed(1)})`;
        return escapeStringValue(oklch);
      }
      // Fallback: stringify the whole object
      return JSON.stringify(value);
    }
    // ColorReference - return as var() reference
    if ('family' in value && 'position' in value) {
      const ref = value as ColorReference;
      return escapeStringValue(`var(--color-${ref.family}-${ref.position})`);
    }
    // Other objects: stringify
    return JSON.stringify(value);
  }

  // Numbers, booleans, etc.
  return String(value);
}

/**
 * Escape a string value for TypeScript output
 * Uses double quotes if value contains single quotes, otherwise single quotes
 */
function escapeStringValue(value: string): string {
  if (value.includes("'") && !value.includes('"')) {
    // Use double quotes
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  // Use single quotes
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/**
 * Convert namespace name to PascalCase for type name
 */
function namespaceToTypeName(namespace: string): string {
  return namespace
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Group tokens by namespace
 */
function groupByNamespace(tokens: Token[]): Map<string, Token[]> {
  const groups = new Map<string, Token[]>();

  for (const token of tokens) {
    const namespace = token.namespace;
    if (!groups.has(namespace)) {
      groups.set(namespace, []);
    }
    groups.get(namespace)?.push(token);
  }

  return groups;
}

/**
 * Generate the tokens object literal
 */
function generateTokensObject(
  tokensByNamespace: Map<string, Token[]>,
  includeJSDoc: boolean,
): string {
  const lines: string[] = [];
  lines.push('export const tokens = {');

  const namespaces = Array.from(tokensByNamespace.keys()).sort();

  for (const namespace of namespaces) {
    const tokens = tokensByNamespace.get(namespace) || [];
    lines.push(`  ${namespace}: {`);

    for (const token of tokens) {
      const value = tokenValueToTS(token);

      // Add JSDoc comment if enabled and semanticMeaning exists
      if (includeJSDoc && token.semanticMeaning) {
        lines.push(`    /** ${token.semanticMeaning} */`);
      }

      lines.push(`    '${token.name}': ${value},`);
    }

    lines.push('  },');
  }

  lines.push('} as const;');
  return lines.join('\n');
}

/**
 * Generate type aliases for each namespace
 */
function generateTypeAliases(namespaces: string[]): string {
  const lines: string[] = [];

  // TokenNamespace type
  lines.push('export type TokenNamespace = keyof typeof tokens;');
  lines.push('');

  // Individual namespace types
  for (const namespace of namespaces) {
    const typeName = `${namespaceToTypeName(namespace)}Token`;
    lines.push(`export type ${typeName} = keyof typeof tokens.${namespace};`);
  }

  // Union of all token names
  if (namespaces.length > 0) {
    lines.push('');
    const typeUnion = namespaces.map((ns) => `${namespaceToTypeName(ns)}Token`).join('\n  | ');
    lines.push(`export type TokenName =`);
    lines.push(`  | ${typeUnion};`);
  }

  return lines.join('\n');
}

/**
 * Generate the getToken helper function
 */
function generateGetTokenFunction(): string {
  return `
/** Get a token value by namespace and name */
export function getToken<N extends TokenNamespace>(
  namespace: N,
  name: keyof typeof tokens[N]
): (typeof tokens)[N][typeof name] {
  return tokens[namespace][name];
}`;
}

/**
 * Export tokens to TypeScript format
 *
 * @param tokens - Array of tokens to export
 * @param options - Export options
 * @returns TypeScript source code string
 *
 * @example
 * ```typescript
 * import { generateBaseSystem } from '@rafters/design-tokens';
 * import { tokensToTypeScript } from '@rafters/design-tokens/exporters';
 *
 * const result = generateBaseSystem();
 * const ts = tokensToTypeScript(result.allTokens, { includeJSDoc: true });
 *
 * // Write to file
 * fs.writeFileSync('tokens.ts', ts);
 * ```
 */
export function tokensToTypeScript(tokens: Token[], options: TypeScriptExportOptions = {}): string {
  const { includeJSDoc = false } = options;

  // Handle empty registry
  if (tokens.length === 0) {
    return `/* Generated by Rafters - DO NOT EDIT */

export const tokens = {} as const;

export type TokenNamespace = keyof typeof tokens;

export type TokenName = never;

/** Get a token value by namespace and name */
export function getToken<N extends TokenNamespace>(
  namespace: N,
  name: keyof typeof tokens[N]
): (typeof tokens)[N][typeof name] {
  return tokens[namespace][name];
}
`;
  }

  const tokensByNamespace = groupByNamespace(tokens);
  const namespaces = Array.from(tokensByNamespace.keys()).sort();

  const sections: string[] = [];

  // Header
  sections.push('/* Generated by Rafters - DO NOT EDIT */');
  sections.push('');

  // Tokens object
  sections.push(generateTokensObject(tokensByNamespace, includeJSDoc));
  sections.push('');

  // Type aliases
  sections.push(generateTypeAliases(namespaces));

  // getToken helper
  sections.push(generateGetTokenFunction());
  sections.push('');

  return sections.join('\n');
}

/**
 * Export registry tokens to TypeScript format
 *
 * This is the interface required by issue #394.
 *
 * @param registry - TokenRegistry containing tokens
 * @param options - Export options
 * @returns TypeScript source code string
 *
 * @example
 * ```typescript
 * import { TokenRegistry } from '@rafters/design-tokens';
 * import { registryToTypeScript } from '@rafters/design-tokens/exporters';
 *
 * const registry = new TokenRegistry(tokens);
 * const ts = registryToTypeScript(registry, { includeJSDoc: true });
 *
 * await writeFile('.rafters/output/tokens.ts', ts);
 *
 * // Usage in application:
 * import { tokens, getToken } from './.rafters/output/tokens';
 *
 * const primary = tokens.semantic.primary; // Type: 'var(--color-ocean-blue-500)'
 * const spacing = getToken('spacing', '4'); // Type: '1rem'
 * ```
 */
export function registryToTypeScript(
  registry: TokenRegistry,
  options?: TypeScriptExportOptions,
): string {
  const tokens = registry.list();
  return tokensToTypeScript(tokens, options);
}
