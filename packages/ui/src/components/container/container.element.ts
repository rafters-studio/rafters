import type { PartIds } from '../../lib/contract';
import classy from '../../primitives/classy';
import { BehaviorElement } from '../../primitives/behavior-element';
import type { ResponsiveColumns } from '../grid/grid.behavior';
import {
  container,
  type ContainerActions,
  type ContainerConfig,
  type ContainerDepth,
  type ContainerElement as ContainerTag,
  type ContainerPadding,
  type ContainerPart,
  type ContainerPosition,
  type ContainerSize,
  type ContainerState,
} from './container.behavior';
import { containerClasses } from './container.classes';

/**
 * <rafters-container> -- the WC performance (Spec 00 boundary 2/3: no
 * decisions here, mechanical execution over container.behavior.ts +
 * container.classes.ts, exactly like container.tsx). A static score has
 * nothing to subscribe to; this class only supplies attribute parsing
 * (the framework-idiomatic surface) and structure over BehaviorElement.
 *
 * Custom elements cannot change their own tag, so the semantic element
 * `as` chooses (main/header/footer/section/article/aside/div) is built
 * INSIDE the shadow root, carrying the same utility class strings the
 * React target uses, with a default `<slot>` passing light-DOM children
 * through -- the same landmark-is-the-contract shape, one node removed.
 */

const ALLOWED_AS: ReadonlySet<string> = new Set([
  'div',
  'main',
  'header',
  'footer',
  'section',
  'article',
  'aside',
]);

const SIZES: ReadonlySet<string> = new Set([
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
]);

const SPACING: ReadonlySet<string> = new Set([
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
]);

const POSITIONS: ReadonlySet<string> = new Set([
  'sticky',
  'fixed',
  'relative',
  'absolute',
  'static',
]);

const DEPTHS: ReadonlySet<string> = new Set([
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
]);

const COL_SPANS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
const ROW_SPANS = [1, 2, 3] as const;

function parseAs(value: string | null): ContainerTag {
  return value && ALLOWED_AS.has(value) ? (value as ContainerTag) : 'div';
}

function parseSize(value: string | null): ContainerSize | undefined {
  return value && SIZES.has(value) ? (value as ContainerSize) : undefined;
}

function parsePadding(value: string | null): ContainerPadding | undefined {
  return value && SPACING.has(value) ? (value as ContainerPadding) : undefined;
}

function parseGap(value: string | null): boolean | ContainerPadding | undefined {
  if (value === null) return undefined;
  if (value === '') return true;
  return SPACING.has(value) ? (value as ContainerPadding) : undefined;
}

function parseColumns(value: string | null): ResponsiveColumns | undefined {
  if (value === null) return undefined;
  if (value === 'auto') return 'auto';
  const parsed = Number.parseInt(value, 10);
  return parsed >= 1 && parsed <= 12 ? (parsed as ResponsiveColumns) : undefined;
}

function parseSpan<T extends number>(
  value: string | null,
  allowed: ReadonlyArray<T>,
): T | undefined {
  if (value === null) return undefined;
  const parsed = Number.parseInt(value, 10);
  return (allowed as ReadonlyArray<number>).includes(parsed) ? (parsed as T) : undefined;
}

function parsePosition(value: string | null): ContainerPosition | undefined {
  return value && POSITIONS.has(value) ? (value as ContainerPosition) : undefined;
}

function parseDepth(value: string | null): ContainerDepth | undefined {
  return value && DEPTHS.has(value) ? (value as ContainerDepth) : undefined;
}

export class RaftersContainer extends BehaviorElement<
  ContainerConfig,
  ContainerState,
  ContainerActions,
  ContainerPart
> {
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
    'class',
  ];

  /** Structural :host shim only -- the inner semantic element is the outer
   *  block-level box the React target is; everything else rides the shared
   *  utility sheet the same inner element carries as class strings. */
  static override styles = ':host { display: block; }';

  protected override readonly spec = container;

  protected override readConfig(): ContainerConfig {
    return {
      as: parseAs(this.getAttribute('as')),
      size: parseSize(this.getAttribute('size')),
      padding: parsePadding(this.getAttribute('padding')),
      gap: parseGap(this.getAttribute('gap')),
      columns: parseColumns(this.getAttribute('columns')),
      query: this.getAttribute('query') !== 'false',
      queryName: this.getAttribute('query-name') ?? undefined,
      colSpan: parseSpan(this.getAttribute('col-span'), COL_SPANS),
      rowSpan: parseSpan(this.getAttribute('row-span'), ROW_SPANS),
      position: parsePosition(this.getAttribute('position')),
      depth: parseDepth(this.getAttribute('depth')),
      fill: this.getAttribute('fill') ?? undefined,
    };
  }

  protected override buildParts(
    _state: ContainerState,
    config: ContainerConfig,
    ids: PartIds<ContainerPart>,
  ): Node {
    const root = document.createElement(config.as ?? 'div');
    root.setAttribute('data-part', 'root');
    if (ids.root) root.id = ids.root;

    const classes = containerClasses(config, {});
    // Consumer `class`, like React's className, merges via classy -- the
    // one non-attribute-driven channel, mirrored from the host onto the
    // inner semantic element (boundary 6: selection only, classy composes).
    root.className = classy(classes.root, this.getAttribute('class')) || '';

    if (config.fill) root.setAttribute('data-fill', config.fill);
    // The one style channel (ruled 2026-07-03): containerName cannot be a
    // literal class, arbitrary-value classes are banned.
    if (config.queryName) root.style.containerName = config.queryName;

    root.appendChild(document.createElement('slot'));
    return root;
  }
}

if (!customElements.get('rafters-container')) {
  customElements.define('rafters-container', RaftersContainer);
}

export default RaftersContainer;
