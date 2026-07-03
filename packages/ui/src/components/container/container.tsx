import * as React from 'react';
import classy from '../../primitives/classy';
import type {
  ContainerConfig,
  ContainerDepth,
  ContainerElement,
  ContainerPadding,
  ContainerPosition,
  ContainerSize,
} from './container.behavior';
import { containerClasses } from './container.classes';
import type { ResponsiveColumns } from '../grid/grid.behavior';

/**
 * A static score has nothing to subscribe to: the performance is pure
 * decoration application. No useBehavior, no memory -- config in, classes
 * out, semantic element chosen by `as`.
 */

export interface ContainerProps extends React.HTMLAttributes<HTMLElement> {
  as?: ContainerElement;
  size?: ContainerSize;
  padding?: ContainerPadding;
  gap?: boolean | ContainerPadding;
  /** Grid mode: define a container and a grid in one tag (linear columns,
   *  1-12 or responsive; presets stay Grid's). */
  columns?: ResponsiveColumns;
  query?: boolean;
  queryName?: string;
  colSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  rowSpan?: 1 | 2 | 3;
  position?: ContainerPosition;
  depth?: ContainerDepth;
  fill?: string;
}

export const Container = React.forwardRef<HTMLElement, ContainerProps>(
  (
    {
      as: Element = 'div',
      size,
      padding,
      gap,
      columns,
      query = true,
      queryName,
      colSpan,
      rowSpan,
      position,
      depth,
      fill,
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const config: ContainerConfig = {
      as: Element,
      size,
      padding,
      gap,
      columns,
      query,
      queryName,
      colSpan,
      rowSpan,
      position,
      depth,
      fill,
    };

    const classes = containerClasses(config, {});

    // containerName cannot be a literal class (arbitrary values are
    // banned); the one style channel, ruled narrowly for CQ naming.
    const containerStyle: React.CSSProperties = {
      ...style,
      ...(queryName && { containerName: queryName }),
    };

    return React.createElement(
      Element,
      {
        ref,
        'data-part': 'root',
        className: classy(classes.root, className) || undefined,
        style: Object.keys(containerStyle).length > 0 ? containerStyle : undefined,
        'data-fill': fill || undefined,
        ...props,
      },
      children,
    );
  },
);

Container.displayName = 'Container';

export default Container;
