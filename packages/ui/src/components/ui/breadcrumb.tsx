/**
 * Hierarchical navigation component for wayfinding
 *
 * @cognitive-load 2/10 - Optimized for peripheral navigation aid with minimal cognitive overhead
 * @attention-economics Tertiary support: Never competes with primary content, provides spatial context only
 * @trust-building Low trust routine navigation with predictable, reliable wayfinding patterns
 * @accessibility Complete ARIA support with aria-current="page", aria-hidden separators, and keyboard navigation
 * @semantic-meaning Wayfinding system with spatial context and navigation hierarchy indication
 *
 * @usage-patterns
 * DO: Provide spatial context and navigation hierarchy
 * DO: Use clear current page indication with aria-current="page"
 * DO: Implement truncation strategies for long paths (Miller's Law: 7+/-2 items)
 * DO: Configure separators with proper accessibility attributes
 * NEVER: Use for primary actions or main navigation
 * NEVER: Show breadcrumbs on homepage (nothing to navigate back to)
 * NEVER: Make current page clickable
 *
 * @example
 * ```tsx
 * // Basic breadcrumb
 * <Breadcrumb>
 *   <BreadcrumbList>
 *     <BreadcrumbItem>
 *       <BreadcrumbLink href="/">Home</BreadcrumbLink>
 *     </BreadcrumbItem>
 *     <BreadcrumbSeparator />
 *     <BreadcrumbItem>
 *       <BreadcrumbLink href="/products">Products</BreadcrumbLink>
 *     </BreadcrumbItem>
 *     <BreadcrumbSeparator />
 *     <BreadcrumbItem>
 *       <BreadcrumbPage>Widget</BreadcrumbPage>
 *     </BreadcrumbItem>
 *   </BreadcrumbList>
 * </Breadcrumb>
 *
 * // With truncation for deep paths
 * <Breadcrumb>
 *   <BreadcrumbList>
 *     <BreadcrumbItem>
 *       <BreadcrumbLink href="/">Home</BreadcrumbLink>
 *     </BreadcrumbItem>
 *     <BreadcrumbSeparator />
 *     <BreadcrumbItem>
 *       <BreadcrumbEllipsis />
 *     </BreadcrumbItem>
 *     <BreadcrumbSeparator />
 *     <BreadcrumbItem>
 *       <BreadcrumbPage>Current Page</BreadcrumbPage>
 *     </BreadcrumbItem>
 *   </BreadcrumbList>
 * </Breadcrumb>
 *
 * // With router Link (asChild)
 * <BreadcrumbLink asChild>
 *   <Link to="/products">Products</Link>
 * </BreadcrumbLink>
 * ```
 */
import * as React from 'react';
import classy from '../../primitives/classy';
import { mergeProps } from '../../primitives/slot';
import {
  breadcrumbEllipsisClasses,
  breadcrumbItemClasses,
  breadcrumbLinkClasses,
  breadcrumbListClasses,
  breadcrumbPageClasses,
  breadcrumbSeparatorClasses,
} from './breadcrumb.classes';

export interface BreadcrumbProps extends React.ComponentPropsWithoutRef<'nav'> {}

export const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  ({ className, ...props }, ref) => (
    <nav ref={ref} aria-label="Breadcrumb" className={classy(className)} {...props} />
  ),
);
Breadcrumb.displayName = 'Breadcrumb';

export interface BreadcrumbListProps extends React.ComponentPropsWithoutRef<'ol'> {}

export const BreadcrumbList = React.forwardRef<HTMLOListElement, BreadcrumbListProps>(
  ({ className, ...props }, ref) => (
    <ol ref={ref} className={classy(breadcrumbListClasses, className)} {...props} />
  ),
);
BreadcrumbList.displayName = 'BreadcrumbList';

export interface BreadcrumbItemProps extends React.ComponentPropsWithoutRef<'li'> {}

export const BreadcrumbItem = React.forwardRef<HTMLLIElement, BreadcrumbItemProps>(
  ({ className, ...props }, ref) => (
    <li ref={ref} className={classy(breadcrumbItemClasses, className)} {...props} />
  ),
);
BreadcrumbItem.displayName = 'BreadcrumbItem';

export interface BreadcrumbLinkProps extends React.ComponentPropsWithoutRef<'a'> {
  asChild?: boolean;
}

export const BreadcrumbLink = React.forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>(
  ({ asChild, className, children, ...props }, ref) => {
    const cls = classy(breadcrumbLinkClasses, className);

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<
        Record<string, unknown>,
        string | React.JSXElementConstructor<unknown>
      >;
      const childPropsTyped = child.props as Record<string, unknown>;

      const parentProps = {
        ref,
        className: cls,
        ...props,
      };

      const mergedProps = mergeProps(
        parentProps as Parameters<typeof mergeProps>[0],
        childPropsTyped,
      );

      return React.cloneElement(child, mergedProps as Partial<Record<string, unknown>>);
    }

    return (
      <a ref={ref} className={cls} {...props}>
        {children}
      </a>
    );
  },
);
BreadcrumbLink.displayName = 'BreadcrumbLink';

export interface BreadcrumbPageProps extends React.ComponentPropsWithoutRef<'span'> {}

export const BreadcrumbPage = React.forwardRef<HTMLSpanElement, BreadcrumbPageProps>(
  ({ className, ...props }, ref) => (
    // biome-ignore lint/a11y/useFocusableInteractive: aria-disabled="true" indicates this is not interactive, tabIndex would be misleading
    // biome-ignore lint/a11y/useSemanticElements: role="link" with aria-disabled="true" indicates the current page in navigation, not a clickable link
    <span
      ref={ref}
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={classy(breadcrumbPageClasses, className)}
      {...props}
    />
  ),
);
BreadcrumbPage.displayName = 'BreadcrumbPage';

export interface BreadcrumbSeparatorProps extends React.ComponentPropsWithoutRef<'li'> {}

export const BreadcrumbSeparator = React.forwardRef<HTMLLIElement, BreadcrumbSeparatorProps>(
  ({ children, className, ...props }, ref) => (
    <li
      ref={ref}
      role="presentation"
      aria-hidden="true"
      className={classy(breadcrumbSeparatorClasses, className)}
      {...props}
    >
      {children ?? <ChevronRight />}
    </li>
  ),
);
BreadcrumbSeparator.displayName = 'BreadcrumbSeparator';

export interface BreadcrumbEllipsisProps extends React.ComponentPropsWithoutRef<'span'> {}

export const BreadcrumbEllipsis = React.forwardRef<HTMLSpanElement, BreadcrumbEllipsisProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      role="presentation"
      aria-hidden="true"
      className={classy(breadcrumbEllipsisClasses, className)}
      {...props}
    >
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">More</span>
    </span>
  ),
);
BreadcrumbEllipsis.displayName = 'BreadcrumbEllipsis';

// Internal icon components to avoid external dependencies
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
