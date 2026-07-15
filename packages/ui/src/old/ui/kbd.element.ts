/**
 * <rafters-kbd> -- Web Component keyboard key indicator primitive.
 *
 * Framework-target for the Kbd component, parallel to kbd.tsx (React)
 * and kbd.astro (Astro). The inner kbd carries the SAME utility class
 * strings the React/Astro targets use -- imported from kbd.classes.ts --
 * rather than a parallel hand-written CSS map. Presentation resolves from the
 * shared compiled utility sheet adopted by RaftersElement (setUtilityCSS) plus
 * the token custom properties inherited from the host :root.
 *
 * The only shadow-scoped CSS this component owns is the structural :host
 * display shim.
 *
 * Shadow DOM structure: an inner kbd carrying the base kbd utility classes,
 * wrapping a default slot.
 *
 * No attributes -- the React target has no variants or sizes either.
 *
 * @cognitive-load 1/10 Simple visual indicator, no interaction required.
 * @accessibility Semantic kbd element preserved in the shadow root.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import { kbdBaseClasses } from './kbd.classes';

/**
 * Compose the inner kbd's class string from the shared class map. Exported so
 * tests assert the WC renders the exact same composition the Astro target does
 * -- the parity guarantee. Kbd has no variants or sizes, so this returns the
 * base classes alone.
 */
export function composeKbdClasses(): string {
  return kbdBaseClasses;
}

export class RaftersKbd extends RaftersElement {
  static override styles = ':host { display: inline-flex; }';

  static readonly observedAttributes: ReadonlyArray<string> = [];

  override render(): Node {
    const inner = document.createElement('kbd');
    inner.className = composeKbdClasses();
    inner.appendChild(document.createElement('slot'));
    return inner;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-kbd')) {
  customElements.define('rafters-kbd', RaftersKbd);
}
