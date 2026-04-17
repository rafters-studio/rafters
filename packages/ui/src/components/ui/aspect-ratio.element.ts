/**
 * <rafters-aspect-ratio> -- Web Component aspect-ratio container.
 *
 * Mirrors the semantics of aspect-ratio.tsx (ratio) using shadow-DOM-scoped
 * CSS composed via classy-wc. Auto-registers on import and is idempotent
 * against double-define.
 *
 * Attributes:
 *  - ratio: positive number. Accepted formats:
 *      - "16/9"   (fraction string, split-and-divide)
 *      - "1.778"  (decimal string, Number())
 *      - "1"      (integer string, Number())
 *    Non-positive or non-numeric values fall back to 1 silently.
 *
 * Shadow DOM structure:
 *   <div class="aspect-ratio"><slot></slot></div>
 *
 * The `aspect-ratio` CSS property is set on the `.aspect-ratio` rule via
 * the per-instance stylesheet, NOT via an inline style attribute. This
 * keeps the element file free of style-attribute manipulation.
 *
 * Slotted children (<img>, <iframe>, ...) fill the container via a
 * `::slotted(*)` rule inside aspectRatioStylesheet(). The React target's
 * `[&>*]:absolute` Tailwind selectors cannot cross the shadow boundary,
 * so the shadow-DOM surface encodes the same behaviour natively.
 *
 * DOM APIs only -- never innerHTML. NEVER a raw CSS custom-property function
 * literal in this file; token references live in aspect-ratio.styles.ts.
 * Motion tokens use --motion-duration-* / --motion-ease-* only.
 *
 * @cognitive-load 1/10
 * @accessibility Layout utility; slotted content carries its own semantics.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import { aspectRatioStylesheet } from './aspect-ratio.styles';

const OBSERVED_ATTRIBUTES: ReadonlyArray<string> = ['ratio'] as const;

export class RaftersAspectRatio extends RaftersElement {
  static readonly observedAttributes: ReadonlyArray<string> = OBSERVED_ATTRIBUTES;

  /** Per-instance stylesheet rebuilt on ratio changes. */
  private _instanceSheet: CSSStyleSheet | null = null;

  override connectedCallback(): void {
    if (!this.shadowRoot) return;
    this._instanceSheet = new CSSStyleSheet();
    this._instanceSheet.replaceSync(this.composeCss());
    this.shadowRoot.adoptedStyleSheets = [this._instanceSheet];
    this.update();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;
    if (name === 'ratio' && this._instanceSheet) {
      this._instanceSheet.replaceSync(this.composeCss());
    }
    this.update();
  }

  override disconnectedCallback(): void {
    this._instanceSheet = null;
  }

  /**
   * Build the CSS string for the current ratio attribute. Delegates to
   * aspectRatioStylesheet(), which parses and falls back on invalid input.
   */
  private composeCss(): string {
    return aspectRatioStylesheet({ ratio: this.getAttribute('ratio') });
  }

  /**
   * Render a single .aspect-ratio wrapper with one default <slot>.
   * DOM APIs only -- never innerHTML. The wrapper carries NO inline
   * style; the `aspect-ratio` CSS property comes from the per-instance
   * stylesheet instead.
   */
  override render(): Node {
    const inner = document.createElement('div');
    inner.className = 'aspect-ratio';
    const slot = document.createElement('slot');
    inner.appendChild(slot);
    return inner;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-aspect-ratio')) {
  customElements.define('rafters-aspect-ratio', RaftersAspectRatio);
}
