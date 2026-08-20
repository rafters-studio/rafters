/**
 * Editor component -- op vocabulary (FR-EDITOR-003), history core
 * (FR-EDITOR-002), and the editor score + bindEditor (FR-EDITOR-005).
 *
 * editor.behavior.ts composes createEditorHistory's controls/memory rather
 * than reimplementing op/undo/redo; it is NOT a compose()/BehaviorSpec (the
 * editor is out of the behavior-layer composer, frozen Spec 00 line 132).
 *
 * Framework-agnostic surface only (functions + types, no module-level side
 * effects) -- same as the rest of this barrel. The three decorators
 * (editor.tsx, editor.element.ts, editor.astro) are imported directly by
 * path, per this codebase's existing convention: no other component funnels
 * its React/WC/Astro performance through a folder index either, and
 * editor.element.ts's customElements.define is a real side effect this
 * barrel should not force on every consumer.
 */
export { applyOp, applyOpSequence } from './ops';
export type { EditorOp, FormatOp, OpResult, StructuralOp, TextOp } from './ops';
export { createEditorHistory } from './editor-history';
export {
  bindEditor,
  editorAria,
  editorKeymap,
  parts as editorParts,
  projectDocument,
  translateBeforeInput,
} from './editor.behavior';
export type { EditorConfig, EditorLabelConfig, EditorPart, EditorState } from './editor.behavior';
export { editorClasses } from './editor.classes';
export type { EditorClassSet } from './editor.classes';
export type {
  EditorHistory,
  EditorHistoryConfig,
  EditorHistoryControls,
  EditorHistoryState,
  EditorPosition,
  EditorSelection,
  HistoryEntry,
} from './editor-history';
