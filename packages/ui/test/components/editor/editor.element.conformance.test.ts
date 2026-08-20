/**
 * WC performance of the editor score, driven end to end against light-DOM
 * markup -- same shared `bindEditor` client the React and Astro performances
 * use. `assertContractFulfillment` (the shared harness's Tier-2 helper)
 * cannot be reused here: it is typed to `BehaviorSpec`, and the editor is
 * deliberately NOT a compose()/BehaviorSpec component (RULING-EDITOR-HISTORY,
 * frozen Spec 00 line 132) -- `parts`/`editorAria` are hand-written, not
 * bundled into that shape. Assertions below compare the rendered DOM against
 * `editorAria`'s own projection directly instead.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { assertAxeClean } from '../../harness/conformance';
import {
  editorAria,
  parts,
  type EditorConfig,
} from '../../../src/components/editor/editor.behavior';
import { RaftersEditorElement } from '../../../src/components/editor/editor.element';
import type { BaseBlock } from '../../../src/primitives/types';

beforeAll(() => {
  if (!customElements.get('rafters-editor')) {
    customElements.define('rafters-editor', RaftersEditorElement);
  }
});

afterEach(() => {
  document.body.innerHTML = '';
});

function seededDoc(): BaseBlock[] {
  return [{ id: 'b1', type: 'text', content: 'hello' }];
}

async function mount(attrs: Record<string, string> = {}, seed = true): Promise<HTMLElement> {
  const el = document.createElement('rafters-editor');
  el.id = 'e1';
  if (seed) {
    el.dataset.initialDoc = JSON.stringify(seededDoc());
    el.dataset.caret = JSON.stringify({ blockId: 'b1', offset: 5 });
  }
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  await Promise.resolve(); // connectedCallback defers one microtask
  return el;
}

const root = () => document.querySelector<HTMLElement>('rafters-editor')!;

describe('editor conformance [wc]', () => {
  it('declares exactly one part, root, with role=textbox, matching editorAria', async () => {
    await mount({ 'data-label': 'Document' });
    expect(root().getAttribute('data-part')).toBe('root');
    expect(Object.keys(parts)).toEqual(['root']);
    expect(root().getAttribute('role')).toBe(parts.root.role);

    const config: EditorConfig = { label: 'Document' };
    const projection = editorAria({} as never, config, { root: 'e1' }).root;
    for (const [attr, value] of Object.entries(projection ?? {})) {
      if (value === undefined) {
        expect(root().hasAttribute(attr), `must NOT render ${attr}`).toBe(false);
      } else {
        expect(root().getAttribute(attr)).toBe(String(value));
      }
    }
  });

  it('projects aria-labelledby instead of aria-label when data-labelledby is set', async () => {
    await mount({ 'data-labelledby': 'external-heading' });
    expect(root().getAttribute('aria-labelledby')).toBe('external-heading');
    expect(root().hasAttribute('aria-label')).toBe(false);
  });

  it('is axe-clean with a real accessible name', async () => {
    await mount({ 'data-label': 'Document' });
    // Scoped to the editor root itself, not document.body: axe's "region"
    // rule (page content must be contained by a landmark) is a page-layout
    // concern, not a property of this widget in isolation -- the same reason
    // the WC dialog conformance suite (dialog.element.conformance.test.ts)
    // has no body-level axe check either.
    await assertAxeClean(root());
  });

  it('contenteditable reflects data-disabled/data-readonly at bind, and MutationObserver keeps it live', async () => {
    await mount({ 'data-label': 'Document' });
    expect(root().getAttribute('contenteditable')).toBe('true');

    root().dataset['disabled'] = 'true';
    // MutationObserver callbacks are microtask-scheduled but not necessarily
    // drained by a single `await Promise.resolve()` hop in every environment
    // -- a macrotask tick is a reliable point past which it has run.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(root().getAttribute('contenteditable')).toBe('false');

    root().dataset['disabled'] = 'false';
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(root().getAttribute('contenteditable')).toBe('true');
  });

  it('gates undo/redo on history.canUndo/canRedo: Cmd+Z before any edit no-ops; after a real edit it undoes', async () => {
    await mount({ 'data-label': 'Document' });
    const before = root().querySelector('[data-block-id="b1"]')?.textContent;
    expect(before).toBe('hello');

    // Before any edit: canUndo is false, so the gate blocks the call -- no
    // throw, content unchanged.
    root().dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', metaKey: true, bubbles: true, cancelable: true }),
    );
    expect(root().querySelector('[data-block-id="b1"]')?.textContent).toBe('hello');

    // A real edit: bindEditor is a controlled contenteditable (Spec 04) --
    // the DOM mutation is applied by projectDocument from the model, not by
    // native contenteditable editing, so a synthetic `beforeinput` drives the
    // SAME production code path a real keystroke would (only the BROWSER's
    // own native-edit semantics are Playwright-only, per FR-EDITOR-006 and
    // this suite's editor.behavior.test.ts note -- dispatching the event
    // itself is ordinary DOM EventTarget behavior every environment supports).
    root().dispatchEvent(
      new InputEvent('beforeinput', {
        inputType: 'insertText',
        data: '!',
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(root().querySelector('[data-block-id="b1"]')?.textContent).toBe('hello!');

    // Now canUndo is true: Cmd+Z undoes the edit.
    root().dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', metaKey: true, bubbles: true, cancelable: true }),
    );
    expect(root().querySelector('[data-block-id="b1"]')?.textContent).toBe('hello');

    // canRedo is now true: Cmd+Shift+Z redoes it.
    root().dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'z',
        metaKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(root().querySelector('[data-block-id="b1"]')?.textContent).toBe('hello!');
  });

  it('sets data-editor-bound on connect -- the SAME guard editor.astro checks before its own bind', async () => {
    await mount({ 'data-label': 'Document' });
    expect(root().dataset['editorBound']).toBe('true');
  });

  it("a script-style bind attempt sees the WC's guard already set and skips", async () => {
    await mount({ 'data-label': 'Document' });
    // Mirrors editor.astro's own <script> loop verbatim: check-then-set the
    // SAME `data-editor-bound` key. Since the WC already bound (and set it)
    // during connectedCallback above, this must take the skip branch --
    // proving the two paths interlock instead of each binding independently
    // (two histories, two keydown listeners, one Cmd+Z firing undo twice).
    let reboundByScript = false;
    if (root().dataset['editorBound'] !== 'true') {
      root().dataset['editorBound'] = 'true';
      reboundByScript = true; // would call bindEditor(root) here on a real page
    }
    expect(reboundByScript).toBe(false);
  });

  it('disconnect clears the guard so a later reconnect can rebind', async () => {
    const el = await mount({ 'data-label': 'Document' });
    expect(el.dataset['editorBound']).toBe('true');

    el.remove();
    expect(el.dataset['editorBound']).toBeUndefined();

    document.body.appendChild(el);
    await Promise.resolve();
    expect(el.dataset['editorBound']).toBe('true');
  });

  it('does NOT clear the guard on disconnect when the SCRIPT (not this WC instance) owns the binding', async () => {
    // The Astro-script-binds-first ordering: bindEditor(el) is called
    // directly (what the <script> does) and the guard is set BEFORE the WC's
    // own connectedCallback microtask has a chance to run.
    const el = document.createElement('rafters-editor');
    el.id = 'e2';
    el.dataset.initialDoc = JSON.stringify(seededDoc());
    el.dataset.caret = JSON.stringify({ blockId: 'b1', offset: 5 });
    el.setAttribute('data-label', 'Document');
    el.dataset['editorBound'] = 'true';
    const { bindEditor } = await import('../../../src/components/editor/editor.behavior');
    const scriptTeardown = bindEditor(el);
    document.body.appendChild(el);

    // The WC's connectedCallback (deferred one microtask) sees the guard
    // already set and must NOT take ownership -- its own `teardown` stays
    // null, per editor.element.ts.
    await Promise.resolve();
    expect(el.dataset['editorBound']).toBe('true');

    // Detaching must NOT clear a guard this instance never owned: clearing
    // it here would let a later reconnect bind a SECOND time over the
    // script's still-live binding (the double-bind #4 exists to prevent).
    el.remove();
    expect(el.dataset['editorBound']).toBe('true');

    scriptTeardown();
  });
});
