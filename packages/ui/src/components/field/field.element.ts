/**
 * WC performance for field: the thinnest wrapper. The score AND the DOM-native
 * client (bindField) live in field.behavior.ts, shared with the Astro
 * performance. This file only adapts that client to the custom-element
 * lifecycle -- deferring the bind one microtask because connectedCallback can
 * fire before the light-DOM children (the label, the slotted control, the
 * helper/error) are parsed.
 *
 * Field is a LIGHT-DOM enhancer: the author (or the Astro SSR) supplies the
 * markup; the element only wires the association + ARIA onto the control.
 * The oracle's shadow render (label/description/error built from attributes)
 * and its `aria-label` mirror were a shadow-boundary workaround -- dropped here
 * because a light-DOM `for`/`id` association needs no mirror (see field.md).
 */
import { bindField } from './field.behavior';

export class RaftersField extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindField(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-field')) {
  customElements.define('rafters-field', RaftersField);
}
