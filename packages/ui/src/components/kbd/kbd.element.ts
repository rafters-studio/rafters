/**
 * Keyboard key indicator component for displaying shortcuts and key combinations
 *
 * @cognitive-load 1/10 - Simple visual indicator, no interaction required
 * @attention-economics Tertiary information: supplements primary content without competing
 * @trust-building Teaches keyboard shortcuts, builds power-user confidence
 * @accessibility Semantic kbd element, screen reader compatible
 * @semantic-meaning Keyboard representation: displays key names, shortcuts, combinations
 *
 * @usage-patterns
 * DO: Use in tooltips to show keyboard shortcuts
 * DO: Use in menus alongside action items
 * DO: Use platform-appropriate modifier keys (Cmd for Mac, Ctrl for Windows)
 * DO: Combine multiple Kbd elements for key combinations
 * NEVER: Use for non-keyboard content, use without context
 *
 * @example
 * ```tsx
 * // Single key
 * <Kbd>Enter</Kbd>
 *
 * // Key combination
 * <Kbd>Cmd</Kbd> + <Kbd>S</Kbd>
 * ```
 */

/**
 * <rafters-kbd> -- the Web Component performance of the Kbd score.
 *
 * Kbd is a PURE STATIC: its score projects no ARIA, holds no state, and runs
 * no effects, so there is nothing to bind. This element imports NO `bindKbd`
 * (there is none) -- it renders the semantic `<kbd>` cap with the shared class
 * string from `kbd.classes.ts` and a default slot, once. That is the whole
 * performance: a pure static's Web Component is markup + classes + slot, no
 * controller.
 *
 * The inner `<kbd>` carries the SAME `kbdClasses` projection the React and
 * Astro performances read -- one score, three performances, zero drift -- and
 * the `data-part="root"` marker so the conformance harness locates the root in
 * the shadow root exactly as it does in light DOM. Presentation resolves from
 * the compiled utility sheet adopted by RaftersElement (setUtilityCSS) plus the
 * token custom properties inherited from the host :root; the only
 * component-owned CSS is the structural host-display shim.
 *
 * No attributes -- the React and Astro performances expose no variants or sizes
 * either, faithful to the oracle (`src/old/ui/kbd.element.ts`).
 */

import { RaftersElement } from '../../primitives/rafters-element';
import { kbdClasses } from './kbd.classes';

export class RaftersKbd extends RaftersElement {
  static readonly observedAttributes: ReadonlyArray<string> = [];

  /** The only component-owned CSS: the structural host-display shim. A `<kbd>`
   *  is inline, so the host is inline-flex, not the block card uses. */
  static override styles = ':host { display: inline-flex; }';

  override render(): Node {
    const inner = document.createElement('kbd');
    inner.setAttribute('data-part', 'root');
    inner.className = kbdClasses({}, {}).root;
    inner.appendChild(document.createElement('slot'));
    return inner;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-kbd')) {
  customElements.define('rafters-kbd', RaftersKbd);
}
