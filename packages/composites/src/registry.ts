/**
 * Composite registry
 *
 * Manages registration and lookup of composite block definitions.
 * O(1) lookup by ID, category grouping, and fuzzy search.
 */

import { fuzzyScore } from '@rafters/ui/primitives/typeahead';
import type { CompositeCategory, CompositeDefinition } from './manifest.js';

const composites = new Map<string, CompositeDefinition>();

/**
 * Register a composite definition.
 * Throws if a composite with the same ID is already registered.
 */
export function register(definition: CompositeDefinition): void {
  const { id } = definition.manifest;
  if (composites.has(id)) {
    throw new Error(`Composite "${id}" is already registered`);
  }
  composites.set(id, definition);
}

/**
 * Get a composite by ID.
 * Returns undefined if not found.
 */
export function get(id: string): CompositeDefinition | undefined {
  return composites.get(id);
}

/**
 * Get all registered composites.
 */
export function getAll(): CompositeDefinition[] {
  return Array.from(composites.values());
}

/**
 * Get all composites in a given category, in registration order.
 */
export function getByCategory(category: CompositeCategory): CompositeDefinition[] {
  return getAll().filter((def) => def.manifest.category === category);
}

/**
 * Search composites by fuzzy matching against name + keywords.
 * Returns results sorted by score (best first).
 */
export function search(query: string): CompositeDefinition[] {
  if (query.length === 0) {
    return getAll();
  }

  return getAll()
    .map((def) => {
      const { name, keywords } = def.manifest;
      const score = Math.max(fuzzyScore(query, name), ...keywords.map((k) => fuzzyScore(query, k)));
      return { def, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.def);
}

/**
 * Clear all registrations (for testing).
 */
export function clear(): void {
  composites.clear();
}
