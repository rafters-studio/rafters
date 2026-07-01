/**
 * <rafters-aspect-ratio> -- Web Component aspect-ratio container.
 *
 * Mirrors the semantics of aspect-ratio.tsx (ratio). The inner wrapper carries
 * the SAME utility class strings the React/Astro targets use -- imported from
 * aspect-ratio.classes.ts -- so presentation resolves from the shared compiled
 * utility sheet adopted by RaftersElement (setUtilityCSS) plus the token custom
 * properties inherited from the host :root.
 *
 * Two shadow-scoped CSS surfaces remain irreducible and cannot be expressed as
 * utility classes on the inner element, so they live in `static styles`:
 *  - the `:host` block-layout shim (custom elements default to inline display),
 *  - the slotted fill rule. The Tailwind child-descendant selectors from the
 *    classes.ts cannot cross the shadow boundary, so the fill behaviour is
 *    encoded natively here instead.
 *
 * The `aspect-ratio` CSS property itself is data-driven (caller-supplied number)
 * so it is NOT a class and NOT a fixed token. It is written to a per-instance
 * stylesheet on the wrapper rule, rebuilt on ratio changes, rather than an
 * inline style attribute -- keeping the element file style-attribute-free.
 *
 * Attributes:
 *  - ratio: positive number. Accepted formats:
 *      - "16/9"   (fraction string, split-and-divide)
 *      - "1.778"  (decimal string, Number())
 *      - "1"      (integer string, Number())
 *    Non-positive or non-numeric values fall back to 1 silently.
 *
 * Shadow DOM structure: a single wrapper div carrying the composed utility
 * classes plus the aspect-ratio hook, wrapping a default slot.
 *
 * DOM APIs only -- never innerHTML.
 *
 * @cognitive-load 1/10
 * @accessibility Layout utility; slotted content carries its own semantics.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import { aspectRatioBaseClasses } from './aspect-ratio.classes';

const OBSERVED_ATTRIBUTES: ReadonlyArray<string> = ['ratio'] as const;

/**
 * Parse a raw ratio input into a positive number.
 *
 * Accepted formats:
 *  - `"16/9"` -> 16 / 9 = 1.7777...
 *  - `"1.778"` -> 1.778
 *  - `1` (numeric) -> 1
 *
 * Non-positive or non-numeric values silently fall back to 1, matching the
 * behaviour documented on the React target (`ratio = 1` default).
 */
export function parseRatio(input: string | number | null | undefined): number {
  if (input === null || input === undefined) return 1;
  if (typeof input === 'number') {
    return Number.isFinite(input) && input > 0 ? input : 1;
  }
  const trimmed = input.trim();
  if (trimmed === '') return 1;
  if (trimmed.includes('/')) {
    const [rawNum, rawDen] = trimmed.split('/');
    const num = Number(rawNum);
    const den = Number(rawDen);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return 1;
    const quotient = num / den;
    return quotient > 0 ? quotient : 1;
  }
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 1;
}

/**
 * Compose the inner wrapper's class string from the shared class map.
 * Exported so tests assert the WC renders the exact same composition the
 * React/Astro targets do -- the parity guarantee. The literal aspect-ratio
 * hook class is kept first so the per-instance rule can target it.
 */
export function composeAspectRatioClasses(): string {
  return `aspect-ratio ${aspectRatioBaseClasses}`;
}

export class RaftersAspectRatio extends RaftersElement {
  static readonly observedAttributes: ReadonlyArray<string> = OBSERVED_ATTRIBUTES;

  /**
   * Irreducible shadow-scoped CSS. The host block shim and the slotted fill
   * rule cannot be carried by a utility class on the inner element, so they
   * live here verbatim. The data-driven aspect-ratio property is NOT here --
   * it varies per instance and lives on the per-instance sheet below.
   */
  static override styles = [
    ':host { display: block; position: relative; width: 100%; }',
    '::slotted(*) { position: absolute; top: 0; right: 0; bottom: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }',
  ].join('\n');

  /** Per-instance stylesheet carrying the data-driven aspect-ratio value. */
  private _instanceSheet: CSSStyleSheet | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.shadowRoot) return;
    this._instanceSheet = new CSSStyleSheet();
    this._instanceSheet.replaceSync(this.composeInstanceCss());
    this.shadowRoot.adoptedStyleSheets = [
      ...this.shadowRoot.adoptedStyleSheets,
      this._instanceSheet,
    ];
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;
    if (name === 'ratio' && this._instanceSheet) {
      this._instanceSheet.replaceSync(this.composeInstanceCss());
    }
    this.update();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._instanceSheet = null;
  }

  /**
   * Build the per-instance CSS carrying the resolved aspect-ratio value.
   * Only the data-driven property lives here; structural layout comes from
   * the shared utility sheet via the inner element's classes.
   */
  private composeInstanceCss(): string {
    const ratio = parseRatio(this.getAttribute('ratio'));
    return `.aspect-ratio { aspect-ratio: ${String(ratio)}; }`;
  }

  /**
   * Render a single wrapper with one default <slot>.
   * DOM APIs only -- never innerHTML. The wrapper carries the shared utility
   * classes plus the aspect-ratio hook class the per-instance rule targets;
   * it carries NO inline style.
   */
  override render(): Node {
    const inner = document.createElement('div');
    inner.className = composeAspectRatioClasses();
    const slot = document.createElement('slot');
    inner.appendChild(slot);
    return inner;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-aspect-ratio')) {
  customElements.define('rafters-aspect-ratio', RaftersAspectRatio);
}
