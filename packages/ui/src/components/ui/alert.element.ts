/**
 * <rafters-alert> Web Component
 *
 * Framework-target for the Alert component, parallel to alert.tsx (React)
 * and alert.astro (Astro). The inner div carries the SAME utility class
 * strings the React/Astro targets use -- imported from alert.classes.ts --
 * rather than a parallel hand-written CSS map. Presentation resolves from the
 * shared compiled utility sheet adopted by RaftersElement (setUtilityCSS) plus
 * the token custom properties inherited from the host :root.
 *
 * The only shadow-scoped CSS this component owns is the structural :host
 * display shim.
 *
 * Shadow DOM structure: an inner div with role=alert carrying the composed
 * alert utility classes, wrapping a default slot.
 *
 * Attributes:
 *   variant  default | primary | secondary | destructive | success | warning
 *            | info | muted | accent
 *
 * Unknown attribute values fall back to 'default' silently and NEVER throw.
 * Subcomponents (title/description/action) are out of scope -- consumers
 * compose with plain slotted elements.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import { alertBaseClasses, alertVariantClasses } from './alert.classes';

export type AlertVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info'
  | 'muted'
  | 'accent';

const ALLOWED_VARIANTS: ReadonlyArray<AlertVariant> = [
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

const OBSERVED_ATTRIBUTES: ReadonlyArray<string> = ['variant'] as const;

function parseVariant(value: string | null): AlertVariant {
  if (value && (ALLOWED_VARIANTS as ReadonlyArray<string>).includes(value)) {
    return value as AlertVariant;
  }
  return 'default';
}

/**
 * Compose the inner div's class string from the shared class maps.
 * Exported so tests assert the WC renders the exact same composition the
 * Astro target does -- the parity guarantee.
 */
export function composeAlertClasses(variant: AlertVariant): string {
  return `${alertBaseClasses} ${alertVariantClasses[variant]}`;
}

export class RaftersAlert extends RaftersElement {
  static override styles = ':host { display: block; }';

  static readonly observedAttributes: ReadonlyArray<string> = OBSERVED_ATTRIBUTES;

  override render(): Node {
    const wrapper = document.createElement('div');
    wrapper.className = composeAlertClasses(parseVariant(this.getAttribute('variant')));
    wrapper.setAttribute('role', 'alert');
    wrapper.appendChild(document.createElement('slot'));
    return wrapper;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-alert')) {
  customElements.define('rafters-alert', RaftersAlert);
}
