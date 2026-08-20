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
 */
import { bindEditor } from './editor.behavior';

export class RaftersEditorElement extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindEditor(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-editor')) {
  customElements.define('rafters-editor', RaftersEditorElement);
}
