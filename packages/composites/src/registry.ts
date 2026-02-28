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
 * Get all composites in a given category, in registration order.
 */
export function getByCategory(category: CompositeCategory): CompositeDefinition[] {
  const results: CompositeDefinition[] = [];
  for (const def of composites.values()) {
    if (def.manifest.category === category) {
      results.push(def);
    }
  }
  return results;
}

/**
 * Search composites by fuzzy matching against name + keywords.
 * Returns results sorted by score (best first).
 */
export function search(query: string): CompositeDefinition[] {
  if (query.length === 0) {
    return Array.from(composites.values());
  }

  const scored: Array<{ def: CompositeDefinition; score: number }> = [];

  for (const def of composites.values()) {
    const { name, keywords } = def.manifest;
    // Score against name
    let bestScore = fuzzyScore(query, name);
    // Score against each keyword, keep best
    for (const keyword of keywords) {
      const keywordScore = fuzzyScore(query, keyword);
      if (keywordScore > bestScore) {
        bestScore = keywordScore;
      }
    }
    if (bestScore > 0) {
      scored.push({ def, score: bestScore });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.def);
}

/**
 * Get all registered composites.
 */
export function getAll(): CompositeDefinition[] {
  return Array.from(composites.values());
}

/**
 * Clear all registrations (for testing).
 */
export function clear(): void {
  composites.clear();
}
