/**
 * Table view: class strings, no logic. Shared by every performance
 * (table.tsx, table.astro) so one score wears one decoration across
 * frameworks. Ported from the oracle (src/old/ui/table.classes.ts); the sub-
 * part classes are config-independent literals, so the performances import
 * them directly (no context/provider needed for a flat static).
 *
 * All colour and typography come through semantic role tokens
 * (`ts-body-small`, `ts-label-medium`, `text-muted-foreground`, `bg-muted`,
 * `border-b`/`border-t`) -- no raw colour or arbitrary values. The only delta
 * from the oracle: the redundant `duration-150` is dropped, since Tailwind's
 * `transition-colors` already carries the default duration/easing (motion
 * intent: transition-colors; durations come from tokens, Spec 04).
 */

/** The `<table>` root: full width, bottom-anchored caption, small body text. */
export const tableRootClasses = 'w-full caption-bottom ts-body-small';

/** The overflow wrapper around the table -- horizontal scroll for wide data. */
export const tableWrapperClasses = 'relative w-full overflow-auto';

/** `<thead>`: a bottom border under the header row. */
export const tableHeaderClasses = '[&_tr]:border-b';

/** `<tbody>`: the last row drops its border so it does not double the footer. */
export const tableBodyClasses = '[&_tr:last-child]:border-0';

/** `<tfoot>`: a top border, muted surface, label typography. */
export const tableFooterClasses = 'border-t bg-muted/50 ts-label-medium [&>tr]:last:border-b-0';

/**
 * `<tr>`: a bottom border, a colour transition on hover, and the selected
 * hook. `data-[state=selected]:bg-muted` is the class side of the
 * `tableRowAttrs` projection -- a selected row (data-state="selected") tints
 * to the muted surface. `motion-reduce:transition-none` respects the user's
 * reduced-motion preference.
 */
export const tableRowClasses =
  'border-b transition-colors motion-reduce:transition-none hover:bg-muted/50 data-[state=selected]:bg-muted';

/**
 * `<th>`: header cell -- fixed height, left-aligned, muted label typography.
 * The `[&:has([role=checkbox])]` and `[&>[role=checkbox]]` selectors align a
 * selection checkbox flush in the cell (shadcn v4 surface).
 */
export const tableHeadClasses =
  'h-10 px-2 text-left align-middle ts-label-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-0.5';

/** `<td>`: data cell -- padded, middle-aligned, with the same checkbox flush. */
export const tableCellClasses =
  'p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-0.5';

/** `<caption>`: muted small text, anchored to the bottom by the root. */
export const tableCaptionClasses = 'ts-body-small text-muted-foreground';
