/**
 * React performance of the editor score, driven end to end -- same shared
 * `bindEditor` client the WC and Astro performances use (editor.tsx injects
 * its own `createEditorHistory` cell so `useMemory` and the binder read one
 * cell, per editor.behavior.ts's own doc comment).
 *
 * `assertContractFulfillment` (the shared conformance harness's Tier-2
 * helper) is typed to `BehaviorSpec` and cannot be reused here: the editor is
 * deliberately NOT a compose()/BehaviorSpec component (RULING-EDITOR-HISTORY,
 * frozen Spec 00 line 132) -- `editorAria`/`parts` are hand-written, not
 * bundled into that shape. Assertions below compare the rendered DOM against
 * `editorAria`'s own projection entry-by-entry instead, including the
 * undefined -> absent case.
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Editor, type EditorProps } from '../../../src/components/editor/editor';
import {
  editorAria,
  parts,
  type EditorConfig,
} from '../../../src/components/editor/editor.behavior';
import { assertAxeClean, partElement } from '../../harness/conformance';

afterEach(() => {
  cleanup();
});

const root = () => partElement(document.body, 'root') as HTMLElement;

describe('editor conformance [react]', () => {
  it('renders exactly the root part, role=textbox, matching editorAria(label)', () => {
    render(<Editor label="Document" />);
    expect(root()).not.toBeNull();
    expect(root().getAttribute('role')).toBe(parts.root.role);

    const config: EditorConfig = { label: 'Document' };
    const projection = editorAria({} as never, config, { root: root().id }).root;
    for (const [attr, value] of Object.entries(projection ?? {})) {
      if (value === undefined) {
        expect(root().hasAttribute(attr), `must NOT render ${attr}`).toBe(false);
      } else {
        expect(root().getAttribute(attr)).toBe(String(value));
      }
    }
  });

  it('projects aria-labelledby instead of aria-label when labelledBy is set', () => {
    render(<Editor labelledBy="external-heading" />);
    expect(root().getAttribute('aria-labelledby')).toBe('external-heading');
    expect(root().hasAttribute('aria-label')).toBe(false);
  });

  it('is axe-clean with a real accessible name', async () => {
    render(<Editor label="Document" />);
    // Scoped to the editor root, not document.body: axe's "region" rule
    // (page content must be contained by a landmark) is a page-layout
    // concern, not a property of this widget in isolation.
    await assertAxeClean(root());
  });

  it('sanity: assertAxeClean, scoped this same way, DOES fail an unnamed textbox', async () => {
    // Negative control for the assertion above (and for the WC/Astro suites'
    // identically-scoped axe checks): proves narrowing assertAxeClean's
    // target from document.body to the widget root did not also narrow away
    // the violation the axe tier exists to catch (an incidentally-passing
    // unnamed role=textbox). If this ever stops throwing, the axe tier in
    // every editor conformance suite has gone vacuous.
    const unnamed = document.createElement('div');
    unnamed.setAttribute('role', 'textbox');
    unnamed.setAttribute('aria-multiline', 'true');
    unnamed.setAttribute('contenteditable', 'true');
    document.body.appendChild(unnamed);
    await expect(assertAxeClean(unnamed)).rejects.toThrow();
  });

  it('disabled/readonly toggle contenteditable post-mount (no re-bind needed)', async () => {
    const { rerender } = render(<Editor label="Document" />);
    expect(root().getAttribute('contenteditable')).toBe('true');

    rerender(<Editor label="Document" disabled />);
    // The attribute-change MutationObserver bindEditor installs is
    // microtask-scheduled; a macrotask tick is a reliable point past which
    // it has run.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(root().getAttribute('contenteditable')).toBe('false');

    rerender(<Editor label="Document" />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(root().getAttribute('contenteditable')).toBe('true');
  });

  it('a changed label is not reverted to a stale value by bindEditor', async () => {
    const { rerender } = render(<Editor label="First" />);
    expect(root().getAttribute('aria-label')).toBe('First');

    rerender(<Editor label="Second" />);
    // React's own declarative aria spread updates this synchronously; the
    // regression this guards is bindEditor's OWN imperative render() later
    // overwriting it with the config it read at bind time.
    expect(root().getAttribute('aria-label')).toBe('Second');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(root().getAttribute('aria-label')).toBe('Second');
  });

  it('undo/redo gate: Cmd+Z before any edit is a silent no-op', () => {
    render(<Editor label="Document" />);
    // Deliberately unseeded (no initialDocument) so `done` starts empty --
    // history.canUndo is false. Confirms the gate, not a reducer: no throw,
    // root stays present and unchanged.
    expect(() =>
      root().dispatchEvent(
        new KeyboardEvent('keydown', { key: 'z', metaKey: true, bubbles: true, cancelable: true }),
      ),
    ).not.toThrow();
    expect(root()).not.toBeNull();

    expect(() =>
      root().dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'z',
          metaKey: true,
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        }),
      ),
    ).not.toThrow();
    // The full "gate opens after a real edit" half of this scenario --
    // dispatching the chord before AND after an actual insertText -- is
    // proven in editor.element.conformance.test.ts and
    // editor.astro.conformance.test.ts, which seed a real block via
    // data-initial-doc. React's own initialDocument-seeded equivalent lives
    // in editor.react-props.test.tsx (#2212) alongside the rest of that
    // prop's coverage, not here. Same bindEditor, same editorKeymap, same
    // history.canUndo/canRedo gate in every performance -- proven once at the
    // DOM-native layer covers all three.
  });

  // FR-EDITOR-005 acceptance: "EditorConfig/EditorProps type-reject a value
  // that omits both label and labelledBy (compile-time check, e.g. a
  // `// @ts-expect-error` fixture in the test suite)". This file is listed in
  // tsconfig.json's `files` (not `include` -- an explicit `include` entry is
  // still subject to the blanket `**/*.test.tsx` `exclude`, which is why the
  // repo's prior `test/components/dialog.test.tsx` include entry pointed at a
  // file that doesn't exist and was never actually being typechecked; `files`
  // is the one array `exclude` cannot filter) specifically so `pnpm
  // typecheck` exercises this line -- vitest itself only transpiles types
  // away, it does not check them. Verified by temporarily deleting the
  // `@ts-expect-error` comment below and confirming `tsc --noEmit` then
  // reports `Type '{}' is not assignable to type 'EditorProps'`.
  it('compile-time: EditorProps rejects a value with neither label nor labelledBy', () => {
    function unnamed(): EditorProps {
      // @ts-expect-error -- EditorLabelConfig is a required union; omitting
      // both label and labelledBy must fail to typecheck, not just fail axe.
      return {};
    }
    expect(typeof unnamed).toBe('function');
  });
});
