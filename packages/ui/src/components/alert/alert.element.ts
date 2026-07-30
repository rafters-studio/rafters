/**
 * <rafters-alert> -- the Web Component performance of the Alert score.
 *
 * Alert is a STATIC score: `role="alert"` is constant and the severity variant
 * is a pure function of config, computed once at render time, so there is
 * nothing to bind. This element imports NO `bindAlert` (there is none) -- it
 * renders the banner markup with the shared class strings from
 * `alert.classes.ts` and paints the score's aria projection onto the root,
 * once.
 *
 * Presentation resolves from the compiled utility sheet adopted by
 * RaftersElement (setUtilityCSS) plus the token custom properties inherited
 * from the host :root; the only component-owned CSS is the structural
 * host-display shim.
 *
 * Structure: a single `data-part="root"` wrapper (the banner) nesting three
 * fixed named-slot regions -- title, description, action -- plus a trailing
 * default slot for the decorative icon and anything else the consumer
 * composes. Only the root is a declared part (boundary 5); the sub-wrappers
 * carry classes but no data-part.
 *
 * Fixed slot regions are always present -- a bind-free static cannot hide an
 * unfilled region without a slotchange listener (which would be a bind, the
 * thing this component exists to prove it does not need). An unused region is
 * empty space; that is the accepted cost of a no-bind multi-region static WC,
 * the same one card and empty already pay. It is also why the title region is
 * a `div` rather than the `h5` React's `AlertTitle` renders: an always-present
 * empty heading is an axe `empty-heading` violation.
 *
 * One known light-DOM cost, carried over from the empty port's finding: the
 * root's `[&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4` icon positioning
 * cannot reach an SVG the consumer assigns to the default slot, because the
 * root's child is the `<slot>` element, not the slotted SVG. Astro and React
 * position the icon; the shadow-DOM performance does not. Fixing it would mean
 * a fourth region and a new class export in `alert.classes.ts` -- score
 * surgery, and the spec dispositions the icon as consumer-supplied layout, not
 * an authored part. Dropped here, as empty dropped its oracle descendant CSS.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import { alert, type AlertConfig, type AlertVariant } from './alert.behavior';
import {
  alertActionClasses,
  alertClasses,
  alertDescriptionClasses,
  alertTitleClasses,
} from './alert.classes';

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

/** Attributes are strings, so an unknown value has to land somewhere: it lands
 *  on 'default', silently, never throwing. The same guard `separator.element`
 *  applies to `orientation` and the oracle applied to this very attribute. */
function parseVariant(value: string | null): AlertVariant {
  if (value && (ALLOWED_VARIANTS as ReadonlyArray<string>).includes(value)) {
    return value as AlertVariant;
  }
  return 'default';
}

/** A named-slot wrapper: a div carrying the shared class string, a `data-slot`
 *  marker matching the React/Astro targets, and a single named `<slot>`. Pure
 *  structure, no behaviour. */
function slotRegion(className: string, slotName: string): HTMLElement {
  const region = document.createElement('div');
  if (className) region.className = className;
  region.setAttribute('data-slot', `alert-${slotName}`);
  const slot = document.createElement('slot');
  slot.setAttribute('name', slotName);
  region.appendChild(slot);
  return region;
}

export class RaftersAlert extends RaftersElement {
  static observedAttributes: ReadonlyArray<string> = ['variant'];

  /**
   * The only component-owned CSS: the structural host-display shim. Custom
   * elements default to display:inline; the banner wants the host to be a
   * block so it fills the available width, as `w-full` on the root expects.
   */
  static override styles = ':host { display: block; }';

  override render(): Node {
    const config: AlertConfig = { variant: parseVariant(this.getAttribute('variant')) };

    const root = document.createElement('div');
    root.setAttribute('data-part', 'root');
    root.className = alertClasses(config, {}).root;

    // Paint the score's resolved projection rather than restating role=alert:
    // the contract lives in the score, this is the performance of it.
    const projection = alert.aria({}, config, { root: '' }).root ?? {};
    for (const [name, value] of Object.entries(projection)) {
      if (value !== undefined) root.setAttribute(name, String(value));
    }

    root.appendChild(slotRegion(alertTitleClasses, 'title'));
    root.appendChild(slotRegion(alertDescriptionClasses, 'description'));
    root.appendChild(slotRegion(alertActionClasses, 'action'));
    root.appendChild(document.createElement('slot'));

    return root;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-alert')) {
  customElements.define('rafters-alert', RaftersAlert);
}
