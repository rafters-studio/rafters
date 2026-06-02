/**
 * <rafters-spinner> -- Web Component loading spinner.
 *
 * Framework-target for the Spinner component, parallel to spinner.tsx (React)
 * and spinner.astro (Astro). The inner output carries the SAME utility class
 * strings the React/Astro targets use -- imported from spinner.classes.ts --
 * rather than a parallel hand-written CSS map. Presentation resolves from the
 * shared compiled utility sheet adopted by RaftersElement (setUtilityCSS) plus
 * the token custom properties inherited from the host :root. The spin
 * animation and its reduced-motion opt-out are expressed as the animate-spin /
 * motion-reduce:animate-none utilities, and the visually-hidden label uses the
 * shared sr-only utility.
 *
 * The only shadow-scoped CSS this component owns is the structural :host
 * display shim.
 *
 * Shadow DOM structure: an inner output carrying the composed spinner utility
 * classes, wrapping an sr-only span with the redundant "Loading" text.
 *
 * Attributes:
 *  - size:    'sm' | 'default' | 'lg'  (default 'default')
 *  - variant: 'default' | 'primary' | 'secondary' | 'destructive' | 'success'
 *             | 'warning' | 'info' | 'accent' | 'muted'  (default 'default')
 *
 * Unknown attribute values fall back to 'default' silently.
 *
 * @cognitive-load 2/10
 * @accessibility role=status implied by output, aria-label announces
 *                "Loading" to assistive tech; sr-only text carries the same
 *                phrase for screen readers that favour text content.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import { spinnerBaseClasses, spinnerSizeClasses, spinnerVariantClasses } from './spinner.classes';

export type SpinnerSize = 'sm' | 'default' | 'lg';

export type SpinnerVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info'
  | 'accent'
  | 'muted';

const ALLOWED_SIZES: ReadonlyArray<SpinnerSize> = ['sm', 'default', 'lg'];

const ALLOWED_VARIANTS: ReadonlyArray<SpinnerVariant> = [
  'default',
  'primary',
  'secondary',
  'destructive',
  'success',
  'warning',
  'info',
  'accent',
  'muted',
];

const OBSERVED_ATTRIBUTES: ReadonlyArray<string> = ['size', 'variant'] as const;

function parseSize(value: string | null): SpinnerSize {
  if (value && (ALLOWED_SIZES as ReadonlyArray<string>).includes(value)) {
    return value as SpinnerSize;
  }
  return 'default';
}

function parseVariant(value: string | null): SpinnerVariant {
  if (value && (ALLOWED_VARIANTS as ReadonlyArray<string>).includes(value)) {
    return value as SpinnerVariant;
  }
  return 'default';
}

/**
 * Compose the inner output's class string from the shared class maps.
 * Exported so tests assert the WC renders the exact same composition the
 * Astro target does -- the parity guarantee.
 */
export function composeSpinnerClasses(size: SpinnerSize, variant: SpinnerVariant): string {
  return `${spinnerBaseClasses} ${spinnerVariantClasses[variant]} ${spinnerSizeClasses[size]}`;
}

export class RaftersSpinner extends RaftersElement {
  static override styles = ':host { display: inline-block; }';

  static readonly observedAttributes: ReadonlyArray<string> = OBSERVED_ATTRIBUTES;

  /**
   * Render an output with aria-label="Loading" carrying the composed spinner
   * utility classes, wrapping an sr-only span for redundant screen-reader
   * text. DOM APIs only -- never innerHTML.
   */
  override render(): Node {
    const output = document.createElement('output');
    output.className = composeSpinnerClasses(
      parseSize(this.getAttribute('size')),
      parseVariant(this.getAttribute('variant')),
    );
    output.setAttribute('aria-label', 'Loading');
    const srText = document.createElement('span');
    srText.className = 'sr-only';
    srText.textContent = 'Loading';
    output.appendChild(srText);
    return output;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-spinner')) {
  customElements.define('rafters-spinner', RaftersSpinner);
}
