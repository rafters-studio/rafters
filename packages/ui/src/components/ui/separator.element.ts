/**
 * <rafters-separator> -- Web Component separator primitive.
 *
 * Mirrors the semantics of separator.tsx (orientation, decorative) using
 * shadow-DOM-scoped CSS composed via classy-wc. Auto-registers on import
 * and is idempotent against double-define.
 *
 * Attributes:
 *  - orientation: 'horizontal' | 'vertical'  (default 'horizontal')
 *  - decorative:  presence-based. ABSENT = decorative (matches React's
 *                 default of true). PRESENT and not exactly "false" =
 *                 non-decorative. `<rafters-separator decorative="false">`
 *                 turns non-decorative OFF (i.e. remains decorative).
 *
 * Shadow DOM structure:
 *   <div class="separator orientation-{orientation}" role=... aria-orientation=...>
 *
 * Accessibility:
 *  - Decorative: role="none" on the inner div, no aria-orientation.
 *  - Non-decorative: role="separator" on the inner div, aria-orientation
 *    mirrors the current orientation.
 *
 * Rendering:
 *  - No <slot>; separator has no slotted content.
 *  - DOM APIs only; never innerHTML.
 *
 * @cognitive-load 0/10
 */

import { RaftersElement } from '../../primitives/rafters-element';
import { type SeparatorOrientation, separatorStylesheet } from './separator.styles';

const ALLOWED_ORIENTATIONS: ReadonlyArray<SeparatorOrientation> = ['horizontal', 'vertical'];

const OBSERVED_ATTRIBUTES: ReadonlyArray<string> = ['orientation', 'decorative'] as const;

function parseOrientation(value: string | null): SeparatorOrientation {
  if (value && (ALLOWED_ORIENTATIONS as ReadonlyArray<string>).includes(value)) {
    return value as SeparatorOrientation;
  }
  return 'horizontal';
}

export class RaftersSeparator extends RaftersElement {
  static readonly observedAttributes: ReadonlyArray<string> = OBSERVED_ATTRIBUTES;

  /** Per-instance stylesheet mutated in place on every attribute change. */
  private _instanceSheet: CSSStyleSheet | null = null;

  override connectedCallback(): void {
    if (!this.shadowRoot) return;
    this._instanceSheet = new CSSStyleSheet();
    this._instanceSheet.replaceSync(this.composeCss());
    this.shadowRoot.adoptedStyleSheets = [this._instanceSheet];
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
    this.update();
  }

  override disconnectedCallback(): void {
    this._instanceSheet = null;
  }

  /**
   * Whether the separator should expose a non-decorative `role="separator"`
   * with `aria-orientation`. Presence-based: absent = decorative, present
   * and not the literal string "false" = non-decorative.
   */
  private isNonDecorative(): boolean {
    return this.hasAttribute('decorative') && this.getAttribute('decorative') !== 'false';
  }

  /**
   * Build the CSS string for the current attribute values.
   */
  private composeCss(): string {
    return separatorStylesheet({
      orientation: parseOrientation(this.getAttribute('orientation')),
    });
  }

  /**
   * Render the inner `<div.separator>` with orientation-specific class and
   * ARIA attributes. DOM APIs only -- never innerHTML.
   */
  override render(): Node {
    const orientation = parseOrientation(this.getAttribute('orientation'));
    const nonDecorative = this.isNonDecorative();

    const inner = document.createElement('div');
    inner.className = `separator orientation-${orientation}`;

    if (nonDecorative) {
      inner.setAttribute('role', 'separator');
      inner.setAttribute('aria-orientation', orientation);
    } else {
      inner.setAttribute('role', 'none');
    }

    return inner;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-separator')) {
  customElements.define('rafters-separator', RaftersSeparator);
}
