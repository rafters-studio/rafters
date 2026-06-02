/**
 * <rafters-label> -- Web Component form label primitive.
 *
 * Framework-target for the Label component, parallel to label.tsx (React)
 * and label.astro (Astro). The inner label carries the SAME utility class
 * strings the React/Astro targets use -- imported from label.classes.ts --
 * rather than a parallel hand-written CSS map. Presentation resolves from the
 * shared compiled utility sheet adopted by RaftersElement (setUtilityCSS) plus
 * the token custom properties inherited from the host :root.
 *
 * The only shadow-scoped CSS this component owns is the structural :host
 * display shim.
 *
 * Shadow DOM structure: an inner label carrying the composed label utility
 * classes, wrapping a default slot.
 *
 * Attributes:
 *  - variant: 'default' | 'primary' | 'secondary' | 'destructive' | 'success'
 *             | 'warning' | 'info' | 'muted' | 'accent'   (default 'default')
 *  - for:     string -- forwarded to the inner label's `for` attribute so
 *             consumers in the light tree can associate the label with a
 *             control via id reference.
 *
 * NOTE: The Tailwind `peer-disabled:` utilities from label.classes.ts depend
 * on a sibling input in the light tree; the shadow boundary breaks that
 * targeting. Consumers must mirror disabled/required state on the
 * <rafters-label> host or outside the shadow root.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import { labelBaseClasses, labelVariantClasses } from './label.classes';

export type LabelVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info'
  | 'muted'
  | 'accent';

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

/**
 * Compose the inner label's class string from the shared class maps.
 * Exported so tests assert the WC renders the exact same composition the
 * Astro target does -- the parity guarantee.
 */
export function composeLabelClasses(variant: LabelVariant): string {
  return `${labelBaseClasses} ${labelVariantClasses[variant]}`;
}

export class RaftersLabel extends RaftersElement {
  static override styles = ':host { display: inline-block; }';

  static readonly observedAttributes: ReadonlyArray<string> = OBSERVED_ATTRIBUTES;

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;
    // for maps onto the inner label's `for` attribute without re-rendering.
    if (name === 'for') {
      this.syncForAttribute();
      return;
    }
    this.update();
  }

  /**
   * Forward the host's `for` attribute to the inner label without
   * re-rendering the DOM tree. When the attribute is absent, clear it on
   * the inner element.
   */
  private syncForAttribute(): void {
    const inner = this.shadowRoot?.querySelector('label');
    if (!inner) return;
    const forValue = this.getAttribute('for');
    if (forValue === null) {
      inner.removeAttribute('for');
    } else {
      inner.setAttribute('for', forValue);
    }
  }

  /**
   * Render the inner semantic label with a single default slot.
   * DOM APIs only -- never innerHTML.
   */
  override render(): Node {
    const inner = document.createElement('label');
    inner.className = composeLabelClasses(parseVariant(this.getAttribute('variant')));
    const forValue = this.getAttribute('for');
    if (forValue !== null) {
      inner.setAttribute('for', forValue);
    }
    inner.appendChild(document.createElement('slot'));
    return inner;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-label')) {
  customElements.define('rafters-label', RaftersLabel);
}
