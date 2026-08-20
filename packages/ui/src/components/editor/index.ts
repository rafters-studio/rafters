/**
 * Editor component -- op vocabulary (FR-EDITOR-003) and history core
 * (FR-EDITOR-002).
 *
 * Later editor.behavior.ts (FR-EDITOR-005) composes createEditorHistory's
 * controls/memory rather than reimplementing op/undo/redo.
 */
export { applyOp, applyOpSequence } from './ops';
export type { EditorOp, FormatOp, OpResult, StructuralOp, TextOp } from './ops';
export { createEditorHistory } from './editor-history';
export { bindEditor, projectDocument, translateBeforeInput } from './editor.behavior';
export type {
  EditorHistory,
  EditorHistoryConfig,
  EditorHistoryControls,
  EditorHistoryState,
  EditorPosition,
  EditorSelection,
  HistoryEntry,
} from './editor-history';
