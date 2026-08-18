/**
 * Flexible container component for grouping related content with semantic structure
 *
 * @cognitive-load 2/10 - Simple container with clear boundaries and minimal cognitive overhead
 * @attention-economics Neutral container: Content drives attention, elevation hierarchy for interactive states
 * @trust-building Consistent spacing, predictable interaction patterns, clear content boundaries
 * @accessibility Proper heading structure, landmark roles, keyboard navigation for interactive cards
 * @semantic-meaning Structural roles: article=standalone content, section=grouped content, aside=supplementary information
 *
 * @usage-patterns
 * DO: Group related information with clear visual boundaries
 * DO: Create interactive cards with hover states and focus management
 * DO: Establish information hierarchy with header, content, actions
 * DO: Implement responsive scaling with consistent proportions
 * NEVER: Use decorative containers without semantic purpose
 * NEVER: Nest cards within cards
 * NEVER: Use Card for layout (use Grid/Container instead)
 *
 * @example
 * ```tsx
 * // Standalone content - use article
 * <Card as="article">
 *   <CardHeader>
 *     <CardTitle>Blog Post Title</CardTitle>
 *     <CardDescription>Published Jan 2025</CardDescription>
 *   </CardHeader>
 *   <CardContent>Post excerpt...</CardContent>
 * </Card>
 *
 * // Interactive card - product listing
 * <Card interactive>
 *   <CardHeader>
 *     <CardTitle>Product Name</CardTitle>
 *   </CardHeader>
 *   <CardContent>$99.00</CardContent>
 *   <CardFooter>
 *     <Button>Add to Cart</Button>
 *   </CardFooter>
 * </Card>
 *
 * // Supplementary content - use aside
 * <Card as="aside">
 *   <CardHeader>
 *     <CardTitle>Related Links</CardTitle>
 *   </CardHeader>
 *   <CardContent>...</CardContent>
 * </Card>
 * ```
 */

/**
 * <rafters-card> -- the Web Component performance of the Card score.
 *
 * Card is a PURE STATIC: its score projects no ARIA, holds no state, and runs
 * no effects, so there is nothing to bind. This element imports NO
 * `bindCard` (there is none) -- it only renders the surface markup with the
 * shared class strings and named slots, once, from `card.classes.ts`. That is
 * the whole point of the card port: a pure static's Web Component is markup +
 * classes + slots, no controller.
 *
 * Presentation resolves from the compiled utility sheet adopted by
 * RaftersElement (setUtilityCSS) plus the token custom properties inherited
 * from the host :root; the only component-owned CSS is the structural
 * host-display shim. The `fill` attribute mirrors the React/Astro `fill` prop
 * through the SAME `cardClasses` projection -- one score, three performances,
 * zero drift.
 *
 * Structure: a single `data-part="root"` wrapper (the surface). The header
 * region nests the header/title/description/action slots (so title and
 * description inherit the header's padding, exactly as React nests them
 * inside CardHeader); content and footer are root-level sibling regions. A
 * trailing default slot carries unnamed children. Only the root is a declared
 * part (boundary 5); the sub-wrappers carry classes but no data-part.
 *
 * Fixed slot regions are always present -- a bind-free static cannot hide an
 * unfilled region without a slotchange listener (which would be a bind, the
 * thing this component exists to prove it does not need). An unused region is
 * empty padded space; that is the accepted cost of a no-bind static WC.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import {
  cardActionClasses,
  cardClasses,
  cardContentClasses,
  cardDescriptionClasses,
  cardFooterClasses,
  cardHeaderClasses,
  cardTitleClasses,
} from './card.classes';

/** A named-slot wrapper: a div carrying the shared class string, a
 *  `data-slot` marker matching the React/Astro targets, and a single named
 *  `<slot>`. Pure structure, no behaviour. */
function slotRegion(className: string, slotName: string): HTMLElement {
  const region = document.createElement('div');
  region.className = className;
  region.setAttribute('data-slot', `card-${slotName}`);
  const slot = document.createElement('slot');
  slot.setAttribute('name', slotName);
  region.appendChild(slot);
  return region;
}

export class RaftersCard extends RaftersElement {
  static observedAttributes = ['fill'];

  /**
   * The only component-owned CSS: the structural host-display shim. Custom
   * elements default to display:inline; the card wants the host to be a block.
   */
  static override styles = ':host { display: block; }';

  override render(): Node {
    const fill = this.getAttribute('fill') ?? undefined;

    const root = document.createElement('div');
    root.setAttribute('data-part', 'root');
    // data-slot is the swap contract; data-part is the internal binding
    // contract. Only the root carries a part (boundary 5), so only the root
    // carries both.
    root.setAttribute('data-slot', 'card');
    root.className = cardClasses({ fill }, {}).root;

    // Header nests header/title/description/action so title and description
    // inherit the header's p-6, matching React's CardHeader nesting.
    const header = slotRegion(cardHeaderClasses, 'header');
    header.appendChild(slotRegion(cardTitleClasses, 'title'));
    header.appendChild(slotRegion(cardDescriptionClasses, 'description'));
    header.appendChild(slotRegion(cardActionClasses, 'action'));

    root.appendChild(header);
    root.appendChild(slotRegion(cardContentClasses, 'content'));
    root.appendChild(slotRegion(cardFooterClasses, 'footer'));
    root.appendChild(document.createElement('slot'));

    return root;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-card')) {
  customElements.define('rafters-card', RaftersCard);
}
