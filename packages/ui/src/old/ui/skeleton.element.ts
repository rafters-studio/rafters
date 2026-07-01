/**
 * <rafters-skeleton> -- Web Component skeleton loader.
 *
 * Framework-target for the Skeleton component, parallel to skeleton.tsx
 * (React) and skeleton.astro (Astro). The inner div carries the SAME utility
 * class strings the React/Astro targets use -- imported from
 * skeleton.classes.ts -- rather than a parallel hand-written CSS map.
 * Presentation resolves from the shared compiled utility sheet adopted by
 * RaftersElement (setUtilityCSS) plus the token custom properties inherited
 * from the host :root. The pulse animation and its reduced-motion opt-out are
 * expressed as the animate-pulse / motion-reduce:animate-none utilities.
 *
 * The only shadow-scoped CSS this component owns is the structural :host
 * display shim.
 *
 * Shadow DOM structure: an inner div carrying the composed skeleton utility
 * classes, marked aria-hidden. No slot -- skeleton is purely decorative.
 *
 * Attributes:
 *  - variant: 'default' | 'primary' | 'secondary' | 'destructive' | 'success'
 *             | 'warning' | 'info' | 'muted' | 'accent' (default 'default')
 *
 * Unknown variant values fall back to 'default' silently.
 *
 * @cognitive-load 1/10
 * @accessibility aria-hidden decorative placeholder; animation respects
 *                prefers-reduced-motion via the motion-reduce utility.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import { skeletonBaseClasses, skeletonVariantClasses } from './skeleton.classes';

export type SkeletonVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info'
  | 'muted'
  | 'accent';

const ALLOWED_VARIANTS: ReadonlyArray<SkeletonVariant> = [
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

function parseVariant(value: string | null): SkeletonVariant {
  if (value && (ALLOWED_VARIANTS as ReadonlyArray<string>).includes(value)) {
    return value as SkeletonVariant;
  }
  return 'default';
}

/**
 * Compose the inner div's class string from the shared class maps.
 * Exported so tests assert the WC renders the exact same composition the
 * Astro target does -- the parity guarantee.
 */
export function composeSkeletonClasses(variant: SkeletonVariant): string {
  return `${skeletonBaseClasses} ${skeletonVariantClasses[variant]}`;
}

export class RaftersSkeleton extends RaftersElement {
  static override styles = ':host { display: block; }';

  static readonly observedAttributes: ReadonlyArray<string> = OBSERVED_ATTRIBUTES;

  /**
   * Render a single decorative div with aria-hidden. No slot -- skeleton
   * is purely a loading placeholder. DOM APIs only -- never innerHTML.
   */
  override render(): Node {
    const inner = document.createElement('div');
    inner.className = composeSkeletonClasses(parseVariant(this.getAttribute('variant')));
    inner.setAttribute('aria-hidden', 'true');
    return inner;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-skeleton')) {
  customElements.define('rafters-skeleton', RaftersSkeleton);
}
