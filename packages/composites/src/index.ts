/**
 * @rafters/composites - Pre-built drag-and-drop block assemblies
 *
 * Composites are JSON files (`.composite.json`) that define block
 * arrangements with manifests and I/O rules. The registry manages
 * lookup by ID, category, and fuzzy search.
 */

export type { InstantiatedBlock, InstantiateOptions } from './bridge';
export { instantiateBlocks, toBridgeItem, toBridgeItems } from './bridge';
export {
  credentials,
  email,
  password,
  required,
  url,
} from './built-in-rules/index';
export type { LoadResult } from './loader';
export { loadComposites } from './loader';
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
export type { RuleMatch } from './rules';
export {
  findCompatibleConsumers,
  findCompatibleProducers,
  matchRules,
} from './rules';
export { toMdx } from './serializer';
