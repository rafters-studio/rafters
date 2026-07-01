/**
 * <rafters-empty> Web Component
 *
 * Framework target for the Empty container, parallel to empty.tsx (React) and
 * empty.astro (Astro). The inner container carries the SAME utility class
 * strings the React/Astro targets use -- imported from empty.classes.ts -- so
 * presentation resolves from the shared compiled utility sheet adopted by
 * RaftersElement (setUtilityCSS) plus the token custom properties inherited
 * from the host :root.
 *
 * Auto-registers on import; registration is idempotent under HMR and
 * double-import.
 *
 * Shadow DOM structure: a single container div carrying the composed empty
 * utility classes, wrapping a default slot.
 *
 * Scope note: this covers the OUTER <rafters-empty> container only. The
 * <rafters-empty-icon>, <rafters-empty-title>, <rafters-empty-description>, and
 * <rafters-empty-action> subcomponents are deferred. Their visual rhythm is
 * carried by the shared utility class strings in empty.classes.ts on the
 * consumer-supplied slotted children; those children live in the light tree, so
 * shadow-scoped descendant rules never applied to them -- the parallel
 * hand-written CSS map is therefore dropped.
 *
 * The only irreducible shadow-scoped CSS is the `:host` block-layout shim,
 * which lives in `static styles`. It carries no token reference.
 *
 * @cognitive-load 2/10
 */

import { RaftersElement } from '../../primitives/rafters-element';
import { emptyBaseClasses } from './empty.classes';

/**
 * Compose the inner container's class string from the shared class map.
 * Exported so tests assert the WC renders the exact same composition the
 * React/Astro targets do -- the parity guarantee. The literal `empty` hook
 * class is kept first for structure queries.
 */
export function composeEmptyClasses(): string {
  return `empty ${emptyBaseClasses}`;
}

export class RaftersEmpty extends RaftersElement {
  static readonly observedAttributes: ReadonlyArray<string> = [];

  /**
   * Irreducible shadow-scoped CSS: the host block-layout shim. Custom elements
   * default to inline display; the container needs the host to behave as a
   * block. Every other surface rides a utility class on the inner container.
   */
  static override styles = ':host { display: block; }';

  /**
   * Render the outer container with a single default slot.
   * DOM APIs only -- NEVER innerHTML. The container carries the shared empty
   * utility classes; descendant rhythm comes from empty.classes.ts on slotted
   * children.
   */
  override render(): Node {
    const root = document.createElement('div');
    root.className = composeEmptyClasses();
    const slot = document.createElement('slot');
    root.appendChild(slot);
    return root;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-empty')) {
  customElements.define('rafters-empty', RaftersEmpty);
}
