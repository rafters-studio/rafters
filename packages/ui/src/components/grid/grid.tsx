import * as React from 'react';
import { useBehavior } from '../../hooks/use-behavior';
import classy from '../../primitives/classy';
import {
  grid,
  gridItemAttrs,
  type ContentPriority,
  type GridConfig,
  type ResponsiveColumns,
} from './grid.behavior';
import { gridClasses, gridColSpanClasses, gridRowSpanClasses } from './grid.classes';

type FixedColumns = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

interface GridBaseProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'role'> {
  preset?: 'linear' | 'golden' | 'bento';
  pattern?: 'editorial' | 'dashboard' | 'feature' | 'portfolio';
  gap?: GridConfig['gap'];
  padding?: GridConfig['padding'];
}

/** role='grid' promises the ARIA grid pattern, so it demands what the
 *  pattern demands at the type level: a FIXED column count (fluid columns
 *  cannot honestly claim row structure), an accessible name, and the
 *  linear preset (uniform cells -- spans would break row chunking). */
type GridA11yProps =
  | { role?: 'presentation' | undefined; columns?: ResponsiveColumns; 'aria-label'?: string }
  | {
      role: 'grid';
      columns: FixedColumns;
      'aria-label': string;
      preset?: 'linear';
      pattern?: never;
    };

export type GridProps = GridBaseProps & GridA11yProps;

interface GridContextValue {
  interactive: boolean;
}

const GridContext = React.createContext<GridContextValue>({ interactive: false });

function GridRoot(props: GridProps) {
  const {
    preset = 'linear',
    pattern,
    columns,
    gap,
    padding,
    role,
    'aria-label': ariaLabel,
    className,
    children,
    ...rest
  } = props;

  const config: GridConfig = { preset, pattern, columns, gap, padding, role, ariaLabel };
  const { state, aria, setPart } = useBehavior(grid, config);
  const classes = gridClasses(config, state);
  const interactive = role === 'grid' && typeof columns === 'number';

  // ARIA grid structure: chunk children into role=row wrappers of exactly
  // `columns` cells. Mechanical -- geometry comes from config, roles from
  // the score's part declarations.
  const content = interactive
    ? chunk(React.Children.toArray(children), columns as number).map((row, rowIndex) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional by definition
        <div key={rowIndex} data-part="row" role="row" className="contents">
          {row.map((cell, cellIndex) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: cells are positional by definition
              key={cellIndex}
              data-part="cell"
              role="gridcell"
              data-roving-item
              tabIndex={-1}
            >
              {cell}
            </div>
          ))}
        </div>
      ))
    : children;

  return (
    <GridContext.Provider value={{ interactive }}>
      <div
        data-part="root"
        ref={setPart('root')}
        className={classy(classes.root, className)}
        {...aria.root}
        {...rest}
      >
        {content}
      </div>
    </GridContext.Provider>
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
}

export interface GridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The item DECLARES what it is; the stock layouts place it by this
   *  projection, never by source order. */
  priority?: ContentPriority;
  colSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  rowSpan?: 1 | 2 | 3;
}

function GridItem({ priority, colSpan, rowSpan, className, ...props }: GridItemProps) {
  const classes = classy(
    colSpan && gridColSpanClasses[colSpan],
    rowSpan && gridRowSpanClasses[rowSpan],
    className,
  );

  return <div className={classes || undefined} {...gridItemAttrs(priority)} {...props} />;
}

GridRoot.displayName = 'Grid';
GridItem.displayName = 'GridItem';

export const Grid = Object.assign(GridRoot, {
  Item: GridItem,
});

export default Grid;
