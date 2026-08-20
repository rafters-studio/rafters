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
} from './old/ui/editor.js';
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
export { createHtmlSerializer, htmlSerializer } from './primitives/serializer-html.js';
export { createMdxSerializer, mdxSerializer } from './primitives/serializer-mdx.js';
export { createTextSerializer, textSerializer } from './primitives/serializer-text.js';
export type { BaseBlock } from './primitives/types.js';
export {
  applyOp,
  applyOpSequence,
  bindEditor,
  createEditorHistory,
  editorAria,
  editorClasses,
  editorKeymap,
  editorParts,
  projectDocument,
  translateBeforeInput,
} from './components/editor/index.js';
export type {
  EditorClassSet,
  EditorConfig,
  EditorHistory,
  EditorHistoryConfig,
  EditorHistoryControls,
  EditorHistoryState,
  EditorLabelConfig,
  EditorOp,
  EditorPart,
  EditorPosition,
  EditorSelection,
  EditorState,
  FormatOp,
  HistoryEntry,
  OpResult,
  StructuralOp,
  TextOp,
} from './components/editor/index.js';
