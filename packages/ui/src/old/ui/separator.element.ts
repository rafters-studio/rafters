/**
 * <rafters-separator> -- Web Component separator primitive.
 *
 * Framework-target for the Separator component, parallel to separator.tsx
 * (React) and separator.astro (Astro). The inner div carries the SAME utility
 * class strings the React/Astro targets use -- imported from
 * separator.classes.ts -- rather than a parallel hand-written CSS map.
 * Presentation resolves from the shared compiled utility sheet adopted by
 * RaftersElement (setUtilityCSS) plus the token custom properties inherited
 * from the host :root.
 *
 * The only shadow-scoped CSS this component owns is the structural :host
 * display shim.
 *
 * Attributes:
 *  - orientation: 'horizontal' | 'vertical'  (default 'horizontal')
 *  - decorative:  presence-based. ABSENT = decorative (matches React's
 *                 default of true). PRESENT and not exactly "false" =
 *                 non-decorative. A decorative="false" value turns
 *                 non-decorative OFF (i.e. remains decorative).
 *
 * Shadow DOM structure: an inner div carrying the composed separator utility
 * classes, with role and aria-orientation per the decorative contract.
 *
 * Accessibility:
 *  - Decorative: role="none" on the inner div, no aria-orientation.
 *  - Non-decorative: role="separator" on the inner div, aria-orientation
 *    mirrors the current orientation.
 *
 * Rendering: no slot; separator has no slotted content. DOM APIs only;
 * never innerHTML.
 *
 * @cognitive-load 0/10
 */

import { RaftersElement } from '../../primitives/rafters-element';
import { separatorBaseClasses, separatorOrientationClasses } from './separator.classes';

export type SeparatorOrientation = 'horizontal' | 'vertical';

const ALLOWED_ORIENTATIONS: ReadonlyArray<SeparatorOrientation> = ['horizontal', 'vertical'];

const OBSERVED_ATTRIBUTES: ReadonlyArray<string> = ['orientation', 'decorative'] as const;

function parseOrientation(value: string | null): SeparatorOrientation {
  if (value && (ALLOWED_ORIENTATIONS as ReadonlyArray<string>).includes(value)) {
    return value as SeparatorOrientation;
  }
  return 'horizontal';
}

/**
 * Compose the inner div's class string from the shared class maps.
 * Exported so tests assert the WC renders the exact same composition the
 * Astro target does -- the parity guarantee.
 */
export function composeSeparatorClasses(orientation: SeparatorOrientation): string {
  return `${separatorBaseClasses} ${separatorOrientationClasses[orientation]}`;
}

export class RaftersSeparator extends RaftersElement {
  static override styles = ':host { display: block; }';

  static readonly observedAttributes: ReadonlyArray<string> = OBSERVED_ATTRIBUTES;

  /**
   * Whether the separator should expose a non-decorative role="separator"
   * with aria-orientation. Presence-based: absent = decorative, present and
   * not the literal string "false" = non-decorative.
   */
  private isNonDecorative(): boolean {
    return this.hasAttribute('decorative') && this.getAttribute('decorative') !== 'false';
  }

  /**
   * Render the inner separator div with the composed utility classes and ARIA
   * attributes. DOM APIs only -- never innerHTML.
   */
  override render(): Node {
    const orientation = parseOrientation(this.getAttribute('orientation'));
    const nonDecorative = this.isNonDecorative();

    const inner = document.createElement('div');
    inner.className = composeSeparatorClasses(orientation);

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
