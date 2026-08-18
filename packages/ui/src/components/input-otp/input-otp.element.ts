/**
 * InputOTP component for one-time password and verification code input
 *
 * @cognitive-load 4/10 - Single-purpose input; segmented display aids focus
 * @attention-economics Medium attention: focused on accurate character entry
 * @trust-building Clear slot indicators, auto-advance between slots, paste support
 * @accessibility Single input with ARIA live for progress, visible focus state
 * @semantic-meaning Security verification: 2FA, email confirmation, phone verification
 *
 * @usage-patterns
 * DO: Use for verification codes (2FA, email, SMS)
 * DO: Support paste for full code
 * DO: Auto-advance cursor between slots
 * DO: Show clear visual feedback for filled vs empty slots
 * DO: Allow backspace to navigate and clear
 * NEVER: Use for regular text input
 * NEVER: Hide the input visually from screen readers
 * NEVER: Require manual tab between slots
 *
 * @example
 * ```tsx
 * <InputOTP maxLength={6} value={otp} onChange={setOtp}>
 *   <InputOTP.Group>
 *     <InputOTP.Slot index={0} />
 *     <InputOTP.Slot index={1} />
 *     <InputOTP.Slot index={2} />
 *   </InputOTP.Group>
 *   <InputOTP.Separator />
 *   <InputOTP.Group>
 *     <InputOTP.Slot index={3} />
 *     <InputOTP.Slot index={4} />
 *     <InputOTP.Slot index={5} />
 *   </InputOTP.Group>
 * </InputOTP>
 * ```
 */

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
