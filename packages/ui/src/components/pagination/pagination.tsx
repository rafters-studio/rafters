/**
 * Pagination -- page-based navigation for large data sets. Compose Pagination
 * with PaginationContent, PaginationItem, PaginationLink, PaginationPrevious,
 * PaginationNext, and PaginationEllipsis; the nav landmark is the contract, the
 * family is the composition. A pure static score has nothing to subscribe to:
 * the performance is pure decoration application. No useBehavior, no memory, no
 * bind -- markup in, classes out, slots through.
 *
 * @cognitive-load 4/10 - decision 1, information 2, interaction 1, disruption 0,
 * learning 0. A row of page controls; the reader reads the current page and the
 * boundary state, then makes one navigation decision. The ellipsis and the
 * disabled Prev/Next add a little information to parse, but the affordance is
 * universally learned and never disruptive.
 * @attention-economics Secondary navigation: supports content discovery without
 * competing with primary content. Use sparingly at the bottom of paginated
 * lists; the current page is the sole emphasis (`bg-primary`), every other
 * control stays low-attention.
 * @trust-building Predictable navigation builds confidence: clear current-page
 * indication prevents disorientation, and disabled Previous/Next at the
 * boundaries prevents invalid actions the user would have to recover from.
 * @accessibility Complete ARIA: the root is a `nav[aria-label="Pagination"]`
 * landmark, the current page is a live link marked `aria-current="page"`,
 * Previous/Next carry descriptive `aria-label`s and project `aria-disabled` at
 * the boundaries, and the ellipsis is `aria-hidden="true"` with an sr-only
 * "More pages" label so assistive tech skips the decoration.
 * @semantic-meaning Page-based navigation system for large data sets. The
 * ellipsis indicates hidden pages; the active control is visually and
 * programmatically distinct from the inactive ones.
 *
 * @usage-patterns
 * DO: Place at the bottom of paginated content for natural flow
 * DO: Show the current page clearly with aria-current="page"
 * DO: Use the ellipsis to truncate large ranges (Miller's Law: 7+/-2 visible)
 * DO: Disable Previous/Next at the boundaries
 * NEVER: Use pagination for small datasets (prefer infinite scroll or full display)
 * NEVER: Hide the current page number from users
 * NEVER: Allow navigation to invalid page numbers
 *
 * @example
 * ```tsx
 * <Pagination>
 *   <PaginationContent>
 *     <PaginationItem>
 *       <PaginationPrevious href="/page/1" />
 *     </PaginationItem>
 *     <PaginationItem>
 *       <PaginationLink href="/page/1">1</PaginationLink>
 *     </PaginationItem>
 *     <PaginationItem>
 *       <PaginationLink href="/page/2" isActive>2</PaginationLink>
 *     </PaginationItem>
 *     <PaginationItem>
 *       <PaginationEllipsis />
 *     </PaginationItem>
 *     <PaginationItem>
 *       <PaginationNext href="/page/3" />
 *     </PaginationItem>
 *   </PaginationContent>
 * </Pagination>
 * ```
 */
import * as React from 'react';
import classy from '../../primitives/classy';
import { mergeProps } from '../../primitives/slot';
import {
  paginationContentClasses,
  paginationDisabledClasses,
  paginationEllipsisClasses,
  paginationLinkActiveClasses,
  paginationLinkBaseClasses,
  paginationLinkInactiveClasses,
  paginationLinkSizeClasses,
  paginationNavClasses,
  paginationNextClasses,
  paginationPreviousClasses,
} from './pagination.classes';

export interface PaginationProps extends React.ComponentPropsWithoutRef<'nav'> {}

export const Pagination = React.forwardRef<HTMLElement, PaginationProps>(
  ({ className, ...props }, ref) => (
    <nav
      ref={ref}
      data-part="root"
      aria-label="Pagination"
      className={classy(paginationNavClasses, className)}
      {...props}
    />
  ),
);
Pagination.displayName = 'Pagination';

export interface PaginationContentProps extends React.ComponentPropsWithoutRef<'ul'> {}

export const PaginationContent = React.forwardRef<HTMLUListElement, PaginationContentProps>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={classy(paginationContentClasses, className)} {...props} />
  ),
);
PaginationContent.displayName = 'PaginationContent';

export interface PaginationItemProps extends React.ComponentPropsWithoutRef<'li'> {}

export const PaginationItem = React.forwardRef<HTMLLIElement, PaginationItemProps>(
  ({ className, ...props }, ref) => <li ref={ref} className={classy(className)} {...props} />,
);
PaginationItem.displayName = 'PaginationItem';

export type PaginationLinkSize = 'default' | 'sm' | 'lg' | 'icon';

type PaginationLinkElement = HTMLAnchorElement | HTMLButtonElement;

export interface PaginationLinkProps {
  isActive?: boolean;
  disabled?: boolean;
  size?: PaginationLinkSize;
  asChild?: boolean;
  href?: string;
  onClick?: React.MouseEventHandler<PaginationLinkElement>;
  className?: string;
  children?: React.ReactNode;
  'aria-label'?: string;
}

/**
 * A single page control. Renders a native `<a>` (href) or a `<button>` (an
 * `onClick` with no href) so navigation is native; `isActive` marks the live
 * current page with `aria-current="page"` (it stays clickable), and `disabled`
 * projects `aria-disabled` plus the native `disabled` on the button branch.
 */
export const PaginationLink = React.forwardRef<PaginationLinkElement, PaginationLinkProps>(
  (
    { isActive, disabled, size = 'icon', asChild, href, onClick, className, children, ...props },
    ref,
  ) => {
    const cls = classy(
      paginationLinkBaseClasses,
      paginationLinkSizeClasses[size] ?? paginationLinkSizeClasses.icon,
      isActive ? paginationLinkActiveClasses : paginationLinkInactiveClasses,
      disabled ? paginationDisabledClasses : undefined,
      className,
    );

    // Render as a button when an onClick is supplied without an href.
    const isButton = onClick && !href;

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<
        Record<string, unknown>,
        string | React.JSXElementConstructor<unknown>
      >;
      const childPropsTyped = child.props as Record<string, unknown>;

      const parentProps = {
        ref,
        className: cls,
        'aria-current': isActive ? ('page' as const) : undefined,
        'aria-disabled': disabled ? 'true' : undefined,
        ...props,
      };

      const mergedProps = mergeProps(
        parentProps as Parameters<typeof mergeProps>[0],
        childPropsTyped,
      );

      return React.cloneElement(child, mergedProps as Partial<Record<string, unknown>>);
    }

    if (isButton) {
      return (
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          type="button"
          className={cls}
          onClick={onClick as React.MouseEventHandler<HTMLButtonElement>}
          disabled={disabled}
          aria-current={isActive ? 'page' : undefined}
          aria-disabled={disabled ? 'true' : undefined}
          {...props}
        >
          {children}
        </button>
      );
    }

    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={cls}
        onClick={onClick as React.MouseEventHandler<HTMLAnchorElement>}
        aria-current={isActive ? 'page' : undefined}
        aria-disabled={disabled ? 'true' : undefined}
        {...props}
      >
        {children}
      </a>
    );
  },
);
PaginationLink.displayName = 'PaginationLink';

export interface PaginationPreviousProps extends Omit<PaginationLinkProps, 'children'> {
  label?: string;
}

export const PaginationPrevious = React.forwardRef<PaginationLinkElement, PaginationPreviousProps>(
  ({ className, label = 'Previous', ...props }, ref) => (
    <PaginationLink
      ref={ref}
      aria-label="Go to previous page"
      size="default"
      className={classy(paginationPreviousClasses, className)}
      {...props}
    >
      <ChevronLeft className="h-4 w-4" />
      <span>{label}</span>
    </PaginationLink>
  ),
);
PaginationPrevious.displayName = 'PaginationPrevious';

export interface PaginationNextProps extends Omit<PaginationLinkProps, 'children'> {
  label?: string;
}

export const PaginationNext = React.forwardRef<PaginationLinkElement, PaginationNextProps>(
  ({ className, label = 'Next', ...props }, ref) => (
    <PaginationLink
      ref={ref}
      aria-label="Go to next page"
      size="default"
      className={classy(paginationNextClasses, className)}
      {...props}
    >
      <span>{label}</span>
      <ChevronRight className="h-4 w-4" />
    </PaginationLink>
  ),
);
PaginationNext.displayName = 'PaginationNext';

export interface PaginationEllipsisProps extends React.ComponentPropsWithoutRef<'span'> {}

/**
 * Collapsed-range indicator: a decorative `aria-hidden` ellipsis glyph paired
 * with an sr-only "More pages" label. Rendered via `createElement` for the same
 * Typography-pending disposition Card, Alert, and Breadcrumb record -- a
 * navigation marker is not prose, so no typography role component fits it.
 */
export const PaginationEllipsis = React.forwardRef<HTMLSpanElement, PaginationEllipsisProps>(
  ({ className, ...props }, ref) =>
    React.createElement(
      'span',
      {
        ref,
        'aria-hidden': 'true',
        className: classy(paginationEllipsisClasses, className),
        ...props,
      },
      React.createElement(MoreHorizontal, { className: 'h-4 w-4' }),
      React.createElement('span', { className: 'sr-only' }, 'More pages'),
    ),
);
PaginationEllipsis.displayName = 'PaginationEllipsis';

// Internal icon components to avoid external dependencies.
function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function MoreHorizontal({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  );
}

export default Pagination;
