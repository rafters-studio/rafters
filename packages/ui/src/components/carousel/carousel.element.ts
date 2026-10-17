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
import { bindCarousel } from './carousel.behavior';

/**
 * <rafters-carousel> wraps the light-DOM markup carousel.astro renders and
 * binds bindCarousel to its [data-part="root"] one microtask after connecting.
 * Uncontrolled, no shadow root, no events.
 */
export class RaftersCarousel extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      const root = this.querySelector<HTMLElement>('[data-part="root"]');
      if (root === null) return;
      this.teardown = bindCarousel(root);
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
