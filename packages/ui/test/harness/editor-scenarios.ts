/**
 * editor-scenarios.ts -- the ONE named scenario table FR-EDITOR-006 requires
 * to drive BOTH layers: the model-level caret-notation BDD
 * (editor.behavior.test.ts, via caret.ts's given/when/then) and the
 * contenteditable capture proof (test/editor/editor-capture.e2e.ts, via real
 * keyboard/paste input). Seeded from the prototype's scenario set
 * (RESEARCH-EDITOR-PROTOTYPE) plus the canonical scenario the spec pins
 * verbatim. Data only -- no vitest, no DOM, no Playwright import -- so both
 * consumers, in different packages, import the SAME list rather than each
 * re-authoring it (issue AC: "must not re-author a second, drifting set of
 * cases").
 */
import type { EditorAction } from './caret';

export interface EditorScenarioStep {
  readonly action: EditorAction;
  /** Expected doc+sel, in caret notation, after this step. Named `expected`,
   *  not `then` -- a property literally named `then` makes an object
   *  accidentally thenable if it's ever awaited (eslint-plugin-unicorn's
   *  `no-thenable`, already enforced repo-wide; see caret.ts's own `then` ->
   *  `thenAssert` rename for the sharper, module-level version of the same
   *  hazard -- this is that same hazard one level down, on a plain object). */
  readonly expected: string;
}

export interface EditorScenario {
  readonly name: string;
  /** Seed doc+sel, in caret notation. */
  readonly given: string;
  readonly steps: readonly EditorScenarioStep[];
}

export const EDITOR_SCENARIOS: readonly EditorScenario[] = [
  {
    name: 'type inserts at the caret',
    given: 'hel|lo',
    steps: [{ action: { kind: 'type', text: 'p' }, expected: 'help|lo' }],
  },
  {
    name: 'typing into a selection replaces it',
    given: 'he[llo]',
    steps: [{ action: { kind: 'type', text: 'y' }, expected: 'hey|' }],
  },
  {
    name: 'backspace deletes the char before the caret',
    given: 'hello|',
    steps: [{ action: { kind: 'backspace' }, expected: 'hell|' }],
  },
  {
    name: 'backspace at the start of the doc is a no-op',
    given: '|abc',
    steps: [{ action: { kind: 'backspace' }, expected: '|abc' }],
  },
  {
    name: 'backspace over a selection deletes the selection',
    given: 'he[llo]',
    steps: [{ action: { kind: 'backspace' }, expected: 'he|' }],
  },
  {
    name: 'delete removes the char after the caret',
    given: 'hel|lo',
    steps: [{ action: { kind: 'delete' }, expected: 'hel|o' }],
  },
  {
    name: 'delete at the end of the doc is a no-op',
    given: 'abc|',
    steps: [{ action: { kind: 'delete' }, expected: 'abc|' }],
  },
  {
    name: 'delete over a selection deletes the selection',
    given: 'he[llo]',
    steps: [{ action: { kind: 'delete' }, expected: 'he|' }],
  },
  {
    name: 'pasting inserts at the caret like typing',
    given: 'hel|lo',
    steps: [{ action: { kind: 'paste', text: 'XY' }, expected: 'helXY|lo' }],
  },
  {
    // The canonical scenario, taken verbatim from RULING-EDITOR-HISTORY /
    // FR-EDITOR-006: undo restores document AND selection, not just text.
    name: 'canonical: undo restores document AND selection',
    given: 'he[llo]',
    steps: [
      { action: { kind: 'type', text: 'y' }, expected: 'hey|' },
      { action: { kind: 'undo' }, expected: 'he[llo]' },
    ],
  },
  {
    name: 'redo reapplies an undone edit',
    given: '|',
    steps: [
      { action: { kind: 'type', text: 'hi' }, expected: 'hi|' },
      { action: { kind: 'undo' }, expected: '|' },
      { action: { kind: 'redo' }, expected: 'hi|' },
    ],
  },
  {
    name: 'multi-step history unwinds one edit at a time',
    given: '|',
    steps: [
      { action: { kind: 'type', text: 'a' }, expected: 'a|' },
      { action: { kind: 'type', text: 'b' }, expected: 'ab|' },
      { action: { kind: 'undo' }, expected: 'a|' },
      { action: { kind: 'undo' }, expected: '|' },
    ],
  },
  {
    name: 'a fresh edit forks history (redo stack is dropped)',
    given: '|',
    steps: [
      { action: { kind: 'type', text: 'a' }, expected: 'a|' },
      { action: { kind: 'type', text: 'b' }, expected: 'ab|' },
      { action: { kind: 'undo' }, expected: 'a|' },
      { action: { kind: 'type', text: 'X' }, expected: 'aX|' },
      { action: { kind: 'redo' }, expected: 'aX|' }, // undone was dropped by the fresh edit: no-op
    ],
  },
];
