/**
 * Dropdown menu component for contextual action menus
 *
 * @cognitive-load 4/10 - Menu navigation with multiple options requires scanning and selection
 * @attention-economics Contextual actions: appears on demand, groups related actions logically
 * @trust-building Typeahead search for quick access, clear hover states, keyboard navigation
 * @accessibility Full keyboard support (arrows, typeahead), proper ARIA menu role, roving focus
 * @semantic-meaning Action menu: Item=action, CheckboxItem=toggle, RadioItem=exclusive selection, Sub=nested group
 *
 * @usage-patterns
 * DO: Group related actions logically with separators
 * DO: Use keyboard shortcuts with Kbd component for common actions
 * DO: Limit to 7±2 items per menu level (Miller's Law)
 * DO: Use submenus sparingly for complex action hierarchies
 * NEVER: Primary actions, navigation, more than 2 levels of nesting
 *
 * @example
 * ```html
 * <rafters-dropdown-menu>
 *   <button type="button" data-part="trigger" id="dm-trigger">Options</button>
 *   <div data-part="content" id="dm-content" hidden>
 *     <div role="menuitem" data-part="item" data-roving-item="" tabindex="-1">Edit</div>
 *     <div role="menuitem" data-part="item" data-roving-item="" tabindex="-1">Delete</div>
 *   </div>
 * </rafters-dropdown-menu>
 * ```
 */

/**
 * <rafters-dropdown-menu> -- the Web Component performance of the dropdown-menu
 * score. A decorator over the behavior: it adds the view from
 * `dropdown-menu.classes.ts` and the custom-element wiring, lays out each item's
 * start icon with `wrapDropdownMenuIcons`, then calls the same `bindDropdownMenu`
 * the Astro script calls. Light DOM only: no shadow root, no portal.
 */

import { bindDropdownMenu, wrapDropdownMenuIcons } from './dropdown-menu.behavior';
import { dropdownMenuClasses } from './dropdown-menu.classes';

export class RaftersDropdownMenu extends HTMLElement {
  private teardown: (() => void) | null = null;
  private connection = 0;

  connectedCallback(): void {
    // connectedCallback can fire before the light-DOM children parse: bind on
    // the next microtask.
    const connection = ++this.connection;
    queueMicrotask(() => {
      if (connection !== this.connection || !this.isConnected) return;
      this.teardown?.();
      this.applyView();
      wrapDropdownMenuIcons(this);
      this.teardown = bindDropdownMenu(this);
    });
  }

  disconnectedCallback(): void {
    this.connection++;
    this.teardown?.();
    this.teardown = null;
  }

  private applyView(): void {
    const defaultOpen = this.getAttribute('default-open') === 'true';
    const classes = dropdownMenuClasses({ defaultOpen }, { open: defaultOpen });

    const trigger = this.querySelector<HTMLElement>('[data-part="trigger"]');
    if (trigger) trigger.className = classes.trigger;

    const content = this.querySelector<HTMLElement>('[data-part="content"]');
    if (content) content.className = classes.content;

    for (const item of this.querySelectorAll<HTMLElement>('[data-part="item"]')) {
      const role = item.getAttribute('role');
      item.className =
        role === 'menuitemcheckbox'
          ? classes.checkboxItem
          : role === 'menuitemradio'
            ? classes.radioItem
            : classes.item;
    }
  }
}

if (!customElements.get('rafters-dropdown-menu')) {
  customElements.define('rafters-dropdown-menu', RaftersDropdownMenu);
}
