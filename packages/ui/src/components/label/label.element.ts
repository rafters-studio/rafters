/**
 * Form label component with semantic variants and accessibility associations
 *
 * @cognitive-load 2/10 - Provides clarity and reduces interpretation effort
 * @attention-economics Information hierarchy: field=required label, hint=helpful guidance, error=attention needed
 * @trust-building Clear requirement indication, helpful hints, non-punitive error messaging
 * @accessibility Form association, screen reader optimization, color-independent error indication
 * @semantic-meaning Variant meanings: field=input association, hint=guidance, error=validation feedback, success=confirmation
 *
 * @usage-patterns
 * DO: Always associate with input using htmlFor/id
 * DO: Use importance levels to guide user attention
 * DO: Provide visual and semantic marking for required fields
 * DO: Adapt styling based on form vs descriptive context
 * NEVER: Orphaned labels, unclear or ambiguous text, missing required indicators
 *
 * @example
 * ```tsx
 * // Form label with input association
 * <Label htmlFor="email">Email Address</Label>
 * <Input id="email" type="email" />
 *
 * // Required field indication
 * <Label htmlFor="name">
 *   Name <span className="text-destructive">*</span>
 * </Label>
 * ```
 */

/**
 * <rafters-label> -- the Web Component performance of the Label score.
 *
 * Label is a PURE STATIC: its score projects no ARIA, holds no state, and runs
 * no effects, so there is nothing to bind. This element imports NO `bindLabel`
 * (there is none) -- it renders an inner `<label>` with the shared class
 * strings and a default slot, once, from `label.classes.ts`. That is the whole
 * performance: a pure static's Web Component is markup + classes + slot, no
 * controller (the Card/ScrollArea family).
 *
 * The `for` attribute mirrors the React `htmlFor` / Astro `for` prop: it is
 * forwarded onto the inner `<label>` so a consumer in the light tree can
 * associate the label with a control by id. Because `for` only reflects an
 * attribute (no state, no effect), the element re-renders on `variant` and
 * forwards on `for` -- the same shape Card uses to observe `fill` -- and stays
 * a bind-free static.
 *
 * Known shadow-boundary caveat (a documented disposition, not a defect):
 * the `for` IDREF resolves within the same tree, so a `for` on the inner label
 * inside this shadow root does NOT associate across the boundary to a
 * light-DOM control -- the same shadow-boundary limitation the oracle recorded
 * for its `peer-disabled` utilities. Consumers wanting cross-boundary
 * association wrap the control or mirror the association outside the shadow
 * root. The forwarding is preserved verbatim regardless.
 *
 * Presentation resolves from the compiled utility sheet adopted by
 * RaftersElement (setUtilityCSS) plus the token custom properties inherited
 * from the host :root; the only component-owned CSS is the structural
 * host-display shim.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import type { LabelVariant } from './label.behavior';
import { labelClasses, labelVariantClasses } from './label.classes';

const OBSERVED_ATTRIBUTES: ReadonlyArray<string> = ['variant', 'for'] as const;

function parseVariant(value: string | null): LabelVariant {
  return value && value in labelVariantClasses ? (value as LabelVariant) : 'default';
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
    // `for` maps onto the inner label's attribute without re-rendering.
    if (name === 'for') {
      this.syncForAttribute();
      return;
    }
    this.update();
  }

  /**
   * Forward the host's `for` attribute onto the inner label without
   * re-rendering. When the host attribute is absent, clear it on the inner
   * element.
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
   * Render the inner semantic label (the `root` part) with a default slot.
   * DOM APIs only -- never innerHTML.
   */
  override render(): Node {
    const inner = document.createElement('label');
    inner.setAttribute('data-part', 'root');
    inner.className = labelClasses(
      { variant: parseVariant(this.getAttribute('variant')) },
      {},
    ).root;
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
