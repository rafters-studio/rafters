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
 * ```html
 * <!-- 16:9 video container -->
 * <rafters-aspect-ratio ratio="16/9">
 *   <iframe src="https://youtube.com/embed/..."></iframe>
 * </rafters-aspect-ratio>
 *
 * <!-- Square image -->
 * <rafters-aspect-ratio ratio="1">
 *   <img src="/photo.jpg" alt="Photo" class="object-cover">
 * </rafters-aspect-ratio>
 * ```
 */
import { RaftersElement } from '../../primitives/rafters-element';
import { parseRatio } from './aspect-ratio.behavior';
import { aspectRatioBaseClasses } from './aspect-ratio.classes';

export class RaftersAspectRatio extends RaftersElement {
  static observedAttributes: ReadonlyArray<string> = ['ratio'];

  // The child fill, encoded natively. object-fit is left to the consumer.
  static override styles =
    '::slotted(*) { position: absolute; inset: 0; width: 100%; height: 100%; }';

  override render(): Node {
    const root = document.createElement('div');
    root.setAttribute('data-part', 'root');
    root.className = aspectRatioBaseClasses;
    root.style.setProperty('aspect-ratio', String(parseRatio(this.getAttribute('ratio'))));
    root.appendChild(document.createElement('slot'));
    return root;
  }
}

if (!customElements.get('rafters-aspect-ratio')) {
  customElements.define('rafters-aspect-ratio', RaftersAspectRatio);
}
