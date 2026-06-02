/**
 * <rafters-button-group> -- Web Component layout primitive.
 *
 * Groups related buttons (native <button> or <rafters-button>) with connected
 * borders and focus stacking so they read as a cohesive action set. This is a
 * layout composition element: it arranges whatever is slotted inside but
 * renders no buttons itself, holds no internal state, and is NOT
 * form-associated.
 *
 * Attributes:
 *  - orientation: 'horizontal' | 'vertical'  (default 'horizontal')
 *
 * The connected-border, focus-stacking, and orientation layout rules are
 * IRREDUCIBLE shadow-scoped CSS: they target `:host` and `::slotted(*)` so they
 * apply to whatever the consumer projects into the group. Slotted children live
 * in the light tree, so the Tailwind arbitrary descendant selectors in
 * button-group.classes.ts (used by the React/Astro targets) cannot cross the
 * shadow boundary -- the shadow surface encodes the same behaviour natively via
 * `::slotted`. These rules carry no design tokens, so they live verbatim in
 * `static styles`, keyed by orientation through host attribute selectors. No
 * per-instance stylesheet is needed.
 *
 * role="group" and data-orientation are reflected on the host element so
 * assistive tech and consumer styling can target them without piercing the
 * shadow root, and so the orientation-keyed static rules resolve.
 *
 * Unknown orientation values silently fall back to 'horizontal'.
 */

import { RaftersElement } from '../../primitives/rafters-element';

const OBSERVED_ATTRIBUTES: ReadonlyArray<string> = ['orientation'] as const;

export type ButtonGroupOrientation = 'horizontal' | 'vertical';

const ORIENTATIONS: ReadonlyArray<ButtonGroupOrientation> = ['horizontal', 'vertical'];

export function isButtonGroupOrientation(value: unknown): value is ButtonGroupOrientation {
  return typeof value === 'string' && (ORIENTATIONS as ReadonlyArray<string>).includes(value);
}

function parseOrientation(value: string | null): ButtonGroupOrientation {
  return isButtonGroupOrientation(value) ? value : 'horizontal';
}

export class RaftersButtonGroup extends RaftersElement {
  static observedAttributes: ReadonlyArray<string> = OBSERVED_ATTRIBUTES;

  /**
   * Irreducible shadow-scoped CSS. Orientation layout on the host plus the
   * connected-border radius-collapse and focus-stacking rules on slotted
   * children. The Tailwind descendant selectors in button-group.classes.ts
   * cannot cross the shadow boundary, so the same behaviour is encoded here
   * via `::slotted(*)`. Keyed by the reflected data-orientation host attribute.
   */
  static override styles = [
    ':host { display: inline-flex; }',
    ':host([data-orientation="horizontal"]) { flex-direction: row; }',
    ':host([data-orientation="vertical"]) { flex-direction: column; }',
    ':host([data-orientation="horizontal"]) ::slotted(*:first-child) { border-top-right-radius: 0; border-bottom-right-radius: 0; }',
    ':host([data-orientation="horizontal"]) ::slotted(*:last-child) { border-top-left-radius: 0; border-bottom-left-radius: 0; }',
    ':host([data-orientation="horizontal"]) ::slotted(*:not(:first-child):not(:last-child)) { border-radius: 0; }',
    ':host([data-orientation="horizontal"]) ::slotted(*:not(:first-child)) { margin-left: -1px; }',
    ':host([data-orientation="vertical"]) ::slotted(*:first-child) { border-bottom-right-radius: 0; border-bottom-left-radius: 0; }',
    ':host([data-orientation="vertical"]) ::slotted(*:last-child) { border-top-right-radius: 0; border-top-left-radius: 0; }',
    ':host([data-orientation="vertical"]) ::slotted(*:not(:first-child):not(:last-child)) { border-radius: 0; }',
    ':host([data-orientation="vertical"]) ::slotted(*:not(:first-child)) { margin-top: -1px; }',
    '::slotted(*:focus-visible) { z-index: 10; }',
  ].join('\n');

  get orientation(): ButtonGroupOrientation {
    return parseOrientation(this.getAttribute('orientation'));
  }

  set orientation(next: ButtonGroupOrientation) {
    this.setAttribute('orientation', next);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.reflectHostAttributes();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (oldValue === newValue) return;
    this.reflectHostAttributes();
  }

  /**
   * Reflect role and the resolved orientation back onto the host so assistive
   * tech and consumer styling can target them without piercing the shadow
   * root, and so the orientation-keyed static rules resolve. role="group" is
   * the WAI-ARIA APG pattern for a related control set.
   */
  private reflectHostAttributes(): void {
    this.setAttribute('role', 'group');
    this.setAttribute('data-orientation', this.orientation);
  }

  /**
   * Render the inner wrapper with a single default <slot>. The wrapper carries
   * no classes; all styling lives in the static styles via :host and
   * ::slotted(*) selectors.
   */
  override render(): Node {
    const inner = document.createElement('div');
    const slot = document.createElement('slot');
    inner.appendChild(slot);
    return inner;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-button-group')) {
  customElements.define('rafters-button-group', RaftersButtonGroup);
}
