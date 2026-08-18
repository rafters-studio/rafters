/**
 * InputGroup combines an input with visual addons (icons, buttons, text) for enhanced form UX
 *
 * @cognitive-load 4/10 - Composite input control with clear addon boundaries and input focus
 * @attention-economics Visual hierarchy: addons=contextual, input=primary focus. Addons should clarify input purpose without competing for attention
 * @trust-building Clear boundaries between addons and input, consistent sizing, proper focus management across the group
 * @accessibility Focus ring wraps entire group, addons support aria-label for screen readers, keyboard navigation preserved
 * @semantic-meaning Start addons=prefixes (currency symbols, icons), end addons=suffixes (units, action buttons)
 *
 * @usage-patterns
 * DO: Use start addon for input type indicators (search icon, currency symbol)
 * DO: Use end addon for units, clear buttons, or submit actions
 * DO: Keep addons visually lightweight to not overshadow input
 * DO: Ensure addons have proper accessibility labels when using icons
 * NEVER: Use addons without semantic meaning
 * NEVER: Place primary actions in addons (use a separate button instead)
 * NEVER: Nest input groups
 *
 * @example
 * ```tsx
 * // Search input with icon
 * <InputGroup>
 *   <InputGroupAddon position="start">
 *     <SearchIcon aria-hidden />
 *   </InputGroupAddon>
 *   <Input placeholder="Search..." aria-label="Search" />
 * </InputGroup>
 *
 * // Price input with currency and unit
 * <InputGroup>
 *   <InputGroupAddon position="start">$</InputGroupAddon>
 *   <Input type="number" placeholder="0.00" />
 *   <InputGroupAddon position="end">USD</InputGroupAddon>
 * </InputGroup>
 *
 * // Input with button addon
 * <InputGroup>
 *   <Input placeholder="Enter code" />
 *   <InputGroupAddon position="end">
 *     <Button size="sm" variant="ghost">Apply</Button>
 *   </InputGroupAddon>
 * </InputGroup>
 * ```
 */

/**
 * WC performance for input-group: the thinnest wrapper. The score AND the
 * DOM-native client (bindInputGroup) live in input-group.behavior.ts, shared
 * with the Astro performance. This file only adapts that client to the
 * custom-element lifecycle -- deferring the bind one microtask because
 * connectedCallback can fire before the light-DOM children (the affixes and the
 * control) are parsed.
 *
 * InputGroup is a LIGHT-DOM enhancer. The oracle was a shadow-DOM element that
 * rebuilt an inner wrapper, carried `::slotted()` normalisation, and shipped a
 * SECOND custom element (`<rafters-input-group-addon>`) purely so an affix could
 * own a shadow root. None of that survives: in light DOM an affix is a `<div>`
 * with a `data-part`, the focus-within ring is an ordinary class on the root
 * rather than a `:host(:focus-within)` rule reaching across the boundary, and
 * the control needs no `::slotted` normalisation because it is not slotted.
 * See the disposition table in input-group.md.
 */
import { bindInputGroup } from './input-group.behavior';

export class RaftersInputGroup extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindInputGroup(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-input-group')) {
  customElements.define('rafters-input-group', RaftersInputGroup);
}
