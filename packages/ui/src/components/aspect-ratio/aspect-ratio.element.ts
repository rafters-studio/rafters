/**
 * Proportional container that maintains aspect ratio regardless of width
 *
 * @cognitive-load 1/10 - Invisible layout utility with no cognitive overhead
 * @attention-economics Structural element: Prevents layout shift, maintains visual consistency
 * @trust-building Consistent proportions prevent jarring layout shifts during loading
 * @accessibility Layout utility - content inside maintains its own accessibility
 * @semantic-meaning Ratio contexts: 1=avatars/icons, 4/3=photos, 16/9=video, custom=brand-specific
 *
 * @usage-patterns
 * DO: Use for images/videos to prevent layout shift
 * DO: Use for card thumbnails for consistent grids
 * DO: Use 16/9 for video embeds
 * DO: Use 1 (square) for avatar containers
 * NEVER: Use for text content
 * NEVER: Use when natural dimensions are acceptable
 * NEVER: Force awkward ratios on content
 *
 * @example
 * ```tsx
 * // 16:9 video container
 * <AspectRatio ratio={16 / 9}>
 *   <iframe src="https://youtube.com/embed/..." />
 * </AspectRatio>
 *
 * // Square image
 * <AspectRatio ratio={1}>
 *   <img src="/photo.jpg" alt="Photo" className="object-cover" />
 * </AspectRatio>
 *
 * // 4:3 thumbnail
 * <AspectRatio ratio={4 / 3}>
 *   <img src="/thumb.jpg" alt="Thumbnail" className="object-cover" />
 * </AspectRatio>
 * ```
 */

/**
 * <rafters-aspect-ratio> -- the Web Component performance of the AspectRatio
 * score.
 *
 * AspectRatio is a PURE STATIC: its score projects no ARIA, holds no state, and
 * runs no effects, so there is nothing to bind. This element imports NO
 * `bindAspectRatio` (there is none) -- it renders one wrapper carrying the
 * shared `aspectRatioBaseClasses`, the resolved ratio on the single inline
 * style channel, and a default slot, once, from `aspect-ratio.classes.ts`.
 *
 * The `ratio` attribute is data-driven (a caller-supplied number or fraction
 * string) so it is NOT a class and NOT a fixed token. `parseRatio` (the score's
 * earned semantic) normalises "16/9" / "1.778" / "1" to a positive number,
 * falling back to 1; the value is written to the inner wrapper's inline
 * `aspect-ratio` style -- the same one style channel Container uses for its
 * container-name, and a simplification over the oracle's per-instance
 * stylesheet.
 *
 * Two shadow-scoped rules cannot be expressed as utility classes on the inner
 * element (Tailwind's child-descendant selectors do not cross the shadow
 * boundary), so they live in `static styles`: the `:host` block-layout shim and
 * the slotted fill. The fill mirrors the light-DOM `aspectRatioChildFillClasses`
 * -- absolute inset-0, full width/height -- and, like React and Astro, leaves
 * `object-fit` to the consumer.
 *
 * DOM APIs only -- never innerHTML.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import { parseRatio } from './aspect-ratio.behavior';
import { aspectRatioBaseClasses } from './aspect-ratio.classes';

export class RaftersAspectRatio extends RaftersElement {
  static observedAttributes = ['ratio'];

  /**
   * Irreducible shadow-scoped CSS. The `:host` block shim (custom elements
   * default to display:inline) and the slotted fill cannot be carried by a
   * utility class on the inner element, so they live here verbatim. The
   * data-driven aspect-ratio value is NOT here -- it rides the inner wrapper's
   * inline style, painted per instance in render().
   */
  static override styles = [
    ':host { display: block; position: relative; width: 100%; }',
    '::slotted(*) { position: absolute; inset: 0; width: 100%; height: 100%; }',
  ].join('\n');

  override render(): Node {
    const ratio = parseRatio(this.getAttribute('ratio'));

    const inner = document.createElement('div');
    inner.setAttribute('data-part', 'root');
    inner.className = aspectRatioBaseClasses;
    inner.style.setProperty('aspect-ratio', String(ratio));
    inner.appendChild(document.createElement('slot'));
    return inner;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-aspect-ratio')) {
  customElements.define('rafters-aspect-ratio', RaftersAspectRatio);
}
