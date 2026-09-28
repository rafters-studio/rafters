/**
 * Menubar component for application-style horizontal command menus
 *
 * @cognitive-load 5/10 - decision 1, information 2, interaction 1, disruption 0,
 * learning 1. The user picks a category, then an action inside it: two small
 * decisions made one at a time. Information is the heavy dimension -- every menu
 * is a list to scan, and the bar exists to hold many commands. Interaction is one
 * point because the keyboard model spans two axes (across the bar, down a menu).
 * Nothing is seized: menus anchor under their trigger and the page stays put. The
 * File/Edit/View bar is a long-learned desktop idiom, so learning costs little.
 * @attention-economics Persistent and quiet: the bar is always visible but spends
 * no attention until a trigger is chosen, and only one menu is ever open, so at
 * most one list competes for attention. Moving between menus while one is open
 * lets the user browse categories without re-committing each time.
 * @trust-building Predictable and reversible: exactly one menu opens at a time,
 * Escape and an outside click close it without acting, and activating an item
 * closes the menu and hands focus back to the trigger it came from. Keyboard
 * shortcuts shown beside items build confidence in the command set.
 * @accessibility role="menubar" (horizontal) on the root; each trigger is a
 * role="menuitem" menu button (aria-haspopup="menu", aria-expanded,
 * aria-controls while open); each menu is role="menu" (vertical) named by its
 * trigger. ArrowLeft/Right rove the triggers, ArrowDown/Enter/Space open a menu
 * and land focus on its first item, ArrowUp/Down and Home/End rove the items,
 * typing jumps to a matching item, ArrowLeft/Right inside a menu move to the
 * neighbouring menu, Escape closes and returns focus to the trigger.
 * @semantic-meaning Application command bar: Menu=command category,
 * Item=action, CheckboxItem=toggle, RadioItem=exclusive choice,
 * Shortcut=keyboard hint, Separator=group boundary
 *
 * @usage-patterns
 * DO: Use for application-level commands grouped by category (File, Edit, View, Help)
 * DO: Group related actions within each menu, separated by Separator
 * DO: Show keyboard shortcuts with Shortcut for frequent actions
 * DO: Keep the bar to a handful of menus (5-8) and each menu to 7 plus or minus 2 items
 * NEVER: Primary site navigation (use NavigationMenu), a single menu (use DropdownMenu), mobile-first layouts
 *
 * @example
 * ```tsx
 * <Menubar>
 *   <Menubar.Menu value="file">
 *     <Menubar.Trigger>File</Menubar.Trigger>
 *     <Menubar.Content>
 *       <Menubar.Item>New Tab <Menubar.Shortcut>Cmd+T</Menubar.Shortcut></Menubar.Item>
 *       <Menubar.Separator />
 *       <Menubar.Item>Print</Menubar.Item>
 *     </Menubar.Content>
 *   </Menubar.Menu>
 *   <Menubar.Menu value="edit">
 *     <Menubar.Trigger>Edit</Menubar.Trigger>
 *     <Menubar.Content>
 *       <Menubar.Item>Undo <Menubar.Shortcut>Cmd+Z</Menubar.Shortcut></Menubar.Item>
 *     </Menubar.Content>
 *   </Menubar.Menu>
 * </Menubar>
 * ```
 */

/**
 * WC performance for menubar: the thinnest wrapper. The score AND the
 * DOM-native binding (bindMenubar) live in menubar.behavior.ts, shared with the
 * Astro performance. This file only adapts that binding to the custom-element
 * lifecycle -- deferring the bind one microtask because connectedCallback can
 * fire before the light-DOM parts are parsed.
 */
import { bindMenubar } from './menubar.behavior';

export class RaftersMenubar extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindMenubar(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-menubar')) {
  customElements.define('rafters-menubar', RaftersMenubar);
}
