/**
 * Shared class definitions for Command component
 */

export const commandRootClasses =
  'flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground';

export const commandDialogBackdropClasses =
  'fixed inset-0 z-depth-overlay bg-foreground/80 cursor-default';

export const commandDialogClasses =
  'fixed left-1/2 top-1/2 z-depth-modal w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-popover shadow-lg';

export const commandDialogCommandClasses = '[&_[data-command-input-wrapper]]:border-b';

export const commandInputWrapperClasses = 'flex items-center border-b px-3';

export const commandInputSearchIconClasses = 'mr-2 shrink-0 opacity-50';

export const commandInputClasses =
  'flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50';

export const commandListClasses = 'max-h-80 overflow-y-auto overflow-x-hidden';

export const commandEmptyClasses = 'py-6 text-center text-sm';

export const commandGroupClasses = 'overflow-hidden p-1 text-foreground';

export const commandGroupHeadingClasses = 'px-2 py-1.5 text-xs font-medium text-muted-foreground';

export const commandItemClasses =
  'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[selected]:bg-accent data-[selected]:text-accent-foreground';

export const commandSeparatorClasses = '-mx-1 h-px bg-border';

export const commandShortcutClasses = 'ml-auto text-xs tracking-widest text-muted-foreground';
