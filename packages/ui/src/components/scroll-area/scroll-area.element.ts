/**
 * Custom-styled scrollable container with consistent cross-browser appearance
 *
 * @cognitive-load 2/10 - Transparent utility that enhances without demanding attention
 * @attention-economics Invisible enhancement: Scrollbars should guide without distracting
 * @trust-building Consistent scroll behavior builds familiarity; never hijack expected scroll patterns
 * @accessibility Preserve native keyboard scrolling; don't hide scrollbars entirely
 * @semantic-meaning Constrained viewport for overflow content; use when content exceeds container
 *
 * @usage-patterns
 * DO: Use for fixed-height containers with overflow content
 * DO: Use for sidebars, dropdowns, and modal content
 * DO: Preserve native scroll feel (momentum, keyboard)
 * DO: Make scrollbar visible when content overflows
 * NEVER: Use JavaScript scroll hijacking
 * NEVER: Hide scrollbars completely (a11y issue)
 * NEVER: Override native scroll physics
 *
 * @example
 * ```tsx
 * // Vertical scroll area
 * <ScrollArea className="h-72 w-48 rounded-md border">
 *   <div className="p-4">
 *     {items.map(item => (
 *       <div key={item.id}>{item.name}</div>
 *     ))}
 *   </div>
 * </ScrollArea>
 *
 * // Horizontal scroll area
 * <ScrollArea orientation="horizontal" className="w-96 whitespace-nowrap">
 *   <div className="flex gap-4 p-4">
 *     {images.map(img => (
 *       <img key={img.id} src={img.src} className="w-40" />
 *     ))}
 *   </div>
 * </ScrollArea>
 * ```
 */

/**
 * <rafters-scroll-area> -- the Web Component performance of the ScrollArea score.
 *
 * ScrollArea is a pure static: no state, no actions, no keymap, no effects, and
 * an empty aria projection. There is no bindScrollArea. The element renders the
 * one `root` part with the shared classes and a default slot, and re-renders
 * when `orientation` changes. Native scroll owns the keyboard.
 */
import { RaftersElement } from '../../primitives/rafters-element';
import type { ScrollAreaConfig, ScrollAreaOrientation } from './scroll-area.behavior';
import { scrollAreaClasses } from './scroll-area.classes';

const ORIENTATIONS: ReadonlyArray<ScrollAreaOrientation> = ['vertical', 'horizontal', 'both'];

function isOrientation(value: string | null): value is ScrollAreaOrientation {
  return ORIENTATIONS.some((orientation) => orientation === value);
}

export class RaftersScrollArea extends RaftersElement {
  static observedAttributes: string[] = ['orientation'];

  /** The only component-owned CSS: the host is a block so the root can scroll. */
  static override styles = ':host { display: block; }';

  override render(): Node {
    const orientation = this.getAttribute('orientation');
    const config: ScrollAreaConfig = {
      orientation: isOrientation(orientation) ? orientation : 'vertical',
    };
    const root = document.createElement('div');
    root.setAttribute('data-part', 'root');
    root.className = scrollAreaClasses(config, {}).root;
    root.appendChild(document.createElement('slot'));
    return root;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-scroll-area')) {
  customElements.define('rafters-scroll-area', RaftersScrollArea);
}
