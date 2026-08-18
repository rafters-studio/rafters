/**
 * Context menu component for right-click contextual actions
 *
 * @cognitive-load 4/10 - Menu navigation with multiple options requires scanning and selection
 * @attention-economics Contextual actions: appears on right-click at cursor position, groups related actions logically
 * @trust-building Typeahead search for quick access, clear hover states, keyboard navigation
 * @accessibility Full keyboard support (arrows, typeahead), proper ARIA menu role, roving focus
 * @semantic-meaning Context menu: Item=action, CheckboxItem=toggle, RadioItem=exclusive selection, Sub=nested group
 *
 * @usage-patterns
 * DO: Group related actions logically with separators
 * DO: Use keyboard shortcuts with Kbd component for common actions
 * DO: Limit to 7 plus-minus 2 items per menu level (Miller's Law)
 * DO: Use submenus sparingly for complex action hierarchies
 * NEVER: Primary actions, navigation, more than 2 levels of nesting
 *
 * @example
 * ```tsx
 * <ContextMenu>
 *   <ContextMenu.Trigger>
 *     <div>Right-click me</div>
 *   </ContextMenu.Trigger>
 *   <ContextMenu.Content>
 *     <ContextMenu.Item>Edit</ContextMenu.Item>
 *     <ContextMenu.Item>Duplicate</ContextMenu.Item>
 *     <ContextMenu.Separator />
 *     <ContextMenu.Item>Delete</ContextMenu.Item>
 *   </ContextMenu.Content>
 * </ContextMenu>
 * ```
 */

/**
 * WC performance for context-menu: the thinnest wrapper. All behavior --
 * including the DOM binding -- lives in context-menu.behavior.ts, shared with
 * the Astro performance. This file only adapts that binding to the
 * custom-element lifecycle. The host is a light-DOM enhancer: the bind reads
 * real document DOM (trigger, content, items) for the primitives it composes.
 */
import { bindContextMenu } from './context-menu.behavior';

export class RaftersContextMenu extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    // connectedCallback can fire before the light-DOM children are parsed
    // (upgrade order), so bind on the next microtask when the parts exist.
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindContextMenu(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-context-menu')) {
  customElements.define('rafters-context-menu', RaftersContextMenu);
}
