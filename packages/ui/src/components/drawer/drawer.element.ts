/**
 * Mobile-friendly drawer component with touch gestures and drag-to-dismiss
 *
 * @cognitive-load 4/10 - Lower cognitive load than dialogs; familiar mobile pattern
 * @attention-economics Partial attention capture: content slides up from edge, main context preserved
 * @trust-building Easy dismissal via drag gesture, overlay tap, or escape; natural mobile interaction
 * @accessibility Focus trap within drawer, escape key closes, proper ARIA dialog role, touch-friendly targets
 * @semantic-meaning Supplementary content: action sheets, bottom menus, quick selections on mobile
 *
 * @usage-patterns
 * DO: Use for mobile action sheets, quick selections, confirmations
 * DO: Use bottom side for mobile-first experiences
 * DO: Keep content minimal and action-focused
 * DO: Provide visible drag handle for touch affordance
 * DO: Support both touch drag and click dismissal
 * NEVER: Complex multi-step forms (use full page or Dialog)
 * NEVER: Primary navigation (use Sheet with side="left")
 * NEVER: Content requiring sustained attention
 *
 * @example
 * ```tsx
 * // Minimal usage - Portal, Overlay, and Close button are included automatically
 * <Drawer>
 *   <DrawerTrigger>Open</DrawerTrigger>
 *   <DrawerContent>
 *     <DrawerHeader>
 *       <DrawerTitle>Title</DrawerTitle>
 *       <DrawerDescription>Description</DrawerDescription>
 *     </DrawerHeader>
 *     Content here
 *     <DrawerFooter>
 *       <DrawerClose>Cancel</DrawerClose>
 *     </DrawerFooter>
 *   </DrawerContent>
 * </Drawer>
 *
 * // Or with namespace syntax
 * <Drawer>
 *   <Drawer.Trigger asChild>
 *     <Button>Open Drawer</Button>
 *   </Drawer.Trigger>
 *   <Drawer.Content>
 *     <Drawer.Header>
 *       <Drawer.Title>Actions</Drawer.Title>
 *       <Drawer.Description>Select an action</Drawer.Description>
 *     </Drawer.Header>
 *     <div>Drawer content here</div>
 *     <Drawer.Footer>
 *       <Drawer.Close asChild>
 *         <Button variant="outline">Cancel</Button>
 *       </Drawer.Close>
 *     </Drawer.Footer>
 *   </Drawer.Content>
 * </Drawer>
 *
 * // Hide close button if needed
 * <DrawerContent showCloseButton={false}>...</DrawerContent>
 * ```
 */

/**
 * WC performance for drawer: the thinnest wrapper. The score AND the DOM-native
 * binding (bindDrawer) live in drawer.behavior.ts, shared with the Astro
 * performance. This file only adapts that binding to the custom-element
 * lifecycle -- deferring the bind one microtask because connectedCallback can
 * fire before the light-DOM parts are parsed.
 */
import { bindDrawer } from './drawer.behavior';

export class RaftersDrawer extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    // Target parity: the Astro/React root is an unclassed <div> (block), but a
    // custom element defaults to display:inline. Pin block so the WC host lays
    // out identically to the other two performances (#2004).
    this.style.display = 'block';
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindDrawer(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-drawer')) {
  customElements.define('rafters-drawer', RaftersDrawer);
}
