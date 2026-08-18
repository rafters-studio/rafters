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
 * WC performance for sheet: the thinnest wrapper. The score AND the DOM-native
 * binding (bindSheet) live in sheet.behavior.ts, shared with the Astro
 * performance. This file only adapts that binding to the custom-element
 * lifecycle -- deferring the bind one microtask because connectedCallback can
 * fire before the light-DOM parts are parsed.
 */
import { bindSheet } from './sheet.behavior';

export class RaftersSheet extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindSheet(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-sheet')) {
  customElements.define('rafters-sheet', RaftersSheet);
}
