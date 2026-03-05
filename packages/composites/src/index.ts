/**
 * @rafters/composites - Pre-built drag-and-drop block assemblies
 *
 * Composites are JSON files (`.composite.json`) that define block
 * arrangements with manifests and I/O rules. The registry manages
 * lookup by ID, category, and fuzzy search.
 */

export { toBridgeItem, toBridgeItems } from './bridge';
export type {
  AppliedRule,
  CompositeBlock,
  CompositeCategory,
  CompositeFile,
  CompositeManifest,
} from './manifest';
export {
  AppliedRuleSchema,
  CompositeBlockSchema,
  CompositeCategorySchema,
  CompositeFileSchema,
  CompositeManifestSchema,
} from './manifest';
export {
  clear as clearRegistry,
  get as getComposite,
  getAll as getAllComposites,
  getByCategory as getCompositesByCategory,
  register as registerComposite,
  search as searchComposites,
} from './registry';
export { toMdx } from './serializer';
