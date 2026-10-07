/**
 * @rafters/composites - Pre-built drag-and-drop block assemblies
 *
 * Composites are JSON files (`.composite.json`) that define block
 * arrangements with manifests and I/O rules. The registry manages
 * lookup by ID, category, and fuzzy search.
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
export { credentials, email, password, required, url } from './built-in-rules/index';
export type {
  CompositeAdapter,
  DiscoveryError,
  DiscoveryResult,
  RawCompositeEntry,
} from './discovery';
export { discoverComposites } from './discovery';
export { checkEmbedInput } from './embed';
// NOTE: the node-fs adapter (discovery-node) imports node:fs and is therefore
// NOT exported here -- index.ts must stay browser-safe (the demo pulls it into
// the client bundle). It lives behind the server-only "@rafters/composites/node"
// subpath instead. See package.json exports.
export type { ViteRawGlob } from './discovery-vite';
export { discoverFromVite, viteAdapter, viteGlobEntries } from './discovery-vite';
export type { BindLocals, BindProps } from './bind';
export { resolveBindings } from './bind';
export type {
  AppliedRule,
  Binding,
  CompositeBlock,
  CompositeCategory,
  CompositeFile,
  CompositeManifest,
  UsagePatterns,
} from './manifest';
export {
  AppliedRuleSchema,
  BindingSchema,
  CompositeBlockSchema,
  CompositeCategorySchema,
  CompositeFileSchema,
  CompositeManifestSchema,
  RepeatNameSchema,
  UsagePatternsSchema,
} from './manifest';
export {
  clear as clearRegistry,
  get as getComposite,
  getAll as getAllComposites,
  getByCategory as getCompositesByCategory,
  register as registerComposite,
  search as searchComposites,
} from './registry';
export type {
  BlockResolution,
  ComponentResolution,
  CompositeResolution,
  NativeResolution,
} from './resolve-block';
export { resolveBlockTag } from './resolve-block';
export { rulesToHtmlAttrs } from './rule-attrs';
export type { RuleMatch } from './rules';
export {
  deriveCompositeBoundary,
  findCompatibleConsumers,
  findCompatibleProducers,
  matchRules,
} from './rules';
export { toMdx } from './to-mdx';
export type { BlockScope, EachResolver, ScopedBlockVisitor } from './walk-blocks';
export { walkScopedBlocks } from './walk-blocks';
