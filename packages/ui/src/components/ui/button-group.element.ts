/**
 * <rafters-button-group> -- Web Component layout primitive.
 *
 * Groups related buttons (native <button> or <rafters-button>) with connected
 * borders and focus stacking so they read as a cohesive action set. This is a
 * layout composition element: it arranges whatever is slotted inside but
 * renders no buttons itself, holds no internal state, and is NOT
 * form-associated.
 *
 * Attributes:
 *  - orientation: 'horizontal' | 'vertical'  (default 'horizontal')
 *
 * Styling comes exclusively from buttonGroupStylesheet(...) adopted as the
 * per-instance stylesheet. The inner <div> carries no Tailwind classes; all
 * connected-border and focus-stacking rules target ::slotted(*) so they
 * apply to whatever the consumer projects into the group.
 *
 * role="group" and data-orientation are reflected on the host element so
 * assistive tech and consumer styling can target them without piercing the
 * shadow root.
 *
 * Unknown orientation values silently fall back to 'horizontal'.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import {
  type ButtonGroupOrientation,
  buttonGroupStylesheet,
  isButtonGroupOrientation,
} from './button-group.styles';

const OBSERVED_ATTRIBUTES: ReadonlyArray<string> = ['orientation'] as const;

function parseOrientation(value: string | null): ButtonGroupOrientation {
  return isButtonGroupOrientation(value) ? value : 'horizontal';
}

export class RaftersButtonGroup extends RaftersElement {
  static observedAttributes: ReadonlyArray<string> = OBSERVED_ATTRIBUTES;

  /** Per-instance stylesheet rebuilt when orientation changes. */
  private _instanceSheet: CSSStyleSheet | null = null;

  get orientation(): ButtonGroupOrientation {
    return parseOrientation(this.getAttribute('orientation'));
  }

  set orientation(next: ButtonGroupOrientation) {
    this.setAttribute('orientation', next);
  }

  override connectedCallback(): void {
    if (!this.shadowRoot) return;
    this._instanceSheet = new CSSStyleSheet();
    this._instanceSheet.replaceSync(this.composeCss());
    this.shadowRoot.adoptedStyleSheets = [this._instanceSheet];
    this.reflectHostAttributes();
    this.update();
  }

  override attributeChangedCallback(
    _name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;
    if (this._instanceSheet) {
      this._instanceSheet.replaceSync(this.composeCss());
    }
    this.reflectHostAttributes();
    this.update();
  }

  override disconnectedCallback(): void {
    this._instanceSheet = null;
  }

  /**
   * Build the CSS string for the current attribute values.
   */
  private composeCss(): string {
    return buttonGroupStylesheet({ orientation: this.orientation });
  }

  /**
   * Reflect role and the resolved orientation back onto the host so assistive
   * tech and consumer styling can target them without piercing the shadow
   * root. role="group" is the WAI-ARIA APG pattern for a related control set.
   */
  private reflectHostAttributes(): void {
    this.setAttribute('role', 'group');
    this.setAttribute('data-orientation', this.orientation);
  }

  /**
   * Render the inner wrapper with a single default <slot>. The wrapper carries
   * no classes; all styling lives in the per-instance stylesheet via :host and
   * ::slotted(*) selectors.
   */
  override render(): Node {
    const inner = document.createElement('div');
    const slot = document.createElement('slot');
    inner.appendChild(slot);
    return inner;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-button-group')) {
  customElements.define('rafters-button-group', RaftersButtonGroup);
}
