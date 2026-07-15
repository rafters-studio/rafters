/**
 * Empty state display for when there's no content to show
 *
 * @cognitive-load 2/10 - Simple informational display with clear next steps
 * @attention-economics Supportive element: Fills void without demanding attention, guides to action
 * @trust-building Honest communication about empty state builds trust; actionable guidance reduces frustration
 * @accessibility Clear heading hierarchy; actionable elements are keyboard accessible
 * @semantic-meaning State communication: empty search results, no items yet, cleared list, filtered to nothing
 *
 * @usage-patterns
 * DO: Provide actionable next steps when possible
 * DO: Explain why the state is empty (no results, no items yet, etc.)
 * DO: Use appropriate illustrations to soften the empty state
 * DO: Match tone to context (playful for personal apps, professional for business)
 * NEVER: Leave empty states blank
 * NEVER: Use generic "No data" without context
 * NEVER: Make users feel like something is broken
 *
 * @example
 * ```tsx
 * // Empty search results
 * <Empty>
 *   <EmptyIcon>
 *     <SearchIcon />
 *   </EmptyIcon>
 *   <EmptyTitle>No results found</EmptyTitle>
 *   <EmptyDescription>
 *     Try adjusting your search terms or filters.
 *   </EmptyDescription>
 *   <EmptyAction>
 *     <Button variant="outline" onClick={clearFilters}>
 *       Clear filters
 *     </Button>
 *   </EmptyAction>
 * </Empty>
 *
 * // Empty list (first time)
 * <Empty>
 *   <EmptyIcon>
 *     <FolderIcon />
 *   </EmptyIcon>
 *   <EmptyTitle>No projects yet</EmptyTitle>
 *   <EmptyDescription>
 *     Create your first project to get started.
 *   </EmptyDescription>
 *   <EmptyAction>
 *     <Button>Create project</Button>
 *   </EmptyAction>
 * </Empty>
 *
 * // Informational only (no action)
 * <Empty>
 *   <EmptyIcon>
 *     <InboxIcon />
 *   </EmptyIcon>
 *   <EmptyTitle>All caught up!</EmptyTitle>
 *   <EmptyDescription>
 *     No new notifications.
 *   </EmptyDescription>
 * </Empty>
 * ```
 */
import * as React from 'react';
import classy from '../../primitives/classy';
import {
  emptyActionClasses,
  emptyBaseClasses,
  emptyDescriptionClasses,
  emptyIconClasses,
  emptyTitleClasses,
} from './empty.classes';

export interface EmptyProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface EmptyIconProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface EmptyTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export interface EmptyDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export interface EmptyActionProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Empty = React.forwardRef<HTMLDivElement, EmptyProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={classy(emptyBaseClasses, className)} {...props}>
        {children}
      </div>
    );
  },
);
Empty.displayName = 'Empty';

export const EmptyIcon = React.forwardRef<HTMLDivElement, EmptyIconProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={classy(emptyIconClasses, className)} {...props}>
        {children}
      </div>
    );
  },
);
EmptyIcon.displayName = 'EmptyIcon';

export const EmptyTitle = React.forwardRef<HTMLHeadingElement, EmptyTitleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <h3 ref={ref} className={classy(emptyTitleClasses, className)} {...props}>
        {children}
      </h3>
    );
  },
);
EmptyTitle.displayName = 'EmptyTitle';

export const EmptyDescription = React.forwardRef<HTMLParagraphElement, EmptyDescriptionProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <p ref={ref} className={classy(emptyDescriptionClasses, className)} {...props}>
        {children}
      </p>
    );
  },
);
EmptyDescription.displayName = 'EmptyDescription';

export const EmptyAction = React.forwardRef<HTMLDivElement, EmptyActionProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={classy(emptyActionClasses, className)} {...props}>
        {children}
      </div>
    );
  },
);
EmptyAction.displayName = 'EmptyAction';
