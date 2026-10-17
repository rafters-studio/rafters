/**
 * Semantic container component for layout structure and content boundaries
 *
 * @cognitive-load 0/10 - Invisible structure that reduces visual complexity
 * @attention-economics Neutral structural element: Controls content width and breathing room without competing for attention
 * @trust-building Predictable boundaries and consistent spacing patterns
 * @accessibility Semantic HTML elements with proper landmark roles for screen readers
 * @semantic-meaning Element-driven behavior: main=primary landmark, header=page/section header, footer=page/section footer, section=structural grouping, article=readable content with typography, aside=supplementary, div=no semantics
 *
 * @usage-patterns
 * DO: Use main for the primary content area (once per page)
 * DO: Use header with position="sticky" and depth="navigation" for site headers
 * DO: Use footer for page or section footers
 * DO: Use section for structural grouping within grids
 * DO: Use article for readable content - typography is automatic
 * DO: Use aside for supplementary content, add surface classes for depth
 * DO: Spacing happens inside (padding), not outside (no margins)
 * DO: Place a Container directly in a Grid and give it colSpan/rowSpan -- no Grid.Item wrapper needed
 * NEVER: Nest containers unnecessarily
 * NEVER: Use margins for spacing - let parent Grid handle gaps
 * NEVER: Use @container without w-full in flex/grid contexts (causes width collapse in Tailwind v4)
 * NEVER: Write raw sticky/fixed/z-* utilities -- use position and depth props
 *
 * @example
 * ```tsx
 * <Container as="header" position="sticky" depth="navigation" fill="background" size="full" padding="4">
 *   <nav>Site navigation</nav>
 * </Container>
 * <Container as="main" size="6xl" padding="6">
 *   <Container as="article">
 *     <h1>Title</h1>
 *     <p>Typography just works.</p>
 *   </Container>
 * </Container>
 * <Container as="footer" padding="6">
 *   <p>Footer content</p>
 * </Container>
 *
 * // Self-placing grid children -- no Grid.Item wrappers
 * <Grid columns={3} gap="6">
 *   <Container as="article" size="5xl" colSpan={2} queryName="main">…</Container>
 *   <Container as="aside" colSpan={1} queryName="rail">…</Container>
 * </Grid>
 * ```
 */

/**
 * <rafters-container>: a pure-static Web Component. No state, no bind. The
 * shadow root renders the `as` element as the root part, carrying the
 * `containerClasses` string and one default slot. The host is
 * `display: contents` so the landmark inside is the box.
 *
 * Config is read from the host attributes. Values outside a vocabulary
 * contribute nothing; an unknown `as` renders a `div`.
 */
import { RaftersElement } from '../../primitives/rafters-element';
import { containerClasses } from './container.classes';
import type { ColumnsValue } from '../grid/grid.behavior';
import type {
  ContainerConfig,
  ContainerDepth,
  ContainerElement,
  ContainerPadding,
  ContainerPosition,
  ContainerSize,
} from './container.behavior';

const ELEMENTS: readonly ContainerElement[] = [
  'div',
  'main',
  'header',
  'footer',
  'section',
  'article',
  'aside',
];
const SIZES: readonly ContainerSize[] = [
  'sm',
  'md',
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
  '5xl',
  '6xl',
  '7xl',
  'full',
];
const PADDINGS: readonly ContainerPadding[] = [
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '8',
  '10',
  '12',
  '16',
  '20',
  '24',
];
const POSITIONS: readonly ContainerPosition[] = [
  'sticky',
  'fixed',
  'relative',
  'absolute',
  'static',
];
const DEPTHS: readonly ContainerDepth[] = [
  'base',
  'dropdown',
  'sticky',
  'navigation',
  'fixed',
  'modal',
  'popover',
  'tooltip',
  'overlay',
  'below',
  'max',
];

const COL_SPANS: readonly NonNullable<ContainerConfig['colSpan']>[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
];
const ROW_SPANS: readonly NonNullable<ContainerConfig['rowSpan']>[] = [1, 2, 3];

function oneOf<T extends string>(list: readonly T[], value: string | null): T | undefined {
  return list.find((item) => item === value);
}

function oneOfNumber<T extends number>(list: readonly T[], value: string | null): T | undefined {
  if (value === null || !/^\d+$/.test(value)) return undefined;
  const n = Number(value);
  return list.find((item) => item === n);
}

function readColumns(value: string | null): ColumnsValue | undefined {
  if (value === 'auto') return 'auto';
  return oneOfNumber(COL_SPANS, value);
}

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
  // box, not the host.
  static override styles = ':host { display: contents; }';

  private config(): ContainerConfig {
    const gapAttr = this.getAttribute('gap');
    let gap: ContainerConfig['gap'];
    if (gapAttr === null) gap = undefined;
    else if (gapAttr === '' || gapAttr === 'true') gap = true;
    else if (gapAttr === 'false') gap = false;
    else gap = oneOf(PADDINGS, gapAttr);

    return {
      as: oneOf(ELEMENTS, this.getAttribute('as')) ?? 'div',
      size: oneOf(SIZES, this.getAttribute('size')),
      padding: oneOf(PADDINGS, this.getAttribute('padding')),
      gap,
      columns: readColumns(this.getAttribute('columns')),
      query: this.getAttribute('query') !== 'false',
      queryName: this.getAttribute('query-name') ?? undefined,
      colSpan: oneOfNumber(COL_SPANS, this.getAttribute('col-span')),
      rowSpan: oneOfNumber(ROW_SPANS, this.getAttribute('row-span')),
      position: oneOf(POSITIONS, this.getAttribute('position')),
      depth: oneOf(DEPTHS, this.getAttribute('depth')),
      fill: this.getAttribute('fill') ?? undefined,
    };
  }

  override render(): Node {
    const config = this.config();
    const element = document.createElement(config.as ?? 'div');
    element.setAttribute('data-part', 'root');
    const cls = containerClasses(config, {}).root;
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
