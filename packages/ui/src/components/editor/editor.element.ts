/**
 * Block-based document editor with op-based undo/redo history
 *
 * @cognitive-load 5/10 - Sustained composition attention; undo/redo gives a safety net
 * @attention-economics Full attention while composing -- the caret is the sole focus anchor
 * @trust-building Every edit is reversible (Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z), so mistakes cost nothing
 * @accessibility role=textbox, aria-multiline, a required accessible name (label or labelledBy)
 * @semantic-meaning Primary authoring surface: prose and structured blocks, not a form field
 *
 * @usage-patterns
 * DO: Always supply a real accessible name (label or labelledBy) -- axe fails an unnamed textbox
 * DO: Seed initial content via the decorator's own data, not a post-mount DOM write
 * NEVER: Mutate the contenteditable's DOM directly -- the model owns every edit
 *
 * @example
 * ```tsx
 * <Editor label="Document" />
 * ```
 */

/**
 * WC performance for editor: the thinnest wrapper. The score AND the
 * DOM-native binding (bindEditor) live in editor.behavior.ts, shared with the
 * Astro performance. This file only adapts that binding to the custom-element
 * lifecycle -- deferring the bind one microtask because connectedCallback can
 * fire before `data-initial-doc`/`data-caret`/`data-label` are parsed.
 *
 * `data-editor-bound` is the SAME guard editor.astro's own <script> checks
 * before calling `bindEditor(root)` there. A page that both renders the
 * Astro markup and ships this file in its bundle upgrades ONE
 * `<rafters-editor>` through both paths; without a shared guard each would
 * bind independently (two histories, two keydown listeners, one Cmd+Z firing
 * undo twice). Whichever runs first sets the flag synchronously between its
 * own check and set, so there is no race between this microtask and the
 * script's own (synchronous) loop.
 */
import { bindEditor } from './editor.behavior';

export class RaftersEditorElement extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      if (this.dataset['editorBound'] === 'true') return;
      this.dataset['editorBound'] = 'true';
      this.teardown = bindEditor(this);
    });
  }

  disconnectedCallback(): void {
    // Only tear down (and clear the shared guard) when THIS instance is the
    // one that bound: `data-editor-bound` may have been set by editor.astro's
    // <script> instead, with THAT closure holding the live teardown -- if
    // this callback cleared the guard unconditionally, a later reconnect
    // would see no flag and bind a SECOND time over the script's still-live
    // binding (the exact double-bind the shared guard exists to prevent).
    if (!this.teardown) return;
    this.teardown();
    this.teardown = null;
    delete this.dataset['editorBound'];
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-editor')) {
  customElements.define('rafters-editor', RaftersEditorElement);
}
