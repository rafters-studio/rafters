/**
 * Popover component for contextual floating content
 *
 * Built on the Float primitive for consistent positioning across all overlay components.
 * The Web Component keeps its content in light DOM, present-but-hidden.
 *
 * @cognitive-load 4/10 - Contextual content requiring focus but not blocking workflow
 * @attention-economics Partial attention: appears on trigger, dismisses on outside click or escape
 * @trust-building Predictable positioning, easy dismissal, non-blocking interaction
 * @accessibility Focus management, escape key dismissal, outside click closes, screen reader announcements
 * @semantic-meaning Contextual enhancement: additional info, controls, or options related to trigger
 *
 * @usage-patterns
 * DO: Use for contextual actions or information related to trigger element
 * DO: Position intelligently to avoid viewport edges
 * DO: Allow dismissal via escape key and outside click
 * DO: Keep content focused and relevant to trigger
 * NEVER: Critical information, primary navigation, complex multi-step forms
 *
 * @example
 * ```html
 * <rafters-popover data-side="bottom">
 *   <button type="button" data-part="trigger" id="p-trigger">Open</button>
 *   <div data-part="content" id="p-content" tabindex="-1" aria-label="Details" hidden>
 *     Popover content here
 *   </div>
 * </rafters-popover>
 * ```
 */

/**
 * <rafters-popover> -- the Web Component performance of the popover score.
 *
 * A decorator over the popover behavior: it adds the view (popover.classes.ts)
 * and the custom-element lifecycle, and calls the same `bindPopover` the Astro
 * script calls. Config is read by the bind from the host `data-*` attributes
 * (`data-default-open`, `data-side`, `data-align`, `data-side-offset`,
 * `data-align-offset`); part ids are read from the light-DOM markup, never
 * generated. No shadow root: the parts stay light DOM.
 *
 * `connectedCallback` can fire before the light-DOM children parse, so the
 * bind runs on the next microtask. `disconnectedCallback` runs the teardown.
 */

import { bindPopover } from './popover.behavior';
import { popoverClasses } from './popover.classes';

export class RaftersPopover extends HTMLElement {
  #teardown: (() => void) | null = null;
  #generation = 0;

  connectedCallback(): void {
    const generation = ++this.#generation;
    queueMicrotask(() => {
      if (generation !== this.#generation || !this.isConnected) return;
      this.#teardown?.();
      this.#applyView();
      this.#teardown = bindPopover(this);
    });
  }

  disconnectedCallback(): void {
    this.#generation++;
    this.#teardown?.();
    this.#teardown = null;
  }

  #applyView(): void {
    const classes = popoverClasses({}, { open: false });
    const content = this.querySelector<HTMLElement>('[data-part="content"]');
    if (content) content.className = classes.content;
    const close = this.querySelector<HTMLElement>('[data-part="close"]');
    if (close) close.className = classes.close;
  }
}

if (!customElements.get('rafters-popover')) {
  customElements.define('rafters-popover', RaftersPopover);
}
