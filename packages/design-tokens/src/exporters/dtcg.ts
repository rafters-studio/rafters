/**
 * DTCG Format Converter
 *
 * Converts Rafters Token[] to W3C Design Tokens Community Group (DTCG) format.
 * This is the input format for Style Dictionary and other token tools.
 *
 * DTCG Format:
 * - $value: The token value
 * - $type: The token type (color, dimension, duration, etc.)
 * - $description: Human-readable description
 * - $extensions: Vendor-specific metadata (rafters intelligence data)
 *
 * @see https://design-tokens.github.io/community-group/format/
 */

import type { ColorReference, ColorValue, DTCGFile, DTCGGroup, Token } from '@rafters/shared';

/**
 * DTCG Token Types as defined by the W3C spec
 */
type DTCGType =
  | 'color'
  | 'dimension'
  | 'fontFamily'
  | 'fontWeight'
  | 'duration'
  | 'cubicBezier'
  | 'number'
  | 'strokeStyle'
  | 'border'
  | 'transition'
  | 'shadow'
  | 'gradient'
  | 'typography';

/**
 * Map Rafters token categories to DTCG types
 */
function categoryToDTCGType(category: string, token: Token): DTCGType | undefined {
  const categoryMap: Record<string, DTCGType> = {
    color: 'color',
    spacing: 'dimension',
    radius: 'dimension',
    shadow: 'shadow',
    typography: 'typography',
    'font-size': 'dimension',
    'font-weight': 'fontWeight',
    'font-family': 'fontFamily',
    'line-height': 'number',
    duration: 'duration',
    easing: 'cubicBezier',
    delay: 'duration',
    motion: 'duration',
    breakpoint: 'dimension',
    depth: 'number',
    elevation: 'number',
    focus: 'dimension',
  };

  // Check for specific token types based on name patterns
  if (token.name.includes('easing') || token.easingCurve) {
    return 'cubicBezier';
  }
  if (token.name.includes('duration') || token.name.includes('delay')) {
    return 'duration';
  }
  if (token.name.includes('depth') || token.name.includes('z-')) {
    return 'number';
  }

  return categoryMap[category];
}

/**
 * Convert a token value to DTCG-compatible format
 */
function convertValue(token: Token): unknown {
  const { value, easingCurve } = token;

  // Easing curves use cubicBezier format
  if (easingCurve) {
    return easingCurve;
  }

  // ColorValue objects need special handling
  if (typeof value === 'object' && value !== null) {
    // ColorValue - extract the scale or reference
    if ('scale' in value) {
      const colorValue = value as ColorValue;
      // Return OKLCH string for the base color (position 500 = index 5)
      const baseColor = colorValue.scale[5];
      if (baseColor) {
        return `oklch(${baseColor.l} ${baseColor.c} ${baseColor.h})`;
      }
    }
    // ColorReference - return as DTCG reference
    if ('family' in value && 'position' in value) {
      const ref = value as ColorReference;
      return `{color.${ref.family}.${ref.position}}`;
    }
  }

  // String values pass through
  return value;
}

/**
 * Build Rafters-specific extension data for a token
 */
function buildExtensions(token: Token): Record<string, unknown> {
  const extensions: Record<string, unknown> = {};

  // Core intelligence metadata
  if (token.semanticMeaning) {
    extensions.semanticMeaning = token.semanticMeaning;
  }
  if (token.usageContext) {
    extensions.usageContext = token.usageContext;
  }
  if (token.usagePatterns) {
    extensions.usagePatterns = token.usagePatterns;
  }

  // Dependency tracking
  if (token.dependsOn && token.dependsOn.length > 0) {
    extensions.dependsOn = token.dependsOn;
  }
  if (token.progressionSystem) {
    extensions.progressionSystem = token.progressionSystem;
  }
  if (token.mathRelationship) {
    extensions.mathRelationship = token.mathRelationship;
  }
  if (token.scalePosition !== undefined) {
    extensions.scalePosition = token.scalePosition;
  }

  // Responsive behavior
  if (token.containerQueryAware !== undefined) {
    extensions.containerQueryAware = token.containerQueryAware;
  }
  if (token.reducedMotionAware) {
    extensions.reducedMotionAware = token.reducedMotionAware;
  }

  // Motion metadata
  if (token.motionIntent) {
    extensions.motionIntent = token.motionIntent;
  }
  if (token.easingName) {
    extensions.easingName = token.easingName;
  }

  // Export hints
  if (token.generateUtilityClass !== undefined) {
    extensions.generateUtilityClass = token.generateUtilityClass;
  }
  if (token.tailwindOverride) {
    extensions.tailwindOverride = token.tailwindOverride;
  }
  if (token.customPropertyOnly) {
    extensions.customPropertyOnly = token.customPropertyOnly;
  }

  // Designer intent (the "why" layer)
  if (token.userOverride) {
    extensions.userOverride = token.userOverride;
  }
  if (token.computedValue !== undefined) {
    extensions.computedValue = convertValue({ ...token, value: token.computedValue } as Token);
  }
  if (token.generationRule) {
    extensions.generationRule = token.generationRule;
  }

  // Design system relationships
  if (token.pairedWith && token.pairedWith.length > 0) {
    extensions.pairedWith = token.pairedWith;
  }
  if (token.conflictsWith && token.conflictsWith.length > 0) {
    extensions.conflictsWith = token.conflictsWith;
  }
  if (token.applicableComponents && token.applicableComponents.length > 0) {
    extensions.applicableComponents = token.applicableComponents;
  }
  if (token.requiredForComponents && token.requiredForComponents.length > 0) {
    extensions.requiredForComponents = token.requiredForComponents;
  }

  // Only include extensions if there's data
  return Object.keys(extensions).length > 0 ? { rafters: extensions } : {};
}

/**
 * Convert a single Token to DTCG format
 */
function tokenToDTCG(token: Token): Record<string, unknown> {
  const dtcgToken: Record<string, unknown> = {
    $value: convertValue(token),
  };

  // Add type if determinable
  const type = categoryToDTCGType(token.category, token);
  if (type) {
    dtcgToken.$type = type;
  }

  // Add description
  if (token.description) {
    dtcgToken.$description = token.description;
  } else if (token.semanticMeaning) {
    dtcgToken.$description = token.semanticMeaning;
  }

  // Add deprecation marker
  if (token.deprecated) {
    dtcgToken.$deprecated = true;
  }

  // Add extensions
  const extensions = buildExtensions(token);
  if (Object.keys(extensions).length > 0) {
    dtcgToken.$extensions = extensions;
  }

  return dtcgToken;
}

/**
 * Parse a token name into path segments
 * e.g., "color-neutral-500" -> ["color", "neutral", "500"]
 * e.g., "spacing-lg" -> ["spacing", "lg"]
 */
function parseTokenPath(name: string): string[] {
  return name.split('-');
}

/**
 * Set a value at a nested path in an object, creating groups as needed
 */
function setNestedValue(obj: DTCGGroup, path: string[], value: Record<string, unknown>): void {
  let current = obj;

  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (key === undefined) continue;

    if (!(key in current)) {
      current[key] = {} as DTCGGroup;
    }
    current = current[key] as DTCGGroup;
  }

  const lastKey = path[path.length - 1];
  if (lastKey !== undefined) {
    current[lastKey] = value;
  }
}

/**
 * Options for DTCG conversion
 */
export interface ToDTCGOptions {
  /**
   * Whether to nest tokens by their path segments
   * Default: true
   *
   * true: { color: { neutral: { 500: { $value: ... } } } }
   * false: { "color-neutral-500": { $value: ... } }
   */
  nested?: boolean;

  /**
   * Whether to apply $type to groups when all children share the same type
   * Default: true
   */
  applyTypesToGroup?: boolean;

  /**
   * Include Rafters-specific extensions in $extensions
   * Default: true
   */
  includeExtensions?: boolean;
}

/**
 * Apply $type to groups where all children share the same type
 */
function applyTypesToGroups(obj: DTCGGroup): void {
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$')) continue;

    const child = obj[key];
    if (typeof child !== 'object' || child === null) continue;

    // Recursively process children first
    applyTypesToGroups(child as DTCGGroup);

    // Collect types from direct children
    const childTypes = new Set<string>();
    for (const childKey of Object.keys(child)) {
      if (childKey.startsWith('$')) continue;
      const grandchild = (child as Record<string, unknown>)[childKey];
      if (typeof grandchild === 'object' && grandchild !== null) {
        const type = (grandchild as Record<string, unknown>).$type;
        if (type) {
          childTypes.add(type as string);
        }
      }
    }

    // If all children have the same type, move it to the group
    if (childTypes.size === 1) {
      const commonType = Array.from(childTypes)[0];
      (child as Record<string, unknown>).$type = commonType;

      // Remove $type from children
      for (const childKey of Object.keys(child)) {
        if (childKey.startsWith('$')) continue;
        const grandchild = (child as Record<string, unknown>)[childKey];
        if (typeof grandchild === 'object' && grandchild !== null) {
          delete (grandchild as Record<string, unknown>).$type;
        }
      }
    }
  }
}

/**
 * Convert Token[] to DTCG format
 *
 * This creates a structured DTCG file that can be used directly with
 * Style Dictionary or other design token tools.
 *
 * @param tokens - Array of Rafters tokens
 * @param options - Conversion options
 * @returns DTCG-formatted object
 *
 * @example
 * ```typescript
 * import { generateBaseSystem } from '@rafters/design-tokens';
 * import { toDTCG } from '@rafters/design-tokens/exporters';
 *
 * const result = generateBaseSystem();
 * const dtcg = toDTCG(result.allTokens);
 *
 * // Write to file for Style Dictionary
 * fs.writeFileSync('tokens.json', JSON.stringify(dtcg, null, 2));
 * ```
 */
export function toDTCG(tokens: Token[], options: ToDTCGOptions = {}): DTCGFile {
  const { nested = true, applyTypesToGroup = true, includeExtensions = true } = options;

  const result: DTCGGroup = {};

  for (const token of tokens) {
    const dtcgToken = tokenToDTCG(token);

    // Remove extensions if not wanted
    if (!includeExtensions) {
      delete dtcgToken.$extensions;
    }

    if (nested) {
      const path = parseTokenPath(token.name);
      setNestedValue(result, path, dtcgToken);
    } else {
      result[token.name] = dtcgToken;
    }
  }

  // Apply type inheritance to groups
  if (nested && applyTypesToGroup) {
    applyTypesToGroups(result);
  }

  return result as DTCGFile;
}

/**
 * Convert Token[] to DTCG format, organized by namespace
 *
 * Creates separate DTCG objects for each namespace, useful for
 * generating multiple token files.
 *
 * @param tokensByNamespace - Map of namespace to Token[]
 * @param options - Conversion options
 * @returns Map of namespace to DTCG-formatted object
 *
 * @example
 * ```typescript
 * import { generateBaseSystem, toDTCGByNamespace } from '@rafters/design-tokens';
 *
 * const result = generateBaseSystem();
 * const dtcgFiles = toDTCGByNamespace(result.byNamespace);
 *
 * // Write each namespace to separate file
 * for (const [namespace, dtcg] of dtcgFiles) {
 *   fs.writeFileSync(`tokens/${namespace}.json`, JSON.stringify(dtcg, null, 2));
 * }
 * ```
 */
export function toDTCGByNamespace(
  tokensByNamespace: Map<string, Token[]>,
  options: ToDTCGOptions = {},
): Map<string, DTCGFile> {
  const result = new Map<string, DTCGFile>();

  for (const [namespace, tokens] of tokensByNamespace) {
    result.set(namespace, toDTCG(tokens, options));
  }

  return result;
}
