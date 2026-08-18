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
 * ```tsx
 * <DropdownMenu>
 *   <DropdownMenu.Trigger asChild>
 *     <Button variant="ghost">Options</Button>
 *   </DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Item>Edit</DropdownMenu.Item>
 *     <DropdownMenu.Item>Duplicate</DropdownMenu.Item>
 *     <DropdownMenu.Separator />
 *     <DropdownMenu.Item variant="destructive">Delete</DropdownMenu.Item>
 *   </DropdownMenu.Content>
 * </DropdownMenu>
 * ```
 */

/**
 * WC performance for dropdown-menu: the thinnest wrapper. The score AND the
 * DOM-native binding (bindDropdownMenu) live in dropdown-menu.behavior.ts,
 * shared with the Astro performance. This file only adapts that binding to the
 * custom-element lifecycle -- deferring the bind one microtask because
 * connectedCallback can fire before the light-DOM parts are parsed.
 */
import { bindDropdownMenu } from './dropdown-menu.behavior';

export class RaftersDropdownMenu extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindDropdownMenu(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-dropdown-menu')) {
  customElements.define('rafters-dropdown-menu', RaftersDropdownMenu);
}
