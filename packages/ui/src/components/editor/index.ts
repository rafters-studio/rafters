/**
 * Editor component -- op vocabulary (FR-EDITOR-003).
 *
 * FR-EDITOR-002's editor-history.ts (undo/redo op-log) and later
 * editor.behavior.ts import applyOp/applyOpSequence from here.
 */
export { applyOp, applyOpSequence } from './ops';
export type { EditorOp, FormatOp, OpResult, StructuralOp, TextOp } from './ops';
