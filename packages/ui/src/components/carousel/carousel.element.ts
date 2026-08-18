/**
 * Carousel component for cycling through content slides
 *
 * @cognitive-load 4/10 - Familiar slideshow pattern; left/right navigation intuitive
 * @attention-economics Medium attention: viewing content, navigating between slides
 * @trust-building Clear navigation affordances, visible progress indicators, keyboard accessible
 * @accessibility Keyboard navigation (arrows), ARIA live region for announcements, focus management
 * @semantic-meaning Content showcase: image galleries, testimonials, feature tours
 *
 * @usage-patterns
 * DO: Provide clear navigation controls (arrows, dots)
 * DO: Show current position indicator
 * DO: Support keyboard navigation
 * DO: Pause auto-play on hover/focus
 * DO: Support touch/swipe gestures
 * NEVER: Auto-advance too quickly (allow content consumption)
 * NEVER: Hide all navigation controls
 * NEVER: Loop without clear indication
 *
 * @example
 * ```tsx
 * <Carousel>
 *   <Carousel.Content>
 *     <Carousel.Item>Slide 1</Carousel.Item>
 *     <Carousel.Item>Slide 2</Carousel.Item>
 *     <Carousel.Item>Slide 3</Carousel.Item>
 *   </Carousel.Content>
 *   <Carousel.Previous />
 *   <Carousel.Next />
 * </Carousel>
 * ```
 */

/**
 * WC performance for carousel: the thinnest wrapper. All behavior -- including
 * the DOM binding -- lives in carousel.behavior.ts, shared with the Astro
 * performance. This file only adapts that binding to the custom-element
 * lifecycle.
 */
import { bindCarousel } from './carousel.behavior';

export class RaftersCarousel extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    if (!this.hasAttribute('role')) this.setAttribute('role', 'region');
    // The custom element IS the root part -- mark it so the DOM-native binding
    // and the conformance harness resolve it without a wrapper element.
    if (!this.hasAttribute('data-part')) this.setAttribute('data-part', 'root');
    // connectedCallback can fire before the light-DOM children are parsed
    // (upgrade order), so bind on the next microtask when the parts exist.
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindCarousel(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-carousel')) {
  customElements.define('rafters-carousel', RaftersCarousel);
}
