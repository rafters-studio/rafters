/**
 * <rafters-empty> Web Component
 *
 * Framework target for the Empty container, parallel to empty.tsx (React)
 * and empty.astro (Astro). Consumes emptyStylesheet() from empty.styles.ts.
 * Auto-registers on import; registration is idempotent under HMR and
 * double-import.
 *
 * Shadow DOM structure:
 *   <div class="empty"><slot></slot></div>
 *
 * Scope note: this issue covers the OUTER <rafters-empty> container only.
 * The <rafters-empty-icon>, <rafters-empty-title>, <rafters-empty-description>,
 * and <rafters-empty-action> subcomponents are deferred to a follow-up.
 *
 * NEVER: import React, Astro, nanostores, Tailwind; reference CSS custom
 * properties directly in this file; emit inline CSS strings. All styling
 * flows from emptyStylesheet() which owns every token reference.
 *
 * @cognitive-load 2/10
 */

import { RaftersElement } from '../../primitives/rafters-element';
import { emptyStylesheet } from './empty.styles';

export class RaftersEmpty extends RaftersElement {
  static readonly observedAttributes: ReadonlyArray<string> = [];

  /** Per-instance stylesheet. No attributes drive the outer container today,
   *  so the sheet is built once at connect and held for the life of the
   *  instance. Kept as a field so disconnectedCallback can clear it. */
  private _instanceSheet: CSSStyleSheet | null = null;

  override connectedCallback(): void {
    if (!this.shadowRoot) return;
    this._instanceSheet = new CSSStyleSheet();
    this._instanceSheet.replaceSync(emptyStylesheet());
    this.shadowRoot.adoptedStyleSheets = [this._instanceSheet];
    this.update();
  }

  override disconnectedCallback(): void {
    this._instanceSheet = null;
  }

  /**
   * Render the outer .empty container with a single default slot.
   * DOM APIs only -- NEVER innerHTML.
   */
  override render(): Node {
    const root = document.createElement('div');
    root.className = 'empty';
    const slot = document.createElement('slot');
    root.appendChild(slot);
    return root;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-empty')) {
  customElements.define('rafters-empty', RaftersEmpty);
}
