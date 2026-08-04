import type { DropdownMenuConfig, DropdownMenuState } from './dropdown-menu.behavior';

export interface DropdownMenuClassSet {
  trigger: string;
  content: string;
  item: string;
  checkboxItem: string;
  radioItem: string;
  itemIndicator: string;
  checkIcon: string;
  radioDot: string;
  separator: string;
  shortcut: string;
  label: string;
  group: string;
}

// The trigger is usually composed onto a Button via asChild; these are the
// modest defaults for the bare <button> the decorators fall back to.
const triggerClasses =
  'inline-flex items-center justify-center gap-2 rounded-md ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

// z-depth-dropdown is the semantic depth token; fill (bg-popover), not a raw
// color. Enter/exit is PRESENCE (#1996), and it is no longer undeclared: the
// animate-* utilities below come from the token layer's --animate-* entries,
// which carry the duration tier and curve, so this is the system's own path and
// not the prohibited hand-rolled animate-in/zoom/fade/slide string. The menu is
// present-but-hidden, so the keyframe starts as the node leaves display:none --
// no @starting-style -- and usePresence withholds `hidden` until the exit
// keyframe ends. motion-reduce:animate-none is the reduced-motion path.
const contentClasses =
  'z-depth-dropdown min-w-32 overflow-hidden rounded-md border bg-popover p-1 ' +
  'text-popover-foreground shadow-lg ' +
  'data-[state=open]:animate-scale-in data-[state=closed]:animate-scale-out ' +
  'data-[state=closed]:pointer-events-none motion-reduce:animate-none';

// The active item is the roving-focus current item, styled via :focus. No
// data-highlighted axis (the highlight is ephemeral DOM focus, not score state).
const itemBase =
  'relative flex cursor-default select-none items-center rounded-sm text-body-small outline-none ' +
  'focus:bg-accent focus:text-accent-foreground ' +
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

const itemClasses = `${itemBase} gap-2 px-2 py-1.5`;

const checkboxItemClasses = `${itemBase} py-1.5 pl-8 pr-2`;

const radioItemClasses = `${itemBase} py-1.5 pl-8 pr-2`;

const itemIndicatorClasses = 'absolute left-2 flex h-3.5 w-3.5 items-center justify-center';

const checkIconClasses = 'h-4 w-4';

const radioDotClasses = 'h-2 w-2 rounded-full bg-current';

const separatorClasses = '-mx-1 my-1 h-px border-0 bg-muted';

const shortcutClasses = 'ml-auto text-shortcut opacity-60';

const labelClasses = 'px-2 py-1.5 text-label-medium';

const groupClasses = '';

export function dropdownMenuClasses(
  _config: DropdownMenuConfig,
  _state: DropdownMenuState,
): DropdownMenuClassSet {
  return {
    trigger: triggerClasses,
    content: contentClasses,
    item: itemClasses,
    checkboxItem: checkboxItemClasses,
    radioItem: radioItemClasses,
    itemIndicator: itemIndicatorClasses,
    checkIcon: checkIconClasses,
    radioDot: radioDotClasses,
    separator: separatorClasses,
    shortcut: shortcutClasses,
    label: labelClasses,
    group: groupClasses,
  };
}
