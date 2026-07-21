/**
 * WC performance for input-otp: the thinnest wrapper. The score AND the
 * DOM-native binding (bindInputOtp) live in input-otp.behavior.ts, shared with
 * the Astro performance. This file only adapts that binding to the
 * custom-element lifecycle.
 *
 * A light-DOM enhancer: the author (or Astro) provides the real container with
 * its input and slot children, so the field is a working, named, autofillable
 * <input> before any JS -- the WC never renders a shadow tree of its own. The
 * bind is deferred one microtask because connectedCallback can fire before the
 * light-DOM children are parsed (upgrade order).
 */
import { bindInputOtp } from './input-otp.behavior';

export class RaftersInputOtp extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      const root = this.querySelector<HTMLElement>('[data-part="root"]');
      if (root) this.teardown = bindInputOtp(root);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-input-otp')) {
  customElements.define('rafters-input-otp', RaftersInputOtp);
}
