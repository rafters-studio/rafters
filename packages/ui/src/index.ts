/**
 * @rafters/ui package root
 *
 * Re-exports core types that composites and external consumers import
 * from the package root rather than deep paths.
 */

export type {
  AppliedRule,
  EditorBlock,
  EditorControls,
  EditorRulePaletteConfig,
  EditorSidebarConfig,
  RuleConfigField,
  SaveCompositeData,
} from './components/ui/editor.js';
export type {
  DeserializeResult,
  EditorSerializer,
  SerializerBlock,
} from './primitives/serializer.js';
export {
  contentHasMarks,
  contentToPlainText,
  createJsonSerializer,
  jsonSerializer,
} from './primitives/serializer.js';
export {
  createMdxSerializer,
  mdxSerializer,
} from './primitives/serializer-mdx.js';
export type { BaseBlock } from './primitives/types.js';
