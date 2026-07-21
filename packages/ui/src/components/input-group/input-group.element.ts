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
