/**
 * @rafters/ui package root
 *
 * Re-exports core types that composites and external consumers import
 * from the package root rather than deep paths.
 */

export type { BaseBlock } from './primitives/types.js';
export { applyOp, applyOpSequence } from './primitives/block-ops.js';
export type {
  EditorOp,
  FormatOp,
  OpResult,
  StructuralOp,
  TextOp,
} from './primitives/block-op-types.js';
export { createEditorHistory } from './primitives/op-history.js';
export type {
  EditorHistory,
  EditorHistoryConfig,
  EditorHistoryControls,
  EditorHistoryState,
  EditorPosition,
  EditorSelection,
  HistoryEntry,
} from './primitives/op-history.js';
