/**
 * Table component for displaying structured data in rows and columns
 *
 * @cognitive-load 3/10 - Familiar grid pattern; visual scanning is natural
 * @attention-economics Low attention cost: structured data is easy to scan
 * @trust-building Clear headers, consistent alignment, visible row separation
 * @accessibility Semantic table elements, proper scope attributes, keyboard navigable
 * @semantic-meaning Data presentation: lists, comparisons, structured information
 *
 * @usage-patterns
 * DO: Use for structured, comparable data
 * DO: Provide clear column headers
 * DO: Use consistent alignment (left for text, right for numbers)
 * DO: Support sorting and filtering for large datasets
 * DO: Consider sticky headers for long tables
 * NEVER: Use for layout purposes (use CSS Grid instead)
 * NEVER: Nest tables within tables
 * NEVER: Hide header row
 *
 * @example
 * ```tsx
 * <Table>
 *   <Table.Header>
 *     <Table.Row>
 *       <Table.Head>Name</Table.Head>
 *       <Table.Head>Status</Table.Head>
 *     </Table.Row>
 *   </Table.Header>
 *   <Table.Body>
 *     <Table.Row>
 *       <Table.Cell>John</Table.Cell>
 *       <Table.Cell>Active</Table.Cell>
 *     </Table.Row>
 *   </Table.Body>
 * </Table>
 * ```
 */

import * as React from 'react';
import classy from '../../primitives/classy';
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

// ==================== Table (Root) ====================

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {}

const TableRoot = React.forwardRef<HTMLTableElement, TableProps>(({ className, ...props }, ref) => (
  <div className={tableWrapperClasses}>
    <table ref={ref} data-table="" className={classy(tableRootClasses, className)} {...props} />
  </div>
));

TableRoot.displayName = 'Table';

// ==================== TableHeader ====================

export interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

export const TableHeader = React.forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ className, ...props }, ref) => (
    <thead
      ref={ref}
      data-table-header=""
      className={classy(tableHeaderClasses, className)}
      {...props}
    />
  ),
);

TableHeader.displayName = 'TableHeader';

// ==================== TableBody ====================

export interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

export const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ className, ...props }, ref) => (
    <tbody
      ref={ref}
      data-table-body=""
      className={classy(tableBodyClasses, className)}
      {...props}
    />
  ),
);

TableBody.displayName = 'TableBody';

// ==================== TableFooter ====================

export interface TableFooterProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

export const TableFooter = React.forwardRef<HTMLTableSectionElement, TableFooterProps>(
  ({ className, ...props }, ref) => (
    <tfoot
      ref={ref}
      data-table-footer=""
      className={classy(tableFooterClasses, className)}
      {...props}
    />
  ),
);

TableFooter.displayName = 'TableFooter';

// ==================== TableRow ====================

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {}

export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, ...props }, ref) => (
    <tr ref={ref} data-table-row="" className={classy(tableRowClasses, className)} {...props} />
  ),
);

TableRow.displayName = 'TableRow';

// ==================== TableHead ====================

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {}

export const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, ...props }, ref) => (
    <th ref={ref} data-table-head="" className={classy(tableHeadClasses, className)} {...props} />
  ),
);

TableHead.displayName = 'TableHead';

// ==================== TableCell ====================

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {}

export const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, ...props }, ref) => (
    <td ref={ref} data-table-cell="" className={classy(tableCellClasses, className)} {...props} />
  ),
);

TableCell.displayName = 'TableCell';

// ==================== TableCaption ====================

export interface TableCaptionProps extends React.HTMLAttributes<HTMLTableCaptionElement> {}

export const TableCaption = React.forwardRef<HTMLTableCaptionElement, TableCaptionProps>(
  ({ className, ...props }, ref) => (
    <caption
      ref={ref}
      data-table-caption=""
      className={classy(tableCaptionClasses, className)}
      {...props}
    />
  ),
);

TableCaption.displayName = 'TableCaption';

// ==================== Namespaced Export ====================

// Create a namespace object for compound pattern
export const Table = Object.assign(TableRoot, {
  Header: TableHeader,
  Body: TableBody,
  Footer: TableFooter,
  Row: TableRow,
  Head: TableHead,
  Cell: TableCell,
  Caption: TableCaption,
});
