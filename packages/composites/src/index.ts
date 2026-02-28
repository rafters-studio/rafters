/**
 * @rafters/composites - Pre-built drag-and-drop block assemblies
 *
 * Composites are registered with the composite registry and appear in
 * the Editor's block palette. Each composite provides:
 * - A manifest describing its identity and default block data
 * - A Preview component for palette display
 * - A Render component for canvas rendering
 */

export type {
  CompositeCategory,
  CompositeDefinition,
  CompositeManifest,
} from './manifest.js';
// Manifest types and validation
export {
  CompositeCategorySchema,
  CompositeManifestSchema,
} from './manifest.js';

// Registry
export {
  clear as clearRegistry,
  get as getComposite,
  getAll as getAllComposites,
  getByCategory as getCompositesByCategory,
  register as registerComposite,
  search as searchComposites,
} from './registry.js';

// Typography composites
export {
  blockquoteComposite,
  headingComposite,
  listComposite,
  paragraphComposite,
} from './typography/index.js';
