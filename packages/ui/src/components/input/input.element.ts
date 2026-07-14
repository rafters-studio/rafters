/**
 * WC performance for input: the thinnest wrapper. The score AND the DOM-native
 * binding (bindInput) live in input.behavior.ts, shared with the Astro
 * performance. This file only adapts that binding to the custom-element
 * lifecycle -- deferring the bind one microtask because connectedCallback can
 * fire before the light-DOM <input> is parsed.
 */
import { bindInput } from './input.behavior';

export class RaftersInput extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindInput(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-input')) {
  customElements.define('rafters-input', RaftersInput);
}
