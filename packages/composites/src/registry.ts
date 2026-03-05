/**
 * Composite registry
 *
 * Manages registration and lookup of composite file definitions.
 * O(1) lookup by ID, category grouping, and fuzzy search.
 */

import { fuzzyScore } from '@rafters/ui/primitives/typeahead';
import type { CompositeCategory, CompositeFile } from './manifest.js';

const composites = new Map<string, CompositeFile>();

/**
 * Register a composite.
 * Throws if a composite with the same ID is already registered.
 */
export function register(composite: CompositeFile): void {
  const { id } = composite.manifest;
  if (composites.has(id)) {
    throw new Error(`Composite "${id}" is already registered`);
  }
  composites.set(id, composite);
}

/**
 * Get a composite by ID.
 * Returns undefined if not found.
 */
export function get(id: string): CompositeFile | undefined {
  return composites.get(id);
}

/**
 * Get all registered composites.
 */
export function getAll(): CompositeFile[] {
  return Array.from(composites.values());
}

/**
 * Get all composites in a given category, in registration order.
 */
export function getByCategory(category: CompositeCategory): CompositeFile[] {
  return getAll().filter((c) => c.manifest.category === category);
}

/**
 * Search composites by fuzzy matching against name + keywords.
 * Returns results sorted by score (best first).
 */
export function search(query: string): CompositeFile[] {
  if (query.length === 0) {
    return getAll();
  }

  return getAll()
    .map((c) => {
      const { name, keywords } = c.manifest;
      const score = Math.max(fuzzyScore(query, name), ...keywords.map((k) => fuzzyScore(query, k)));
      return { c, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.c);
}

/**
 * Clear all registrations (for testing).
 */
export function clear(): void {
  composites.clear();
}
