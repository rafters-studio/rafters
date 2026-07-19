/**
 * Table -- a semantic data table for structured, comparable information.
 * Compose Table with Table.Header, Table.Body, Table.Footer, Table.Row,
 * Table.Head, Table.Cell, and Table.Caption; the semantic element tree is the
 * contract, the sub-components are the composition. A row carries a selected
 * state through the `selected` prop (never an internal selection model): a
 * selected row projects `aria-selected` and the `data-state="selected"` hook.
 *
 * @cognitive-load 3/10 - decision 0, info 2, interaction 0, disruption 0, learning 1
 * @attention-economics Low attention cost: a table is furniture for scanning.
 * Structured rows and columns let the eye compare without re-reading; the
 * header row anchors meaning once and every cell inherits it. Reserve row
 * selection tint for genuine state -- a table where every row looks active
 * teaches the reader to ignore the signal.
 * @trust-building Clear column headers with honest `scope`, consistent
 * alignment (text left, numbers right), and visible row separation make the
 * data legible and predictable. A selected row is announced, not merely
 * coloured, so keyboard and screen-reader users share the sighted user's
 * model of what is chosen.
 * @accessibility Native table semantics carry the contract -- `<table>` is
 * role=table, `<th>` a columnheader/rowheader, `<tr>` a row. Give header cells
 * a `scope` (`col`/`row`) so assistive tech associates each data cell with its
 * headers; a selected row's `aria-selected="true"` rides the native row role.
 * Never use a table for layout, and never hide the header row.
 * @semantic-meaning Data presentation: lists, comparisons, and structured
 * records where rows are entities and columns are their attributes.
 *
 * A pure static score has nothing to subscribe to: the performance is
 * decoration application plus the per-row selected projection. No useBehavior,
 * no memory, no bind -- config in, classes out, children through.
 *
 * @example
 * ```tsx
 * <Table>
 *   <Table.Caption>Recent signups</Table.Caption>
 *   <Table.Header>
 *     <Table.Row>
 *       <Table.Head scope="col">Name</Table.Head>
 *       <Table.Head scope="col">Status</Table.Head>
 *     </Table.Row>
 *   </Table.Header>
 *   <Table.Body>
 *     <Table.Row selected>
 *       <Table.Cell>Ada</Table.Cell>
 *       <Table.Cell>Active</Table.Cell>
 *     </Table.Row>
 *   </Table.Body>
 * </Table>
 * ```
 */
import * as React from 'react';
import classy from '../../primitives/classy';
import { tableRowAttrs } from './table.behavior';
import {
  tableBodyClasses,
  tableCaptionClasses,
  tableCellClasses,
  tableFooterClasses,
  tableHeadClasses,
  tableHeaderClasses,
  tableRootClasses,
  tableRowClasses,
  tableWrapperClasses,
} from './table.classes';

export type TableProps = React.TableHTMLAttributes<HTMLTableElement>;

const TableRoot = React.forwardRef<HTMLTableElement, TableProps>(({ className, ...props }, ref) => (
  <div className={tableWrapperClasses}>
    <table ref={ref} data-part="root" className={classy(tableRootClasses, className)} {...props} />
  </div>
));

TableRoot.displayName = 'Table';

export type TableHeaderProps = React.HTMLAttributes<HTMLTableSectionElement>;

export const TableHeader = React.forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ className, ...props }, ref) => (
    <thead
      ref={ref}
      data-slot="table-header"
      className={classy(tableHeaderClasses, className)}
      {...props}
    />
  ),
);

TableHeader.displayName = 'TableHeader';

export type TableBodyProps = React.HTMLAttributes<HTMLTableSectionElement>;

export const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ className, ...props }, ref) => (
    <tbody
      ref={ref}
      data-slot="table-body"
      className={classy(tableBodyClasses, className)}
      {...props}
    />
  ),
);

TableBody.displayName = 'TableBody';

export type TableFooterProps = React.HTMLAttributes<HTMLTableSectionElement>;

export const TableFooter = React.forwardRef<HTMLTableSectionElement, TableFooterProps>(
  ({ className, ...props }, ref) => (
    <tfoot
      ref={ref}
      data-slot="table-footer"
      className={classy(tableFooterClasses, className)}
      {...props}
    />
  ),
);

TableFooter.displayName = 'TableFooter';

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  /**
   * Selected state -- a consumer-set PROP, not an internal selection model.
   * When true, the row projects `aria-selected="true"` and the
   * `data-state="selected"` class hook; when absent, it projects neither.
   */
  selected?: boolean;
}

export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ selected, className, ...props }, ref) => (
    <tr
      ref={ref}
      data-part="row"
      className={classy(tableRowClasses, className)}
      {...tableRowAttrs(selected)}
      {...props}
    />
  ),
);

TableRow.displayName = 'TableRow';

export type TableHeadProps = React.ThHTMLAttributes<HTMLTableCellElement>;

export const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      data-slot="table-head"
      className={classy(tableHeadClasses, className)}
      {...props}
    />
  ),
);

TableHead.displayName = 'TableHead';

export type TableCellProps = React.TdHTMLAttributes<HTMLTableCellElement>;

export const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      data-slot="table-cell"
      className={classy(tableCellClasses, className)}
      {...props}
    />
  ),
);

TableCell.displayName = 'TableCell';

export type TableCaptionProps = React.HTMLAttributes<HTMLTableCaptionElement>;

export const TableCaption = React.forwardRef<HTMLTableCaptionElement, TableCaptionProps>(
  ({ className, ...props }, ref) => (
    <caption
      ref={ref}
      data-slot="table-caption"
      className={classy(tableCaptionClasses, className)}
      {...props}
    />
  ),
);

TableCaption.displayName = 'TableCaption';

/** The shadcn v4 compound surface: Table + namespaced sub-components. */
export const Table = Object.assign(TableRoot, {
  Header: TableHeader,
  Body: TableBody,
  Footer: TableFooter,
  Row: TableRow,
  Head: TableHead,
  Cell: TableCell,
  Caption: TableCaption,
});

export default Table;
