/**
 * <rafters-container> -- the Web Component performance of the Container score.
 *
 * Container is a PURE STATIC (empty ARIA projection, no state, no effects), so
 * there is nothing to bind -- this element imports no `bindContainer` (there
 * is none). Like card, it renders once from `containerClasses`, no controller.
 *
 * The one difference from card: Container's root IS the semantic `as` element
 * (a landmark), so `render()` creates that element inside the shadow root and
 * the host is `display: contents` -- the landmark, not the custom element, is
 * the box, matching the React and Astro roots. Consumer content projects
 * through the default slot.
 */
import { RaftersElement } from '../../primitives/rafters-element';
import classy from '../../primitives/classy';
import { containerClasses } from './container.classes';
import type {
  ContainerConfig,
  ContainerDepth,
  ContainerElement,
  ContainerPadding,
  ContainerPosition,
  ContainerSize,
} from './container.behavior';

export class RaftersContainer extends RaftersElement {
  static observedAttributes = [
    'as',
    'size',
    'padding',
    'gap',
    'columns',
    'query',
    'query-name',
    'col-span',
    'row-span',
    'position',
    'depth',
    'fill',
  ];

  // display:contents so the semantic `as` element inside the shadow is the
  // box, not the host -- the landmark stays the root, as in React/Astro.
  static override styles = ':host { display: contents; }';

  private attrOr(name: string): string | undefined {
    return this.getAttribute(name) ?? undefined;
  }

  private config(): ContainerConfig {
    const gap = this.getAttribute('gap');
    const columns = this.getAttribute('columns');
    const colSpan = this.getAttribute('col-span');
    const rowSpan = this.getAttribute('row-span');
    return {
      as: (this.attrOr('as') ?? 'div') as ContainerElement,
      size: this.attrOr('size') as ContainerSize | undefined,
      padding: this.attrOr('padding') as ContainerPadding | undefined,
      gap:
        gap === null
          ? undefined
          : gap === '' || gap === 'true'
            ? true
            : gap === 'false'
              ? false
              : (gap as ContainerPadding),
      columns:
        columns === null
          ? undefined
          : ((Number.isNaN(Number(columns))
              ? columns
              : Number(columns)) as ContainerConfig['columns']),
      query: this.getAttribute('query') !== 'false',
      queryName: this.attrOr('query-name'),
      colSpan: (colSpan === null ? undefined : Number(colSpan)) as ContainerConfig['colSpan'],
      rowSpan: (rowSpan === null ? undefined : Number(rowSpan)) as ContainerConfig['rowSpan'],
      position: this.attrOr('position') as ContainerPosition | undefined,
      depth: this.attrOr('depth') as ContainerDepth | undefined,
      fill: this.attrOr('fill'),
    };
  }

  override render(): Node {
    const config = this.config();
    const tag = config.as ?? 'div';
    const element = document.createElement(tag);
    element.setAttribute('data-part', 'root');
    const cls = classy(containerClasses(config, {}).root);
    if (cls) element.className = cls;
    if (config.queryName) element.style.setProperty('container-name', config.queryName);
    if (config.fill) element.setAttribute('data-fill', config.fill);
    element.appendChild(document.createElement('slot'));
    return element;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-container')) {
  customElements.define('rafters-container', RaftersContainer);
}
