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

/**
 * WC performance for sidebar: the thinnest wrapper. The score AND the DOM-native
 * binding (bindSidebar) live in sidebar.behavior.ts, shared with the Astro
 * performance. This file only adapts that binding to the custom-element
 * lifecycle -- deferring the bind one microtask because connectedCallback can
 * fire before the light-DOM parts (trigger, panel, overlay, nav content) are
 * parsed.
 */
import { bindSidebar } from './sidebar.behavior';

export class RaftersSidebar extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindSidebar(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-sidebar')) {
  customElements.define('rafters-sidebar', RaftersSidebar);
}
