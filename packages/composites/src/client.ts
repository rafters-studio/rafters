/**
 * Browser-safe exports for @rafters/composites
 *
 * Re-exports everything except the folder loader which requires
 * Node.js fs APIs. Use this entry point in client-side code.
 */

export type {
  InstantiatedBlock,
  InstantiateOptions,
  SaveCompositeMetadata,
  SerializableBlock,
} from './bridge';
export {
  instantiateBlocks,
  serializeToComposite,
  toBridgeItem,
  toBridgeItems,
  toKebabId,
} from './bridge';
export {
  credentials,
  email,
  password,
  required,
  url,
} from './built-in-rules/index';
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
