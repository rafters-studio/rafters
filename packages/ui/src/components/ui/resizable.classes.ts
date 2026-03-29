/**
 * Shared resizable class definitions
 *
 * Imported by resizable.tsx (React) to keep inline strings
 * in a single source of truth.
 */

export const resizablePanelGroupClasses = 'flex h-full w-full';

export const resizablePanelClasses = 'relative';

export const resizableHandleClasses =
  'relative flex items-center justify-center bg-border ' +
  'after:absolute after:inset-y-0 after:left-1/2 after:-translate-x-1/2 ' +
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1';

export const resizableHandleHorizontalClasses = 'w-px cursor-col-resize after:w-1';

export const resizableHandleVerticalClasses = 'h-px cursor-row-resize after:h-1';

export const resizableHandleDisabledClasses = 'cursor-not-allowed opacity-50';

export const resizableHandleDraggingClasses = 'bg-primary';

export const resizableHandleGripClasses =
  'z-10 flex items-center justify-center rounded-sm border bg-border';

export const resizableHandleGripHorizontalClasses = 'h-4 w-3';

export const resizableHandleGripVerticalClasses = 'h-3 w-4';

export const resizableHandleGripIconClasses = 'size-2.5';
