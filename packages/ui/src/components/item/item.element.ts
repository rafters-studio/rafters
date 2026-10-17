/**
 * Generic list item component for menus, lists, and selection interfaces
 *
 * @cognitive-load 3/10 - Familiar list pattern with clear visual states and predictable behavior
 * @attention-economics Secondary selection: Selected state draws focus, disabled reduces prominence. Icon slot provides visual anchoring for quick scanning.
 * @trust-building Consistent hover/focus/selected states build predictable interaction patterns. Clear disabled state prevents user confusion.
 * @accessibility Proper aria-selected for selection, aria-disabled for disabled state, keyboard navigation support, focus-visible for keyboard users
 * @semantic-meaning Building block for: menu items (navigation/actions), list items (content/data), option items (selection interfaces)
 *
 * @usage-patterns
 * DO: Use as building block for menu items, list items, selection options
 * DO: Include icons on the left for quick visual scanning
 * DO: Add description for secondary information or context
 * DO: Use selected state for current/active items in navigation
 * DO: Use disabled state for unavailable options with clear visual feedback
 * NEVER: Use for primary actions (use Button instead)
 * NEVER: Nest interactive elements within Item
 * NEVER: Use Item without a container (list, menu, etc.)
 *
 * @example
 * ```tsx
 * // Basic list item
 * <Item>Settings</Item>
 *
 * // With icon and description
 * <Item
 *   icon={<UserIcon className="h-4 w-4" />}
 *   description="Manage your account settings"
 * >
 *   Profile
 * </Item>
 *
 * // Selected state for navigation
 * <Item selected icon={<HomeIcon className="h-4 w-4" />}>
 *   Dashboard
 * </Item>
 *
 * // Disabled option
 * <Item disabled icon={<LockIcon className="h-4 w-4" />}>
 *   Admin Panel
 * </Item>
 *
 * // Interactive item with handler
 * <Item onClick={handleSelect} icon={<SettingsIcon className="h-4 w-4" />}>
 *   Settings
 * </Item>
 * ```
 */

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
