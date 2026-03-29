/**
 * Shared collapsible class definitions
 *
 * Imported by collapsible.tsx (React) to keep inline strings
 * in a single source of truth.
 */

export const collapsibleTriggerClasses =
  'hover:bg-muted transition-colors duration-150 motion-reduce:transition-none ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';

export const collapsibleDisabledClasses =
  'data-[disabled]:opacity-50 data-[disabled]:pointer-events-none';

export const collapsibleContentClasses =
  'overflow-hidden transition-all duration-300 motion-reduce:transition-none ' +
  'data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down';
