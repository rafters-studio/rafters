/**
 * Progress indicator for task completion status
 *
 * @cognitive-load 4/10 - Moderate attention required for progress monitoring
 * @attention-economics Temporal attention: Holds user attention during wait states with clear progress indication
 * @trust-building Accurate progress builds user confidence; clear completion states and next steps
 * @accessibility Screen reader announcements via native progress element; keyboard navigation not applicable
 * @semantic-meaning Progress communication: determinate=known duration with value, indeterminate=unknown duration
 *
 * @usage-patterns
 * DO: Provide accurate progress indication when possible
 * DO: Use indeterminate for unknown durations
 * DO: Show clear completion states
 * DO: Include value labels for complex operations
 * NEVER: Fake progress (inaccurate progress bars)
 * NEVER: Use for instant operations (< 1 second)
 * NEVER: Leave progress at 99% indefinitely
 *
 * @example
 * ```tsx
 * // Determinate progress
 * <Progress value={66} />
 *
 * // With custom label
 * <Progress
 *   value={3}
 *   max={10}
 *   getValueLabel={(value, max) => `${value} of ${max} files uploaded`}
 * />
 *
 * // Indeterminate (loading)
 * <Progress />
 * ```
 */
import { bindProgress, readProgressConfig } from './progress.behavior';
import { progressClasses } from './progress.classes';

/**
 * Progress -- the Web Component decorator of the Progress score.
 *
 * The custom element IS the progressbar (host === root): it reads its config
 * from its own `data-*` attributes, paints the shared classes on the host and
 * its `[data-part="indicator"]` child, and hands the host to `bindProgress`,
 * the same client the Astro decorator uses. The bind runs one microtask after
 * connect because light-DOM children may not have parsed yet. Attribute
 * changes tear the bind down and re-derive.
 */
export class RaftersProgress extends HTMLElement {
  static observedAttributes: string[] = [
    'data-value',
    'data-max',
    'data-value-text',
    'data-variant',
    'data-size',
  ];

  #teardown: (() => void) | null = null;
  #scheduled = false;
  #connected = false;

  connectedCallback(): void {
    this.#connected = true;
    this.#schedule();
  }

  disconnectedCallback(): void {
    this.#connected = false;
    this.#release();
  }

  attributeChangedCallback(): void {
    if (this.#connected) this.#schedule();
  }

  #release(): void {
    if (this.#teardown) {
      this.#teardown();
      this.#teardown = null;
    }
  }

  #schedule(): void {
    if (this.#scheduled) return;
    this.#scheduled = true;
    queueMicrotask(() => {
      this.#scheduled = false;
      if (this.#connected) this.#derive();
    });
  }

  #derive(): void {
    this.#release();
    const config = readProgressConfig(this);
    const classes = progressClasses(config, {});
    this.className = classes.root;
    const indicator = this.querySelector<HTMLElement>(':scope > [data-part="indicator"]');
    if (indicator) indicator.className = classes.indicator;
    this.#teardown = bindProgress(this);
  }
}

if (!customElements.get('rafters-progress')) {
  customElements.define('rafters-progress', RaftersProgress);
}
