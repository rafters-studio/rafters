/**
 * Composite registry
 *
 * Manages registration and lookup of composite file definitions.
 * O(1) lookup by ID, category grouping, and fuzzy search.
 */

import type { CompositeCategory, CompositeFile } from './manifest';

/**
 * Subsequence fuzzy score: +1 per matched char, +2 for a consecutive match,
 * +3 for a start-of-word match; 0 unless every query char is found. Inlined
 * from the typeahead primitive so @rafters/composites depends only on zod.
 */
function fuzzyScore(query: string, target: string): number {
  if (query.length === 0) return 1;
  if (query.length > target.length) return 0;

  const q = query.toLowerCase();
  const t = target.toLowerCase();

  let score = 0;
  let qi = 0;
  let prevMatchIndex = -2; // -2 so the first match is never "consecutive"

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += 1;
      if (ti === prevMatchIndex + 1) score += 2;
      if (ti === 0 || t[ti - 1] === ' ' || t[ti - 1] === '-') score += 3;
      prevMatchIndex = ti;
      qi++;
    }
  }

  return qi === q.length ? score : 0;
}

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
