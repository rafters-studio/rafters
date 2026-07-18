/**
 * Empty -- an empty-state placeholder for when there is no content to show.
 * Compose Empty with EmptyIcon, EmptyTitle, EmptyDescription, and EmptyAction;
 * the centered column is the contract, the sub-components are the composition.
 * The placeholder communicates absence honestly and, where possible, points at
 * the next step -- it fills a void without demanding attention.
 *
 * @cognitive-load 2/10 - decision 0, info 1, interaction 0, disruption 0, learning 1
 * @attention-economics Supportive element: it fills a void without demanding
 * attention. An empty state is read once, briefly, when the content the user
 * expected is not there; it orients and, at most, offers one next step. Keep it
 * quiet -- a loud empty state competes with the content it is standing in for.
 * @trust-building Honest communication about the empty state builds trust:
 * say why the state is empty (no results, nothing yet, filtered to nothing) and
 * offer an actionable next step through EmptyAction. Never let the placeholder
 * read as breakage.
 * @accessibility Clear heading hierarchy -- EmptyTitle renders a real heading
 * (default h3, `as` = h1..h6) so the placeholder takes its correct outline
 * level; never skip levels. Any control placed in EmptyAction is a real,
 * keyboard-reachable element, not a styled div.
 * @semantic-meaning State communication: empty search results, no items yet, a
 * cleared list, or a filter that matched nothing -- the placeholder narrates
 * the absence and, where it can, the recovery.
 *
 * A pure static score has nothing to subscribe to: the performance is pure
 * decoration application. No useBehavior, no memory, no bind -- config in,
 * classes out, children through.
 *
 * @example
 * ```tsx
 * <Empty>
 *   <EmptyIcon>
 *     <SearchIcon />
 *   </EmptyIcon>
 *   <EmptyTitle>No results found</EmptyTitle>
 *   <EmptyDescription>Try adjusting your search terms or filters.</EmptyDescription>
 *   <EmptyAction>
 *     <Button variant="outline" onClick={clearFilters}>Clear filters</Button>
 *   </EmptyAction>
 * </Empty>
 * ```
 */
import * as React from 'react';
import classy from '../../primitives/classy';
import {
  emptyActionClasses,
  emptyClasses,
  emptyDescriptionClasses,
  emptyIconClasses,
  emptyTitleClasses,
} from './empty.classes';

export type EmptyProps = React.HTMLAttributes<HTMLDivElement>;

export const Empty = React.forwardRef<HTMLDivElement, EmptyProps>(
  ({ className, children, ...props }, ref) => {
    const classes = emptyClasses({}, {});
    return (
      <div
        ref={ref}
        data-part="root"
        className={classy(classes.root, className) || undefined}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Empty.displayName = 'Empty';

export type EmptyIconProps = React.HTMLAttributes<HTMLDivElement>;

/** The illustrative icon slot -- muted, sized for the placeholder. Plain
 *  composition over a literal class string, no data-part. */
export const EmptyIcon = React.forwardRef<HTMLDivElement, EmptyIconProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="empty-icon"
      className={classy(emptyIconClasses, className)}
      {...props}
    />
  ),
);

EmptyIcon.displayName = 'EmptyIcon';

export interface EmptyTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

/**
 * Renders a raw heading (default h3, `as` = h1..h6) via createElement because
 * Typography's H1-H6 do not exist yet in the new tree (matrix: typography,
 * pending) -- the same raw-heading disposition Card and Alert record. `as`
 * places the heading at the correct outline level for the surrounding page;
 * the oracle hard-coded `h3`, so the default keeps byte-identical output.
 */
export const EmptyTitle = React.forwardRef<HTMLHeadingElement, EmptyTitleProps>(
  ({ as: Element = 'h3', className, children, ...props }, ref) =>
    React.createElement(
      Element,
      {
        ref,
        'data-slot': 'empty-title',
        className: classy(emptyTitleClasses, className),
        ...props,
      },
      children,
    ),
);

EmptyTitle.displayName = 'EmptyTitle';

export type EmptyDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

/** Raw paragraph via createElement, same Typography-pending disposition as the
 *  title -- plain composition over a literal class string. */
export const EmptyDescription = React.forwardRef<HTMLParagraphElement, EmptyDescriptionProps>(
  ({ className, children, ...props }, ref) =>
    React.createElement(
      'p',
      {
        ref,
        'data-slot': 'empty-description',
        className: classy(emptyDescriptionClasses, className),
        ...props,
      },
      children,
    ),
);

EmptyDescription.displayName = 'EmptyDescription';

export type EmptyActionProps = React.HTMLAttributes<HTMLDivElement>;

/** Trailing action slot -- holds a real, keyboard-reachable control (a Button
 *  or link) that offers the next step. Plain composition, no data-part. */
export const EmptyAction = React.forwardRef<HTMLDivElement, EmptyActionProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="empty-action"
      className={classy(emptyActionClasses, className)}
      {...props}
    />
  ),
);

EmptyAction.displayName = 'EmptyAction';

export default Empty;
