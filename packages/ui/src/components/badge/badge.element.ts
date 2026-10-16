/**
 * Status badge component with multi-sensory communication patterns
 *
 * @cognitive-load 2/10 - Optimized for peripheral scanning with minimal cognitive overhead
 * @attention-economics Secondary/tertiary support: Maximum 1 high-attention badge per section, unlimited subtle badges
 * @trust-building Low trust informational display with optional interaction patterns
 * @accessibility Multi-sensory communication: Color + Icon + Text + Pattern prevents single-point accessibility failure
 * @semantic-meaning Status communication with semantic variants: success=completion, warning=caution, error=problems, info=neutral information
 *
 * @usage-patterns
 * DO: Use for status indicators with multi-sensory communication
 * DO: Navigation badges for notification counts and sidebar status
 * DO: Category labels with semantic meaning over arbitrary colors
 * DO: Interactive badges with enhanced touch targets for removal/expansion
 * NEVER: Primary actions, complex information, critical alerts requiring immediate action
 *
 * @example
 * ```tsx
 * // Status badge with semantic meaning
 * <Badge variant="success">Completed</Badge>
 *
 * // Warning indicator
 * <Badge variant="warning">Pending Review</Badge>
 * ```
 */

/**
 * <rafters-badge> -- the Web Component performance of the Badge score.
 *
 * Badge is a PURE STATIC: its score holds no state, claims no keys, runs no
 * effects, and projects an EMPTY aria map, so there is nothing to bind. This
 * element imports NO `bindBadge` (there is none) -- it renders the chip markup
 * with the shared class string from `badge.classes.ts` and re-renders when
 * `variant` or `size` changes. That is the whole performance: markup + classes,
 * no controller, no projection to paint.
 *
 * Presentation resolves from the compiled utility sheet adopted by
 * RaftersElement (setUtilityCSS) plus the token custom properties inherited
 * from the host :root. The one component-owned CSS is the structural
 * host-display shim.
 *
 * Shadow structure: a `data-part="root"` span wrapping a default `<slot>`, so
 * the label text stays in the light tree where assistive technology reads it
 * in flow -- the same accessible payload the React and Astro performances ship.
 *
 * The root carries BOTH `data-part` and `data-slot`, and they are not
 * redundant: `data-part` is the internal contract the behavior and the
 * conformance harness address, while `data-slot="badge"` is the consumer-facing
 * styling and query surface shadcn's components emit. All three performances
 * carry it.
 *
 * Attributes:
 *   variant  default | primary | secondary | destructive | success | warning
 *            | info | muted | accent | outline | ghost | link
 *   size     sm | default | lg
 *
 * Icons: a child with `slot="start-icon"` or `slot="end-icon"` renders inside a
 * wrapper part (`startIcon` / `endIcon`) the behavior projects `aria-hidden`
 * onto; the wrapper exists only while such a child does. The root is a grid, so
 * the start icon sits on the right on a `dir="rtl"` page.
 *
 * An unrecognised value narrows to `undefined`, and `badgeClasses` applies the
 * single `default` fallback -- this element never names the default itself.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import { badge, isBadgeSize, isBadgeVariant } from './badge.behavior';
import { badgeClasses } from './badge.classes';

/**
 * Small label chip. Displays a short status/count label inline.
 *
 * @cognitive-load 2/10 - decision 0, information 1, interaction 0,
 * disruption 0, learning 1. Display only: one label to read, no decision,
 * no interaction, no context disruption. Color-coding conventions
 * (destructive=red, success=green) are the sole learning cost.
 * @attention-economics Secondary/tertiary support: at most one
 * high-attention badge (destructive/warning) per section; subtle variants
 * (muted/outline/ghost) are unlimited.
 * @trust-building Low-trust informational display. Never a primary action
 * surface -- a badge announces state, it does not gate it.
 * @accessibility The label text is the entire accessible payload; no role
 * is projected. Multi-sensory communication (color + text, never color
 * alone) is a designer-vocabulary property of the variant classes, not a
 * behavior of this component.
 */
export class RaftersBadge extends RaftersElement {
  /** Custom elements default to display:inline; the chip wants a flex box. */
  static override styles = ':host { display: inline-flex; }';

  static readonly observedAttributes: ReadonlyArray<string> = ['variant', 'size'];

  private watcher: MutationObserver | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    // An icon child can arrive after the first render (upgrade order, or a
    // later insert); the wrapper follows the child.
    this.watcher = new MutationObserver(() => this.update());
    this.watcher.observe(this, { childList: true });
  }

  override disconnectedCallback(): void {
    this.watcher?.disconnect();
    this.watcher = null;
    super.disconnectedCallback();
  }

  private iconWrapper(
    part: 'startIcon' | 'endIcon',
    slot: string,
    icon: string,
    className: string,
  ): HTMLElement | null {
    if (!this.querySelector(`:scope > [slot="${slot}"]`)) return null;
    const wrapper = document.createElement('span');
    wrapper.setAttribute('data-part', part);
    wrapper.setAttribute('data-icon', icon);
    wrapper.className = className;
    const aria = badge.aria({}, {}, { root: '', startIcon: '', endIcon: '' })[part] ?? {};
    for (const [name, value] of Object.entries(aria)) wrapper.setAttribute(name, String(value));
    const named = document.createElement('slot');
    named.name = slot;
    wrapper.appendChild(named);
    return wrapper;
  }

  /** DOM APIs only -- never innerHTML. */
  override render(): Node {
    const variant = this.getAttribute('variant');
    const size = this.getAttribute('size');

    const root = document.createElement('span');
    root.setAttribute('data-part', 'root');
    root.setAttribute('data-slot', 'badge');
    const classes = badgeClasses(
      {
        variant: isBadgeVariant(variant) ? variant : undefined,
        size: isBadgeSize(size) ? size : undefined,
      },
      {},
    );
    root.className = classes.root;
    const start = this.iconWrapper('startIcon', 'start-icon', 'inline-start', classes.startIcon);
    if (start) root.appendChild(start);
    root.appendChild(document.createElement('slot'));
    const end = this.iconWrapper('endIcon', 'end-icon', 'inline-end', classes.endIcon);
    if (end) root.appendChild(end);
    return root;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-badge')) {
  customElements.define('rafters-badge', RaftersBadge);
}
