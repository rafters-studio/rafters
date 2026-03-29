/**
 * Shared class definitions for DropdownMenu component
 */

export const dropdownMenuContentClasses =
  'z-depth-dropdown min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md';

export const dropdownMenuContentAnimationClasses =
  'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2';

export const dropdownMenuLabelClasses = 'px-2 py-1.5 text-sm font-semibold';

export const dropdownMenuItemClasses =
  'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

export const dropdownMenuCheckboxItemClasses =
  'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

export const dropdownMenuCheckboxIndicatorClasses =
  'absolute left-2 flex h-3.5 w-3.5 items-center justify-center';

export const dropdownMenuRadioItemClasses =
  'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

export const dropdownMenuRadioIndicatorClasses =
  'absolute left-2 flex h-3.5 w-3.5 items-center justify-center';

export const dropdownMenuRadioDotClasses = 'h-2 w-2 rounded-full bg-current';

export const dropdownMenuSeparatorClasses = '-mx-1 my-1 h-px border-0 bg-muted';

export const dropdownMenuShortcutClasses = 'ml-auto text-xs tracking-widest opacity-60';

export const dropdownMenuSubTriggerClasses =
  'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

export const dropdownMenuSubTriggerIconClasses = 'ml-auto h-4 w-4';

export const dropdownMenuCheckIconClasses = 'h-4 w-4';
