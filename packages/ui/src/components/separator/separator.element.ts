/**
 * <rafters-separator> -- the Web Component performance of the Separator score.
 *
 * Separator is a static score: role and aria-orientation are a pure function
 * of config, computed once at render time, so there is nothing to bind. This
 * element imports NO `bindSeparator` (there is none) -- it renders the rule
 * markup with the shared class strings from `separator.classes.ts` and paints
 * the score's aria projection onto the inner part, once.
 *
 * Presentation resolves from the compiled utility sheet adopted by
 * RaftersElement (setUtilityCSS) plus the token custom properties inherited
 * from the host :root. The one component-owned CSS is the structural
 * host-display shim.
 *
 * `decorative` is presence-based here (attribute semantics, faithful to the
 * oracle `src/old/ui/separator.element.ts`): ABSENT = decorative (matches the
 * React default of `true`); PRESENT and not the literal string "false" =
 * semantic; `decorative="false"` turns the semantic role OFF (stays
 * decorative). The React/Astro `decorative` prop is a plain boolean default
 * true -- the attribute/prop split is standard.
 *
 * There is no slot: a separator carries no content.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import { separator } from './separator.behavior';
import type { SeparatorConfig, SeparatorOrientation } from './separator.behavior';
import { separatorClasses } from './separator.classes';

const ALLOWED_ORIENTATIONS: ReadonlyArray<SeparatorOrientation> = ['horizontal', 'vertical'];

function parseOrientation(value: string | null): SeparatorOrientation {
  if (value && (ALLOWED_ORIENTATIONS as ReadonlyArray<string>).includes(value)) {
    return value as SeparatorOrientation;
  }
  return 'horizontal';
}

export class RaftersSeparator extends RaftersElement {
  static observedAttributes = ['orientation', 'decorative'];

  /** The only component-owned CSS: the structural host-display shim. */
  static override styles = ':host { display: block; }';

  /** Presence-based decorative: absent OR "false" = decorative; any other
   *  present value = semantic. Faithful to the oracle contract. */
  private config(): SeparatorConfig {
    const decorativeAttr = this.getAttribute('decorative');
    const semantic = this.hasAttribute('decorative') && decorativeAttr !== 'false';
    return {
      orientation: parseOrientation(this.getAttribute('orientation')),
      decorative: !semantic,
    };
  }

  override render(): Node {
    const config = this.config();
    const root = document.createElement('div');
    root.setAttribute('data-part', 'root');
    root.className = separatorClasses(config, {}).root;

    // Paint the score's resolved projection: role always, aria-orientation
    // only when the projection carries it (semantic rules).
    const projection = separator.aria({}, config, { root: '' }).root ?? {};
    for (const [name, value] of Object.entries(projection)) {
      if (value !== undefined) root.setAttribute(name, String(value));
    }

    return root;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-separator')) {
  customElements.define('rafters-separator', RaftersSeparator);
}
