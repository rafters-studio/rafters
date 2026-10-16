/**
 * Visual separator component for dividing content sections
 *
 * @cognitive-load 0/10 - Passive visual element, no cognitive processing required
 * @attention-economics Neutral structure: creates visual boundaries without demanding attention
 * @trust-building Consistent spacing, clear content grouping, predictable visual hierarchy
 * @accessibility role="separator" or role="none" for decorative, orientation for screen readers
 * @semantic-meaning Visual division: horizontal=between sections, vertical=between inline items
 *
 * @usage-patterns
 * DO: Use to group related content visually
 * DO: Use horizontal for section breaks
 * DO: Use vertical for inline item separation (toolbars, menus)
 * DO: Set decorative=true when purely visual
 * NEVER: Overuse separators, use when whitespace alone suffices
 *
 * @example
 * ```html
 * <!-- Horizontal section divider -->
 * <rafters-separator></rafters-separator>
 *
 * <!-- Vertical toolbar divider, semantic -->
 * <rafters-separator orientation="vertical" decorative=""></rafters-separator>
 * ```
 */
import { RaftersElement } from '../../primitives/rafters-element';
import { separator } from './separator.behavior';
import type { SeparatorConfig, SeparatorOrientation } from './separator.behavior';
import { separatorClasses } from './separator.classes';

function isOrientation(value: string | null): value is SeparatorOrientation {
  return value === 'horizontal' || value === 'vertical';
}

/**
 * `<rafters-separator>`: a pure-static Web Component. No state, no slot, no
 * bind. Renders the one `root` part with the classes and the role/orientation
 * projection resolved by the score.
 *
 * `decorative`: absent or `"false"` is decorative; any other present value
 * (including the empty string) is semantic.
 */
export class RaftersSeparator extends RaftersElement {
  static observedAttributes = ['orientation', 'decorative'];

  override render(): Node {
    const attrOrientation = this.getAttribute('orientation');
    const decorativeAttr = this.getAttribute('decorative');
    const config: SeparatorConfig = {
      orientation: isOrientation(attrOrientation) ? attrOrientation : 'horizontal',
      decorative: decorativeAttr === null || decorativeAttr === 'false',
    };

    const root = document.createElement('div');
    root.setAttribute('data-part', 'root');
    root.className = separatorClasses(config, {}).root;

    const projection = separator.aria({}, config, { root: '' }).root ?? {};
    for (const [name, value] of Object.entries(projection)) {
      if (value !== undefined) root.setAttribute(name, String(value));
    }
    return root;
  }
}

if (!customElements.get('rafters-separator')) {
  customElements.define('rafters-separator', RaftersSeparator);
}
