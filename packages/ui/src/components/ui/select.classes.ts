/**
 * Shared class definitions for Select component
 */

export const selectTriggerBaseClasses =
  'flex w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-sm ring-offset-background hover:border-input-hover';

export const selectTriggerPlaceholderClasses = 'placeholder:text-muted-foreground';

export const selectTriggerFocusClasses =
  'transition-shadow duration-100 motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';

export const selectTriggerDisabledClasses = 'disabled:cursor-not-allowed disabled:opacity-50';

export const selectTriggerLineClampClasses = '[&>span]:line-clamp-1';

export const selectValuePlaceholderClasses = 'text-muted-foreground';

export const selectChevronClasses = 'size-4 shrink-0 opacity-50';

export const selectContentBaseClasses =
  'z-depth-dropdown max-h-96 min-w-32 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md';

export const selectContentAnimateClasses =
  'data-[state=open]:animate-in data-[state=closed]:animate-out';

export const selectContentFadeClasses =
  'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0';

export const selectContentZoomClasses =
  'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95';

export const selectContentSlideClasses =
  'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2';

export const selectContentPaddingClasses = 'p-1';

export const selectViewportClasses = 'p-1';

export const selectLabelClasses = 'py-1.5 pl-8 pr-2 text-sm font-semibold';

export const selectItemBaseClasses =
  'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none';

export const selectItemFocusClasses = 'focus:bg-accent focus:text-accent-foreground';

export const selectItemDisabledClasses =
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

export const selectItemIndicatorClasses =
  'absolute left-2 flex h-3.5 w-3.5 items-center justify-center';

export const selectSeparatorClasses = '-mx-1 my-1 h-px bg-muted';

export const selectIconClasses = 'ml-auto h-4 w-4 shrink-0 opacity-50';

export const selectScrollButtonClasses = 'flex cursor-default items-center justify-center py-1';

export const selectScrollIconClasses = 'size-4';
