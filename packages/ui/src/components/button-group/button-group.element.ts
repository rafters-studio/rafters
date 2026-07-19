/**
 * <rafters-button-group> -- the Web Component performance of the ButtonGroup
 * score. ButtonGroup is a PURE STATIC (constant aria projection, no state, no
 * effects), so there is nothing to bind -- this element imports no
 * `bindButtonGroup` (there is none). Like container, it reflects its contract
 * once from the score and renders a single slot.
 *
 * The one difference from container: the HOST itself is the styled, adjoining
 * root (a layout box, not a landmark), so `role="group"`, `data-orientation`,
 * and `data-part="root"` are reflected onto the host and the host carries the
 * inline-flex layout. The connected-border and focus-stacking rules are
 * IRREDUCIBLE shadow-scoped CSS ported verbatim from the oracle element: they
 * target `::slotted(*)` so they apply to whatever buttons the consumer projects.
 * Slotted children live in the light tree, so the Tailwind arbitrary descendant
 * selectors in button-group.classes.ts (the React/Astro surface) cannot cross
 * the shadow boundary -- the shadow surface encodes the same behaviour natively
 * via `::slotted`, keyed by the reflected `data-orientation` host attribute.
 * These rules carry no design tokens, so they live verbatim in `static styles`.
 *
 * Size inheritance is not expressible here: it is a React context affordance,
 * and the oracle element observed orientation only. Unknown orientation values
 * silently fall back to `horizontal`.
 */
import { RaftersElement } from '../../primitives/rafters-element';
import {
  buttonGroup,
  parseOrientation,
  type ButtonGroupConfig,
  type ButtonGroupOrientation,
} from './button-group.behavior';

export class RaftersButtonGroup extends RaftersElement {
  static observedAttributes: ReadonlyArray<string> = ['orientation'];

  // Irreducible shadow-scoped CSS: host layout plus the connected-border
  // radius-collapse and focus-stacking rules on slotted children, keyed by the
  // reflected data-orientation host attribute (ported verbatim from the oracle).
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
   * Reflect the score's aria projection (role="group"), the resolved
   * orientation, and the root part marker onto the host so assistive tech, the
   * orientation-keyed static rules, and the conformance harness can all target
   * the host without piercing the shadow root.
   */
  private reflectHostAttributes(): void {
    const config: ButtonGroupConfig = { orientation: this.orientation };
    const { root: aria } = buttonGroup.aria({}, config, { root: '' });
    if (aria) {
      for (const [name, value] of Object.entries(aria)) {
        if (value !== undefined) this.setAttribute(name, String(value));
      }
    }
    this.setAttribute('data-orientation', config.orientation);
    this.setAttribute('data-part', 'root');
  }

  /**
   * Render the inner wrapper with a single default <slot>. The wrapper carries
   * no classes; all styling lives in the static styles via :host and
   * ::slotted(*) selectors.
   */
  override render(): Node {
    const inner = document.createElement('div');
    inner.appendChild(document.createElement('slot'));
    return inner;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-button-group')) {
  customElements.define('rafters-button-group', RaftersButtonGroup);
}
