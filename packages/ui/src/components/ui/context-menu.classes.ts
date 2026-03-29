/**
 * Shared class definitions for ContextMenu component
 */

export const contextMenuContentClasses =
  'z-depth-dropdown min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg';

export const contextMenuContentAnimationClasses =
  'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95';

export const contextMenuSubContentAnimationClasses =
  'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95';

export const contextMenuLabelClasses = 'px-2 py-1.5 text-sm font-semibold';

export const contextMenuItemClasses =
  'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors duration-100 motion-reduce:transition-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

export const contextMenuCheckboxItemClasses =
  'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors duration-100 motion-reduce:transition-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

export const contextMenuCheckboxIndicatorClasses =
  'absolute left-2 flex h-3.5 w-3.5 items-center justify-center';

export const contextMenuCheckIconClasses = 'h-4 w-4';

export const contextMenuRadioItemClasses =
  'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors duration-100 motion-reduce:transition-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

export const contextMenuRadioIndicatorClasses =
  'absolute left-2 flex h-3.5 w-3.5 items-center justify-center';

export const contextMenuRadioDotClasses = 'h-2 w-2 rounded-full bg-current';

export const contextMenuSeparatorClasses = '-mx-1 my-1 h-px border-0 bg-muted';

export const contextMenuShortcutClasses = 'ml-auto text-xs tracking-widest opacity-60';

export const contextMenuSubTriggerClasses =
  'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors duration-100 motion-reduce:transition-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

export const contextMenuSubTriggerIconClasses = 'ml-auto h-4 w-4';
