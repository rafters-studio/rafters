/**
 * <rafters-item> -- Web Component list/menu item primitive.
 *
 * Mirrors the semantics of item.tsx (size, selected, disabled). The inner
 * nodes carry the SAME utility class strings the React/Astro targets use --
 * imported from item.classes.ts -- rather than a parallel hand-written CSS
 * map. Presentation resolves from the shared compiled utility sheet adopted
 * by RaftersElement (setUtilityCSS) plus the token custom properties
 * inherited from the host :root.
 *
 * The only shadow-scoped CSS this component owns is the structural :host
 * display shim.
 *
 * Auto-registers on import and is idempotent against double-define.
 *
 * Attributes:
 *  - size:     'default' | 'sm' | 'lg'  (default 'default')
 *  - selected: boolean (presence-based)
 *  - disabled: boolean (presence-based)
 *
 * Shadow DOM structure (inner div carries the composed item utility classes):
 *   <div role="option" ...>
 *     <span aria-hidden="true"><slot name="icon"></slot></span>
 *     <span>
 *       <span><slot></slot></span>
 *       <span><slot name="description"></slot></span>
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
import {
  itemBaseClasses,
  itemContentClasses,
  itemDescriptionClasses,
  itemFocusClasses,
  itemIconClasses,
  itemLabelClasses,
  itemMotionClasses,
  itemSizeClasses,
} from './item.classes';

export type ItemSize = 'default' | 'sm' | 'lg';

const ALLOWED_SIZES: ReadonlyArray<ItemSize> = ['default', 'sm', 'lg'];

const OBSERVED_ATTRIBUTES: ReadonlyArray<string> = ['size', 'selected', 'disabled'] as const;

function parseSize(value: string | null): ItemSize {
  if (value && (ALLOWED_SIZES as ReadonlyArray<string>).includes(value)) {
    return value as ItemSize;
  }
  return 'default';
}

/**
 * State-dependent utility string mirroring the `stateStyles` branch in
 * item.tsx: disabled wins, then selected, then the default+hover branch.
 */
function itemStateClasses(selected: boolean, disabled: boolean): string {
  if (disabled) {
    return 'opacity-50 pointer-events-none text-muted-foreground';
  }
  if (selected) {
    return 'bg-accent text-accent-foreground';
  }
  return 'text-foreground hover:bg-accent hover:text-accent-foreground';
}

/**
 * Compose the inner item div's class string from the shared class maps.
 * Exported so tests assert the WC renders the exact same composition the
 * React/Astro targets do -- the parity guarantee.
 */
export function composeItemClasses(size: ItemSize, selected: boolean, disabled: boolean): string {
  return [
    itemBaseClasses,
    itemSizeClasses[size] ?? itemSizeClasses.default,
    itemStateClasses(selected, disabled),
    itemFocusClasses,
    itemMotionClasses,
  ].join(' ');
}

export class RaftersItem extends RaftersElement {
  static readonly observedAttributes: ReadonlyArray<string> = OBSERVED_ATTRIBUTES;

  /** The only component-owned CSS: the structural host-display shim. */
  static override styles = ':host { display: block; }';

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
    inner.className = composeItemClasses(parseSize(this.getAttribute('size')), selected, disabled);
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
    iconWrap.className = itemIconClasses;
    iconWrap.setAttribute('aria-hidden', 'true');
    const iconSlot = document.createElement('slot');
    iconSlot.setAttribute('name', 'icon');
    iconWrap.appendChild(iconSlot);

    const content = document.createElement('span');
    content.className = itemContentClasses;

    const labelWrap = document.createElement('span');
    labelWrap.className = itemLabelClasses;
    const labelSlot = document.createElement('slot');
    labelWrap.appendChild(labelSlot);

    const descWrap = document.createElement('span');
    descWrap.className = itemDescriptionClasses;
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
