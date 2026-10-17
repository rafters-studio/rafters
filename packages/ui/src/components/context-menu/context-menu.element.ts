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
 * ```html
 * <rafters-context-menu>
 *   <span data-part="trigger" id="cm-trigger" tabindex="-1">Right-click me</span>
 *   <div data-part="content" id="cm-content" role="menu" aria-label="Actions" hidden>
 *     <div role="menuitem" tabindex="-1">Edit</div>
 *     <div role="menuitem" tabindex="-1">Delete</div>
 *   </div>
 * </rafters-context-menu>
 * ```
 */

/**
 * <rafters-context-menu> -- the Web Component performance of the context-menu
 * score. A decorator over the behavior: it adds the view (the shared
 * `contextMenuClasses` strings) and the custom-element wiring, then calls the
 * same `bindContextMenu` the Astro script calls. The host is a light-DOM
 * enhancer; the bind reads real document DOM and binds every submenu.
 */
import { bindContextMenu, contextMenu, wrapContextMenuItems } from './context-menu.behavior';
import { contextMenuClasses } from './context-menu.classes';

function applyView(root: HTMLElement): void {
  const classes = contextMenuClasses({}, contextMenu.initialState({}));
  const set = (selector: string, className: string): void => {
    for (const el of root.querySelectorAll<HTMLElement>(selector)) el.className = className;
  };
  set('[data-part="trigger"]', classes.trigger);
  set('[data-part="content"]', classes.content);
  set('[data-part="sub"]', classes.sub);
  set('[data-part="sub-trigger"]', classes.subTrigger);
  set('[data-part="sub-content"]', classes.subContent);
  // Same inline anchoring the Astro markup renders, so the popup is measured at
  // its shrink-to-fit size before the bind places it.
  for (const el of root.querySelectorAll<HTMLElement>(
    '[data-part="content"], [data-part="sub-content"]',
  )) {
    el.style.position = 'fixed';
    el.style.left = '0';
    el.style.top = '0';
  }
  set('[role="menuitem"]:not([data-part])', classes.item);
  set('[role="menuitemcheckbox"]', classes.checkboxItem);
  set('[role="menuitemradio"]', classes.radioItem);
  set('[role^="menuitem"] > kbd', classes.shortcut);
}

export class RaftersContextMenu extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    // connectedCallback can fire before the light-DOM children are parsed, so
    // wrap and bind on the next microtask when the parts exist.
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      applyView(this);
      wrapContextMenuItems(this);
      this.teardown = bindContextMenu(this);
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
