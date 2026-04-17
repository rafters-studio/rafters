/**
 * <rafters-item> -- Web Component list/menu item primitive.
 *
 * Mirrors the semantics of item.tsx (size, selected, disabled) using
 * shadow-DOM-scoped CSS composed via classy-wc. Auto-registers on import
 * and is idempotent against double-define.
 *
 * Attributes:
 *  - size:     'default' | 'sm' | 'lg'  (default 'default')
 *  - selected: boolean (presence-based)
 *  - disabled: boolean (presence-based)
 *
 * Shadow DOM structure:
 *   <div class="item" role="option" ...>
 *     <span class="item-icon" aria-hidden="true">
 *       <slot name="icon"></slot>
 *     </span>
 *     <span class="item-content">
 *       <span class="item-label"><slot></slot></span>
 *       <span class="item-description"><slot name="description"></slot></span>
 *     </span>
 *   </div>
 *
 * The inner <div> mirrors the React `tabIndex` / `aria-selected` /
 * `aria-disabled` / `data-selected` / `data-disabled` semantics from
 * item.tsx and is rebuilt on every attribute change.
 *
 * Click and keyboard activation of slotted interactive content is the
 * consumer's responsibility -- this element is a visual and semantic
 * primitive only.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import { type ItemSize, itemStylesheet } from './item.styles';

const ALLOWED_SIZES: ReadonlyArray<ItemSize> = ['default', 'sm', 'lg'];

const OBSERVED_ATTRIBUTES: ReadonlyArray<string> = ['size', 'selected', 'disabled'] as const;

function parseSize(value: string | null): ItemSize {
  if (value && (ALLOWED_SIZES as ReadonlyArray<string>).includes(value)) {
    return value as ItemSize;
  }
  return 'default';
}

export class RaftersItem extends RaftersElement {
  static readonly observedAttributes: ReadonlyArray<string> = OBSERVED_ATTRIBUTES;

  /** Per-instance stylesheet rebuilt on every attribute change. */
  private _instanceSheet: CSSStyleSheet | null = null;

  override connectedCallback(): void {
    if (!this.shadowRoot) return;
    this._instanceSheet = new CSSStyleSheet();
    this._instanceSheet.replaceSync(this.composeCss());
    this.shadowRoot.adoptedStyleSheets = [this._instanceSheet];
    this.update();
  }

  override attributeChangedCallback(
    _name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;
    if (this._instanceSheet) {
      this._instanceSheet.replaceSync(this.composeCss());
    }
    this.update();
  }

  override disconnectedCallback(): void {
    this._instanceSheet = null;
  }

  /**
   * Build the CSS string for the current attribute values.
   */
  private composeCss(): string {
    return itemStylesheet({
      size: parseSize(this.getAttribute('size')),
      selected: this.hasAttribute('selected'),
      disabled: this.hasAttribute('disabled'),
    });
  }

  /**
   * Render the inner semantic <div role="option"> with three slots:
   * a named `icon` slot, the default (label) slot, and a named
   * `description` slot. DOM APIs only -- never innerHTML.
   *
   * tabIndex / aria-* / data-* attributes mirror the React semantics
   * of item.tsx and are re-applied on every attributeChangedCallback
   * because update() calls render() to replace shadow children.
   */
  override render(): Node {
    const selected = this.hasAttribute('selected');
    const disabled = this.hasAttribute('disabled');

    const inner = document.createElement('div');
    inner.className = 'item';
    inner.setAttribute('role', 'option');
    inner.tabIndex = disabled ? -1 : 0;
    inner.setAttribute('aria-selected', String(selected));
    if (disabled) {
      inner.setAttribute('aria-disabled', 'true');
      inner.setAttribute('data-disabled', '');
    }
    if (selected) {
      inner.setAttribute('data-selected', '');
    }

    const iconWrap = document.createElement('span');
    iconWrap.className = 'item-icon';
    iconWrap.setAttribute('aria-hidden', 'true');
    const iconSlot = document.createElement('slot');
    iconSlot.setAttribute('name', 'icon');
    iconWrap.appendChild(iconSlot);

    const content = document.createElement('span');
    content.className = 'item-content';

    const labelWrap = document.createElement('span');
    labelWrap.className = 'item-label';
    const labelSlot = document.createElement('slot');
    labelWrap.appendChild(labelSlot);

    const descWrap = document.createElement('span');
    descWrap.className = 'item-description';
    const descSlot = document.createElement('slot');
    descSlot.setAttribute('name', 'description');
    descWrap.appendChild(descSlot);

    content.appendChild(labelWrap);
    content.appendChild(descWrap);

    inner.appendChild(iconWrap);
    inner.appendChild(content);

    return inner;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-item')) {
  customElements.define('rafters-item', RaftersItem);
}
