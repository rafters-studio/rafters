/**
 * Range slider component with precise value selection and accessibility features
 *
 * @cognitive-load 3/10 - Value selection with immediate visual feedback
 * @attention-economics Value communication: visual track, precise labels, immediate feedback
 * @trust-building Immediate visual feedback, undo capability, clear value indication
 * @accessibility Keyboard increment/decrement, screen reader value announcements, touch-friendly handles
 * @semantic-meaning Range contexts: settings=configuration, filters=data selection, controls=media/volume
 *
 * @usage-patterns
 * DO: Show current value and units for clarity
 * DO: Use large thumb size for mobile and accessibility
 * DO: Provide visual markers for discrete value ranges
 * DO: Give immediate feedback with real-time updates
 * NEVER: Invisible ranges, unclear min/max values, tiny touch targets
 *
 * @example
 * ```tsx
 * // Basic slider
 * <Slider defaultValue={[50]} max={100} step={1} />
 *
 * // Range slider with multiple handles
 * <Slider defaultValue={[25, 75]} max={100} step={5} />
 * ```
 */

/**
 * WC performance for slider: the thinnest wrapper. The score AND the DOM-native
 * binding (bindSlider) live in slider.behavior.ts, shared with the Astro
 * performance. This file only adapts that binding to the custom-element
 * lifecycle.
 *
 * A light-DOM enhancer: the author (or Astro) provides the real container with
 * its track/range/thumb children so the pointer surface and the role=slider
 * thumbs exist before any JS -- the WC never renders a shadow tree of its own.
 * The bind is deferred one microtask because connectedCallback can fire before
 * the light-DOM children are parsed (upgrade order).
 */
import { bindSlider } from './slider.behavior';

export class RaftersSlider extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      const root = this.querySelector<HTMLElement>('[data-part="root"]');
      if (root) this.teardown = bindSlider(root);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-slider')) {
  customElements.define('rafters-slider', RaftersSlider);
}
