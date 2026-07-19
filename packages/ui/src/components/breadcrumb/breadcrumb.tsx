/**
 * Breadcrumb -- a hierarchical location trail for wayfinding. Compose
 * Breadcrumb with BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
 * BreadcrumbPage, BreadcrumbSeparator, and BreadcrumbEllipsis; the nav
 * landmark is the contract, the family is the composition. A pure static
 * score has nothing to subscribe to: the performance is pure decoration
 * application. No useBehavior, no memory, no bind -- markup in, classes out,
 * slots through.
 *
 * @cognitive-load 2/10 - decision 0, info 1, interaction 0, disruption 0, learning 1
 * @attention-economics Tertiary support: a breadcrumb provides spatial context
 * only and must never compete with primary content. It sits above the fold as
 * a peripheral wayfinding aid; reserve its low-chroma muted text so the current
 * page reads as the sole emphasis and the trail recedes.
 * @trust-building Predictable, reliable wayfinding: the trail always mirrors the
 * site hierarchy, the current page is never a dead link, and separators never
 * imply interactivity -- routine navigation the user can trust without reading.
 * @accessibility Complete ARIA: the root is a `nav[aria-label="Breadcrumb"]`
 * landmark, the current page is `aria-current="page"` (and non-clickable via
 * `role="link" aria-disabled="true"`), and separators/ellipses are
 * `aria-hidden="true" role="presentation"` so assistive tech skips the
 * decoration. The ellipsis pairs its icon with an sr-only "More" label.
 * @semantic-meaning Wayfinding system: an ordered list of ancestor links
 * expressing navigation hierarchy and the reader's current location within it.
 *
 * @usage-patterns
 * DO: Provide spatial context and navigation hierarchy
 * DO: Mark the current page with aria-current="page" (BreadcrumbPage)
 * DO: Truncate long paths with BreadcrumbEllipsis (Miller's Law: 7+/-2 items)
 * NEVER: Use for primary actions or main navigation
 * NEVER: Show breadcrumbs on the homepage (nothing to navigate back to)
 * NEVER: Make the current page clickable
 *
 * @example
 * ```tsx
 * <Breadcrumb>
 *   <BreadcrumbList>
 *     <BreadcrumbItem>
 *       <BreadcrumbLink href="/">Home</BreadcrumbLink>
 *     </BreadcrumbItem>
 *     <BreadcrumbSeparator />
 *     <BreadcrumbItem>
 *       <BreadcrumbPage>Widget</BreadcrumbPage>
 *     </BreadcrumbItem>
 *   </BreadcrumbList>
 * </Breadcrumb>
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
    <nav
      ref={ref}
      data-part="root"
      aria-label="Breadcrumb"
      className={classy(className) || undefined}
      {...props}
    />
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

/**
 * The current page: a non-clickable `role="link" aria-disabled="true"
 * aria-current="page"` marker. Rendered via `createElement` rather than JSX
 * for the same reason Card/Alert render raw text nodes that way -- the new
 * tree's Typography component does not exist yet; a breadcrumb node is a
 * navigation marker, not prose, so no typography role component fits it.
 */
export const BreadcrumbPage = React.forwardRef<HTMLSpanElement, BreadcrumbPageProps>(
  ({ className, children, ...props }, ref) =>
    React.createElement(
      'span',
      {
        ref,
        role: 'link',
        'aria-disabled': 'true',
        'aria-current': 'page',
        className: classy(breadcrumbPageClasses, className),
        ...props,
      },
      children,
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

/**
 * Collapsed-path indicator: a decorative `aria-hidden` ellipsis icon paired
 * with an sr-only "More" label. Rendered via `createElement` for the same
 * Typography-pending disposition as BreadcrumbPage.
 */
export const BreadcrumbEllipsis = React.forwardRef<HTMLSpanElement, BreadcrumbEllipsisProps>(
  ({ className, ...props }, ref) =>
    React.createElement(
      'span',
      {
        ref,
        role: 'presentation',
        'aria-hidden': 'true',
        className: classy(breadcrumbEllipsisClasses, className),
        ...props,
      },
      React.createElement(MoreHorizontal, { className: 'h-4 w-4' }),
      React.createElement('span', { className: 'sr-only' }, 'More'),
    ),
);
BreadcrumbEllipsis.displayName = 'BreadcrumbEllipsis';

// Internal icon components to avoid external dependencies.
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

export default Breadcrumb;
