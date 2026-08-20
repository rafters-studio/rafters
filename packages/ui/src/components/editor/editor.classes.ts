/**
 * editor.classes.ts -- the editor score's visual projection (FR-EDITOR-005).
 *
 * Root-only (settled): one class string, for the contenteditable root. No
 * per-block classes -- the contenteditable owns block DOM internally, and
 * this file makes no reducer/aria/keymap decision (those live in
 * editor.behavior.ts).
 */
import type { EditorConfig, EditorState } from './editor.behavior';

export interface EditorClassSet {
  root: string;
}

const rootClasses =
  'min-h-32 w-full whitespace-pre-wrap rounded-md border border-input bg-transparent px-3 py-2 ' +
  'text-body-medium ts-body-medium outline-none cursor-text ' +
  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'aria-disabled:cursor-not-allowed aria-disabled:opacity-50 ' +
  '[&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono';

export function editorClasses(_config: EditorConfig, _state: EditorState): EditorClassSet {
  return {
    root: rootClasses,
  };
}
