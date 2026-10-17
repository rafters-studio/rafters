/**
 * Responsive sidebar component for app navigation with collapsible states
 *
 * @cognitive-load 3/10 - Familiar navigation pattern; always visible, predictable location
 * @attention-economics Low attention cost: persistent navigation allows quick orientation
 * @trust-building Consistent location, keyboard toggle (Cmd+B), state persistence
 * @accessibility Keyboard navigation, proper landmarks (nav role), focus management
 * @semantic-meaning Primary navigation: main app sections, user actions, branding
 *
 * @usage-patterns
 * DO: Use for primary app navigation with 4-8 main sections
 * DO: Collapse to icons on mobile/narrow viewports
 * DO: Persist collapsed state in user preferences
 * DO: Include keyboard shortcut for toggle (Cmd+B)
 * DO: Group related items with sections and separators
 * NEVER: Secondary navigation (use tabs or breadcrumbs)
 * NEVER: Temporary content (use Sheet or Drawer)
 * NEVER: More than 2 levels of nesting
 *
 * @example
 * ```tsx
 * <Sidebar.Provider>
 *   <Sidebar>
 *     <Sidebar.Header>
 *       <Logo />
 *     </Sidebar.Header>
 *     <Sidebar.Content>
 *       <Sidebar.Group>
 *         <Sidebar.GroupLabel>Main</Sidebar.GroupLabel>
 *         <Sidebar.Menu>
 *           <Sidebar.MenuItem>
 *             <Sidebar.MenuButton asChild>
 *               <a href="/dashboard">Dashboard</a>
 *             </Sidebar.MenuButton>
 *           </Sidebar.MenuItem>
 *         </Sidebar.Menu>
 *       </Sidebar.Group>
 *     </Sidebar.Content>
 *     <Sidebar.Footer>
 *       <UserMenu />
 *     </Sidebar.Footer>
 *   </Sidebar>
 *   <Sidebar.Inset>
 *     <main>Content here</main>
 *   </Sidebar.Inset>
 * </Sidebar.Provider>
 * ```
 */
import { bindSidebar, wrapSidebarIcons } from './sidebar.behavior';

/**
 * The behavior-carrying Web Component performance: a light-DOM enhancer. The
 * element is the sidebar root and the consumer authors the trigger, the dialog
 * wrapper, the nav panel and the rail inside it. One microtask after connect
 * (the light-DOM parts may not have parsed yet) it wraps the slotted icons and
 * runs the shared `bindSidebar` on itself. No shadow root, no events.
 */
export class RaftersSidebar extends HTMLElement {
  #teardown: (() => void) | null = null;
  #generation = 0;

  connectedCallback(): void {
    const generation = ++this.#generation;
    queueMicrotask(() => {
      if (generation !== this.#generation || !this.isConnected || this.#teardown) return;
      wrapSidebarIcons(this);
      this.#teardown = bindSidebar(this);
    });
  }

  disconnectedCallback(): void {
    this.#generation++;
    this.#teardown?.();
    this.#teardown = null;
  }
}

if (!customElements.get('rafters-sidebar')) {
  customElements.define('rafters-sidebar', RaftersSidebar);
}
