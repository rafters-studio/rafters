/**
 * Shared accordion class definitions
 *
 * Imported by accordion.tsx (React) to keep inline strings
 * in a single source of truth.
 */

export const accordionItemClasses = 'border-b';

export const accordionTriggerHeadingClasses = 'flex';

export const accordionTriggerClasses =
  'flex flex-1 items-center justify-between py-4 font-medium transition-all duration-300 motion-reduce:transition-none ' +
  'hover:underline ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'disabled:pointer-events-none disabled:opacity-50';

export const accordionTriggerIconClasses =
  'h-4 w-4 shrink-0 transition-transform duration-300 motion-reduce:transition-none ' +
  'data-[state=open]:rotate-180';

export const accordionContentClasses =
  'overflow-hidden text-sm transition-all duration-300 motion-reduce:transition-none ' +
  'data-[state=closed]:animate-accordion-up ' +
  'data-[state=open]:animate-accordion-down';

export const accordionContentInnerClasses = 'pb-4 pt-0';
