/**
 * Sheet component for slide-in side panel overlays
 *
 * @cognitive-load 5/10 - Partial page overlay requiring focused attention
 * @attention-economics Partial attention capture: main content dimmed but visible, slide animation indicates temporary state
 * @trust-building Clear slide direction, easy dismissal via overlay click or escape, preserves main content context
 * @accessibility Focus trap within sheet, escape key closes, proper ARIA dialog role
 * @semantic-meaning Supplementary content: navigation, filters, forms that don't warrant full page navigation
 *
 * @usage-patterns
 * DO: Use for mobile navigation, filters, or secondary forms
 * DO: Choose side based on content relationship (left=nav, right=details)
 * DO: Provide clear close mechanism
 * DO: Keep content scoped to single purpose
 * NEVER: Primary content, complex multi-step workflows, content requiring full attention
 *
 * @example
 * ```tsx
 * // Minimal usage - Portal, Overlay, and Close button are included automatically
 * <Sheet>
 *   <SheetTrigger>Open</SheetTrigger>
 *   <SheetContent side="right">
 *     <SheetHeader>
 *       <SheetTitle>Title</SheetTitle>
 *       <SheetDescription>Description</SheetDescription>
 *     </SheetHeader>
 *     Content here
 *   </SheetContent>
 * </Sheet>
 *
 * // Or with namespace syntax
 * <Sheet>
 *   <Sheet.Trigger asChild>
 *     <Button variant="outline">Open</Button>
 *   </Sheet.Trigger>
 *   <Sheet.Content side="right">
 *     <Sheet.Header>
 *       <Sheet.Title>Sheet Title</Sheet.Title>
 *     </Sheet.Header>
 *     Sheet content here
 *   </Sheet.Content>
 * </Sheet>
 *
 * // Hide close button if needed
 * <SheetContent showCloseButton={false}>...</SheetContent>
 * ```
 */

/**
 * Web Component performance for sheet. A light-DOM decorator over the sheet
 * behavior: it adds the view (sheetClasses) and the custom-element lifecycle,
 * and calls the SAME bindSheet the Astro <script> calls. Parts stay light DOM
 * (no shadow root) so the focus trap and outside-dismiss can read them. The
 * `side` variant is authored on the content and never touched here.
 */
import { bindSheet, sheet } from './sheet.behavior';
import { sheetClasses } from './sheet.classes';

export class RaftersSheet extends HTMLElement {
  private teardown: (() => void) | null = null;
  private generation = 0;

  connectedCallback(): void {
    const generation = ++this.generation;
    // Light-DOM children may not be parsed yet: bind on the next microtask.
    queueMicrotask(() => {
      if (generation !== this.generation || !this.isConnected) return;
      this.decorate();
      this.teardown = bindSheet(this);
    });
  }

  disconnectedCallback(): void {
    this.generation++;
    this.teardown?.();
    this.teardown = null;
  }

  private decorate(): void {
    const config = {
      modal: this.getAttribute('modal') !== 'false',
      defaultOpen: this.getAttribute('default-open') === 'true',
    };
    const classes = sheetClasses(config, sheet.initialState(config));
    const views = {
      overlay: classes.overlay,
      title: classes.title,
      description: classes.description,
      close: classes.close,
    };
    for (const [part, className] of Object.entries(views)) {
      const el = this.querySelector<HTMLElement>(`[data-part="${part}"]`);
      if (el) el.className = className;
    }
  }
}

if (!customElements.get('rafters-sheet')) {
  customElements.define('rafters-sheet', RaftersSheet);
}
