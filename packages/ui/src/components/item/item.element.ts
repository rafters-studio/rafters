/**
 * <rafters-item> -- the Web Component performance of the Item score.
 *
 * Item is a static score with a CONFIG-DRIVEN projection: no state, no
 * effects, so there is nothing to bind, but the row's `role="option"` and its
 * selected/disabled semantics are not native to a `div` and must be projected.
 * This element imports NO `bindItem` (there is none) -- it renders the row
 * markup with the shared classes and named slots, and applies the SAME
 * `item.aria` projection the React and Astro performances read. One score,
 * three performances, zero drift.
 *
 * Presentation resolves from the compiled utility sheet adopted by
 * RaftersElement (setUtilityCSS) plus the token custom properties inherited
 * from the host :root; the only component-owned CSS is the structural
 * host-display shim. `render()` re-runs on every observed attribute change
 * (size/selected/disabled), so the projection stays in step with the host.
 *
 * Shadow structure (the inner div is the declared root part):
 *   <div data-part="root" role="option" ...>
 *     <div aria-hidden="true"><slot name="icon"></slot></div>
 *     <div>
 *       <div><slot></slot></div>
 *       <div><slot name="description"></slot></div>
 *     </div>
 *   </div>
 *
 * Activation of slotted interactive content is the consumer's responsibility;
 * a list row is an option owned by a listbox/menu parent (see the doc's
 * oracle table). This element is a visual + semantic primitive only.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import { item, parseItemSize, type ItemConfig } from './item.behavior';
import {
  itemClasses,
  itemContentClasses,
  itemDescriptionClasses,
  itemIconClasses,
  itemLabelClasses,
} from './item.classes';

const OBSERVED_ATTRIBUTES: ReadonlyArray<string> = ['size', 'selected', 'disabled'] as const;

export class RaftersItem extends RaftersElement {
  static readonly observedAttributes: ReadonlyArray<string> = OBSERVED_ATTRIBUTES;

  /** The only component-owned CSS: the structural host-display shim. */
  static override styles = ':host { display: block; }';

  /**
   * Render the inner `role="option"` row with the icon / label / description
   * slots. Classes come from `itemClasses`; role, aria-selected, aria-disabled,
   * tabindex and the data-* hooks come from the score's `item.aria` projection
   * (a projected `undefined` means the attribute is not rendered). DOM APIs
   * only -- never innerHTML.
   */
  override render(): Node {
    const config: ItemConfig = {
      size: parseItemSize(this.getAttribute('size')),
      selected: this.hasAttribute('selected'),
      disabled: this.hasAttribute('disabled'),
    };

    const inner = document.createElement('div');
    inner.setAttribute('data-part', 'root');
    inner.className = itemClasses(config, {}).root;

    // Apply the resolved projection: undefined = the attribute must not render.
    const aria = item.aria({}, config, { root: '' }).root ?? {};
    for (const [name, value] of Object.entries(aria)) {
      if (value === undefined) continue;
      inner.setAttribute(name, String(value));
    }

    const iconWrap = document.createElement('div');
    iconWrap.className = itemIconClasses;
    iconWrap.setAttribute('aria-hidden', 'true');
    const iconSlot = document.createElement('slot');
    iconSlot.setAttribute('name', 'icon');
    iconWrap.appendChild(iconSlot);

    const content = document.createElement('div');
    content.className = itemContentClasses;

    const labelWrap = document.createElement('div');
    labelWrap.className = itemLabelClasses;
    labelWrap.appendChild(document.createElement('slot'));

    const descWrap = document.createElement('div');
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
