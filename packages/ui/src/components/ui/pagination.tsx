/**
 * Navigation component for paginated content
 *
 * @cognitive-load 4/10 - Moderate complexity with page calculations, but clear visual patterns
 * @attention-economics Secondary navigation: Supports content discovery without competing with primary content. Use sparingly at bottom of paginated lists.
 * @trust-building Predictable navigation patterns build user confidence. Clear current page indication prevents disorientation. Disabled states prevent invalid actions.
 * @accessibility Complete ARIA support with nav landmark, aria-current="page", aria-label descriptions, and keyboard navigation
 * @semantic-meaning Page-based navigation system for large data sets. Ellipsis indicates hidden pages. Visual distinction between active and inactive states.
 *
 * @usage-patterns
 * DO: Place at bottom of paginated content for natural flow
 * DO: Show current page clearly with aria-current="page"
 * DO: Use ellipsis to truncate large page ranges (7+/-2 items visible)
 * DO: Disable Previous/Next at boundaries
 * NEVER: Use pagination for small datasets (prefer infinite scroll or full display)
 * NEVER: Hide the current page number from users
 * NEVER: Allow navigation to invalid page numbers
 *
 * @example
 * ```tsx
 * // Basic composable pagination
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
 *
 * // Button-style pagination (onClick handlers)
 * <Pagination>
 *   <PaginationContent>
 *     <PaginationItem>
 *       <PaginationPrevious onClick={() => setPage(page - 1)} disabled={page === 1} />
 *     </PaginationItem>
 *     <PaginationItem>
 *       <PaginationLink onClick={() => setPage(1)} isActive={page === 1}>1</PaginationLink>
 *     </PaginationItem>
 *     <PaginationItem>
 *       <PaginationNext onClick={() => setPage(page + 1)} disabled={page === totalPages} />
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
  paginationEllipsisClasses,
  paginationLinkActiveClasses,
  paginationLinkBaseClasses,
  paginationLinkInactiveClasses,
  paginationLinkSizeClasses,
  paginationNavClasses,
} from './pagination.classes';

export interface PaginationProps extends React.ComponentPropsWithoutRef<'nav'> {}

export const Pagination = React.forwardRef<HTMLElement, PaginationProps>(
  ({ className, ...props }, ref) => (
    <nav
      ref={ref}
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

type PaginationLinkElement = HTMLAnchorElement | HTMLButtonElement;

export interface PaginationLinkProps {
  isActive?: boolean;
  disabled?: boolean;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
  href?: string;
  onClick?: React.MouseEventHandler<PaginationLinkElement>;
  className?: string;
  children?: React.ReactNode;
}

export const PaginationLink = React.forwardRef<PaginationLinkElement, PaginationLinkProps>(
  (
    { isActive, disabled, size = 'icon', asChild, href, onClick, className, children, ...props },
    ref,
  ) => {
    const baseClasses = classy(
      paginationLinkBaseClasses,
      paginationLinkSizeClasses[size] ?? paginationLinkSizeClasses.icon,
      isActive ? paginationLinkActiveClasses : paginationLinkInactiveClasses,
      disabled && 'pointer-events-none opacity-50',
      className,
    );

    // Render as button when onClick is provided without href
    const isButton = onClick && !href;

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<
        Record<string, unknown>,
        string | React.JSXElementConstructor<unknown>
      >;
      const childPropsTyped = child.props as Record<string, unknown>;

      const parentProps = {
        ref,
        className: baseClasses,
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
          className={baseClasses}
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
        className={baseClasses}
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
      className={classy('gap-1 pl-2.5', className)}
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
      className={classy('gap-1 pr-2.5', className)}
      {...props}
    >
      <span>{label}</span>
      <ChevronRight className="h-4 w-4" />
    </PaginationLink>
  ),
);
PaginationNext.displayName = 'PaginationNext';

export interface PaginationEllipsisProps extends React.ComponentPropsWithoutRef<'span'> {}

export const PaginationEllipsis = React.forwardRef<HTMLSpanElement, PaginationEllipsisProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      aria-hidden="true"
      className={classy(paginationEllipsisClasses, className)}
      {...props}
    >
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">More pages</span>
    </span>
  ),
);
PaginationEllipsis.displayName = 'PaginationEllipsis';

// Internal icon components to avoid external dependencies
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
