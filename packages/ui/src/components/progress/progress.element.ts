/**
 * <rafters-progress> -- the Web Component decorator of the Progress score.
 *
 * Progress has a LIVE ARIA projection, so (unlike card/container) this is a
 * light-DOM ENHANCER, not a shadow static: the host IS the progressbar root
 * (host === root), and bindProgress -- the SAME DOM-native client the Astro
 * <script> uses -- projects the aria-value contract onto it and sizes the
 * indicator fill. This file only adds the view (progressClasses) and the
 * custom-element lifecycle around that shared binding.
 *
 * The host renders the indicator as a light-DOM child (data-part="indicator");
 * consumer content is not projected (progress has no slot).
 *
 * Attributes:
 *  - value:      number in [0, max] (absent / non-numeric = indeterminate)
 *  - max:        number > 0 (default 100; non-positive falls back to 100)
 *  - variant:    default | primary | secondary | destructive | success |
 *                warning | info | accent (default 'default')
 *  - size:       sm | default | lg (default 'default')
 *  - value-text: optional accessible label; overrides the default `${percent}%`
 *  - aria-label / aria-labelledby: native passthrough on the progressbar host
 *
 * Gotcha 3: connectedCallback can fire before the light-DOM is settled, so the
 * structure build + bind is deferred one microtask. Attribute changes after
 * the first bind rebuild the view and re-apply the projection (progress value
 * is config, so a new value is a new config).
 *
 * DOM APIs only -- never innerHTML.
 *
 * @cognitive-load 4/10
 * @accessibility role="progressbar" with aria-valuemin/max/now/text; aria-busy
 *                when indeterminate. Requires aria-label / aria-labelledby.
 */

import { bindProgress, readProgressConfig } from './progress.behavior';
import { progressClasses } from './progress.classes';

export class RaftersProgress extends HTMLElement {
  static readonly observedAttributes: ReadonlyArray<string> = [
    'value',
    'max',
    'variant',
    'size',
    'value-text',
  ];

  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    // host === root; custom elements default to display:inline, but the track
    // needs the block box the React/Astro root is (the structural shim).
    this.style.display = 'block';
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) {
        this.build();
        this.teardown = bindProgress(this);
      }
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }

  attributeChangedCallback(): void {
    // Only after the first bind; the initial attribute set is handled by the
    // deferred build in connectedCallback. A new value is a new config, so
    // rebuild the view and re-apply the projection through a fresh bind.
    if (!this.teardown) return;
    this.teardown();
    this.build();
    this.teardown = bindProgress(this);
  }

  /** Paint the view: the host carries the track classes and the fill's
   *  classes; the ARIA and the fill width are the binding's job. */
  private build(): void {
    const config = readProgressConfig(this);
    const classes = progressClasses(config, {});

    this.setAttribute('data-part', 'root');
    this.className = classes.root;

    let indicator = this.querySelector<HTMLElement>('[data-part="indicator"]');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.setAttribute('data-part', 'indicator');
      this.appendChild(indicator);
    }
    indicator.className = classes.indicator;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-progress')) {
  customElements.define('rafters-progress', RaftersProgress);
}
