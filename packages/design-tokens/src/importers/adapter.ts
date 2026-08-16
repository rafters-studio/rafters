/**
 * DesignSystemAdapter interface and registry.
 *
 * The adapter pattern replaces direct calls to the monolithic importer
 * functions. Each adapter implements a uniform detection interface; init
 * picks the adapter via `config.source` and routes all CSS detection
 * through it. Adding a new design system source is: one file implementing
 * the interface, one `register()` call here.
 *
 * The interface is intentionally narrow -- six detection methods covering
 * the base-value and family/color domains that init needs pre-generation
 * and at sense/apply time. Sensing (`senseShadcnCss`), classification
 * buckets for non-color namespaces, and `@theme` block extraction remain
 * direct-call utilities because the adapter surface does not absorb them
 * without growing unwieldy.
 */

import type { ColorDeclaration } from './shapes.js';
import type { DetectedFont } from './fonts.js';

/**
 * Uniform detection contract for a design system source. Each method
 * accepts raw source CSS and returns the detected values in the shape
 * that init consumes. Methods that find nothing return empty arrays or
 * objects with no keys set (same semantics as the bare functions today).
 */
export interface DesignSystemAdapter {
  readonly name: string;
  detectFonts(css: string): DetectedFont[];
  detectColors(css: string): ColorDeclaration[];
  detectSpacing(css: string): { base?: number };
  detectRadius(css: string): { base?: number };
  detectFocusRing(css: string): { width?: number };
  detectFontSize(css: string): { base?: number };
}

// -- Registry ----------------------------------------------------------------

const adapters = new Map<string, DesignSystemAdapter>();

/**
 * Register an adapter under its `name`. Called at module load by each
 * adapter file. Duplicate names throw -- a name collision means two
 * adapters are fighting for the same slot and the conflict must be
 * resolved at the source, not silently last-write-wins.
 */
export function register(adapter: DesignSystemAdapter): void {
  if (adapters.has(adapter.name)) {
    throw new Error(`DesignSystemAdapter "${adapter.name}" is already registered.`);
  }
  adapters.set(adapter.name, adapter);
}

/**
 * Resolve an adapter by source name. Throws when the name is unknown,
 * listing the known adapter names so the caller (or the user) can pick
 * a valid one.
 */
export function getAdapter(name: string): DesignSystemAdapter {
  const adapter = adapters.get(name);
  if (adapter !== undefined) return adapter;
  const known = getAvailableAdapters();
  throw new Error(`Unknown design system adapter "${name}". Valid values: ${known.join(', ')}.`);
}

/**
 * The registered adapter names, sorted alphabetically. Used in error
 * messages, future UI pickers, and tests.
 */
export function getAvailableAdapters(): readonly string[] {
  return [...adapters.keys()].sort();
}
