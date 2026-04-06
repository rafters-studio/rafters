/**
 * Shared class definitions for Menubar component
 */

export const menubarRootClasses = 'flex h-9 items-center gap-1 rounded-md border bg-background p-1';

export const menubarTriggerClasses =
  'flex cursor-default select-none items-center rounded-sm px-3 py-1 text-label-medium outline-none transition-colors duration-100 motion-reduce:transition-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground';

export const menubarContentClasses =
  'z-depth-dropdown min-w-48 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg';

export const menubarContentAnimationClasses =
  'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2';

export const menubarLabelClasses = 'px-2 py-1.5 text-label-medium';

export const menubarItemClasses =
  'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-body-small outline-none transition-colors duration-100 motion-reduce:transition-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

export const menubarCheckboxItemClasses =
  'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-body-small outline-none transition-colors duration-100 motion-reduce:transition-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

export const menubarCheckboxIndicatorClasses =
  'absolute left-2 flex h-3.5 w-3.5 items-center justify-center';

export const menubarCheckIconClasses = 'h-4 w-4';

export const menubarRadioItemClasses =
  'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-body-small outline-none transition-colors duration-100 motion-reduce:transition-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

export const menubarRadioIndicatorClasses =
  'absolute left-2 flex h-3.5 w-3.5 items-center justify-center';

export const menubarRadioDotClasses = 'h-2 w-2 rounded-full bg-current';

export const menubarSeparatorClasses = '-mx-1 my-1 h-px border-0 bg-muted';

export const menubarShortcutClasses = 'ml-auto text-shortcut opacity-60';

export const menubarSubTriggerClasses =
  'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-body-small outline-none transition-colors duration-100 motion-reduce:transition-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

export const menubarSubTriggerIconClasses = 'ml-auto h-4 w-4';
