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
 * <rafters-drawer> -- the Web Component performance of the Drawer score.
 *
 * A decorator over the drawer behavior: it adds the view (drawerClasses) and
 * the custom-element wiring, and calls the same bindDrawer the Astro script
 * calls. The markup is light DOM that bindDrawer reads; config rides on the
 * root's data-* attributes (data-modal, data-default-open) and data-side feeds
 * the view only. The overlay and content stay present and inert while closed.
 *
 * connectedCallback can fire before the light-DOM children parse, so the bind
 * runs on the next microtask.
 */
import { bindDrawer, drawer, type DrawerConfig, type DrawerSide } from './drawer.behavior';
import { drawerClasses } from './drawer.classes';

const SIDES: ReadonlySet<string> = new Set<DrawerSide>(['top', 'right', 'bottom', 'left']);

function readSide(value: string | undefined): DrawerSide {
  return value !== undefined && SIDES.has(value) ? (value as DrawerSide) : 'bottom';
}

export class RaftersDrawer extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      this.decorate();
      this.teardown = bindDrawer(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }

  /** Apply the view: drawerClasses to the overlay, content and inner parts. */
  private decorate(): void {
    const config: DrawerConfig = {
      modal: this.dataset['modal'] !== 'false',
      defaultOpen: this.dataset['defaultOpen'] === 'true',
      side: readSide(this.dataset['side']),
    };
    const classes = drawerClasses(config, drawer.initialState(config));
    const part = (name: string): HTMLElement | null =>
      this.querySelector<HTMLElement>(`[data-part="${name}"]`);

    const content = part('content');
    const handle =
      content?.querySelector<HTMLElement>(':scope > [aria-hidden="true"]:not([data-part])') ?? null;
    const targets: ReadonlyArray<readonly [HTMLElement | null, string]> = [
      [part('overlay'), classes.overlay],
      [content, classes.content],
      [handle, classes.handle],
      [part('title'), classes.title],
      [part('description'), classes.description],
      [part('close'), classes.close],
    ];
    for (const [el, className] of targets) {
      if (el) el.className = className;
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-drawer')) {
  customElements.define('rafters-drawer', RaftersDrawer);
}
