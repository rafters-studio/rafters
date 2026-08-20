/**
 * Astro performance of the editor score, driven end to end. AstroContainer
 * renders the SSR markup but does NOT run the <script> (same limitation
 * dialog.astro.conformance.test.ts documents), so this test binds
 * `bindEditor` directly -- that IS the script's job -- then drives the same
 * score the React and WC performances drive. One score, three performances.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import Editor from '../../../src/components/editor/editor.astro';
import { bindEditor } from '../../../src/components/editor/editor.behavior';
import { assertAxeClean } from '../../harness/conformance';
import type { BaseBlock } from '../../../src/primitives/types';

afterEach(() => {
  document.body.innerHTML = '';
});

const seededDoc: BaseBlock[] = [{ id: 'b1', type: 'text', content: 'hello' }];

/** happy-dom's HTML parser does not decode numeric character references
 *  (`&#34;` etc.) WITHIN an attribute value back to their literal characters
 *  -- a real browser always does, so this is a test-environment quirk, not
 *  an Astro or bindEditor bug. It only bites `data-initial-doc`/`data-caret`
 *  (quotes get entity-encoded by Astro's own attribute serialization since
 *  they carry JSON). Decoding the RAW HTML STRING before parsing would be
 *  wrong -- the outer quotes delimiting the attribute are real `"`
 *  characters, and turning the inner `&#34;`s into literal `"` first would
 *  prematurely close that delimiter and truncate the value. Decode AFTER
 *  parsing instead, rewriting just the two attributes on the mounted
 *  element via getAttribute/setAttribute. */
function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#38;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

async function mount(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Editor, {
    props: { id: 'e1', initialDoc: seededDoc, caret: { blockId: 'b1', offset: 5 }, ...props },
  });
  document.body.innerHTML = html;
  const el = document.body.querySelector('rafters-editor') as HTMLElement;
  for (const attr of ['data-initial-doc', 'data-caret']) {
    const raw = el.getAttribute(attr);
    if (raw !== null) el.setAttribute(attr, decodeHtmlEntities(raw));
  }
  return el;
}

describe('editor conformance [astro]', () => {
  it('SSR renders role=textbox, aria-multiline, and the label -- correct before any JS', async () => {
    const el = await mount({ label: 'Document' });
    expect(el.getAttribute('data-part')).toBe('root');
    expect(el.getAttribute('role')).toBe('textbox');
    expect(el.getAttribute('aria-multiline')).toBe('true');
    expect(el.getAttribute('aria-label')).toBe('Document');
    expect(el.getAttribute('contenteditable')).toBe('true');
  });

  it('SSR: disabled/readonly project contenteditable=false before any JS', async () => {
    const el = await mount({ label: 'Document', disabled: true });
    expect(el.getAttribute('contenteditable')).toBe('false');
  });

  it('omitted label + labelledby projects aria-labelledby, never aria-label', async () => {
    const el = await mount({ labelledBy: 'external-heading' });
    expect(el.getAttribute('aria-labelledby')).toBe('external-heading');
    expect(el.hasAttribute('aria-label')).toBe(false);
  });

  it('is axe-clean pre-bind with a real accessible name', async () => {
    const el = await mount({ label: 'Document' });
    await assertAxeClean(el);
  });

  it('bind: script-equivalent call projects the seeded doc and is axe-clean bound', async () => {
    const el = await mount({ label: 'Document' });
    bindEditor(el); // what the <script> does per instance on a real page
    expect(el.querySelector('[data-block-id="b1"]')?.textContent).toBe('hello');
    await assertAxeClean(el);
  });

  it('bind: undo/redo gate works through the SSR + script path', async () => {
    const el = await mount({ label: 'Document' });
    bindEditor(el);

    el.dispatchEvent(
      new InputEvent('beforeinput', {
        inputType: 'insertText',
        data: '!',
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(el.querySelector('[data-block-id="b1"]')?.textContent).toBe('hello!');

    el.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', metaKey: true, bubbles: true, cancelable: true }),
    );
    expect(el.querySelector('[data-block-id="b1"]')?.textContent).toBe('hello');
  });

  it('WC + Astro script both targeting one SSR root bind exactly once (double-bind guard)', async () => {
    // Dynamically imported, and only in this test: editor.element.ts
    // registers the custom element as a MODULE-LOAD side effect, which would
    // otherwise upgrade -- and auto-bind -- every `<rafters-editor>` this
    // file's OTHER (SSR-only, pre-bind) tests render too.
    const { RaftersEditorElement } = await import('../../../src/components/editor/editor.element');
    if (!customElements.get('rafters-editor')) {
      customElements.define('rafters-editor', RaftersEditorElement);
    }
    const el = await mount({ label: 'Document' });
    // Registering the custom element upgrades the SSR-rendered
    // <rafters-editor> automatically; its connectedCallback (deferred one
    // microtask) binds and sets data-editor-bound, per editor.element.ts.
    await Promise.resolve();
    expect(el.dataset['editorBound']).toBe('true');

    // The script's own loop (editor.astro's <script>, replicated here since
    // AstroContainer does not execute it): must see the guard already set
    // and skip, not bind a second time.
    let scriptBound = false;
    for (const candidate of document.querySelectorAll<HTMLElement>(
      'rafters-editor[data-part="root"]',
    )) {
      if (candidate.dataset['editorBound'] === 'true') continue;
      candidate.dataset['editorBound'] = 'true';
      scriptBound = true; // would call bindEditor(candidate) here
    }
    expect(scriptBound).toBe(false);
  });
});
