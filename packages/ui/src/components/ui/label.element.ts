/**
 * <rafters-label> -- Web Component form label primitive.
 *
 * Mirrors the semantics of label.tsx (variant, htmlFor) using shadow-DOM-scoped
 * CSS composed via classy-wc. Auto-registers on import and is idempotent
 * against double-define.
 *
 * Attributes:
 *  - variant: 'default' | 'primary' | 'secondary' | 'destructive' | 'success'
 *             | 'warning' | 'info' | 'muted' | 'accent'   (default 'default')
 *  - for:     string -- forwarded to the inner <label>'s `for` attribute so
 *             consumers in the light tree can associate the label with a
 *             control via id reference.
 *
 * The inner <label> carries only `.label` as its className -- NO Tailwind
 * classes. Styling comes exclusively from labelStylesheet(...) adopted as
 * the per-instance stylesheet.
 *
 * NOTE: The Tailwind `peer-disabled:` utilities from label.classes.ts are
 * intentionally not replicated inside the shadow root. Those selectors
 * depend on a sibling <input> in the light tree and the shadow boundary
 * breaks that targeting. Consumers must mirror disabled/required state on
 * the <rafters-label> host or outside the shadow root.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import { type LabelVariant, labelStylesheet } from './label.styles';

const ALLOWED_VARIANTS: ReadonlyArray<LabelVariant> = [
  'default',
  'primary',
  'secondary',
  'destructive',
  'success',
  'warning',
  'info',
  'muted',
  'accent',
];

const OBSERVED_ATTRIBUTES: ReadonlyArray<string> = ['variant', 'for'] as const;

function parseVariant(value: string | null): LabelVariant {
  if (value && (ALLOWED_VARIANTS as ReadonlyArray<string>).includes(value)) {
    return value as LabelVariant;
  }
  return 'default';
}

export class RaftersLabel extends RaftersElement {
  static observedAttributes: ReadonlyArray<string> = OBSERVED_ATTRIBUTES;

  /** Per-instance stylesheet rebuilt on every variant change. */
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
    if (name === 'variant' && this._instanceSheet) {
      this._instanceSheet.replaceSync(this.composeCss());
    }
    if (name === 'for') {
      this.syncForAttribute();
      return;
    }
    this.update();
  }

  override disconnectedCallback(): void {
    this._instanceSheet = null;
  }

  /**
   * Build the CSS string for the current attribute values.
   */
  private composeCss(): string {
    return labelStylesheet({
      variant: parseVariant(this.getAttribute('variant')),
    });
  }

  /**
   * Forward the host's `for` attribute to the inner <label> without
   * re-rendering the DOM tree. When the attribute is absent, clear it on
   * the inner element.
   */
  private syncForAttribute(): void {
    const inner = this.shadowRoot?.querySelector('label.label');
    if (!inner) return;
    const forValue = this.getAttribute('for');
    if (forValue === null) {
      inner.removeAttribute('for');
    } else {
      inner.setAttribute('for', forValue);
    }
  }

  /**
   * Render the inner semantic <label> with a single default <slot>.
   * DOM APIs only -- never innerHTML. The inner label carries only the
   * `.label` class so visual state comes exclusively from the per-instance
   * stylesheet.
   */
  override render(): Node {
    const inner = document.createElement('label');
    inner.className = 'label';
    const forValue = this.getAttribute('for');
    if (forValue !== null) {
      inner.setAttribute('for', forValue);
    }
    const slot = document.createElement('slot');
    inner.appendChild(slot);
    return inner;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-label')) {
  customElements.define('rafters-label', RaftersLabel);
}
