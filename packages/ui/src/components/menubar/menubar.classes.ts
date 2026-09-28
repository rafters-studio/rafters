import type { MenubarConfig, MenubarState } from './menubar.behavior';

export interface MenubarClassSet {
  root: string;
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
  inset: string;
  menuHost: string;
}

// NO MOTION IN THIS FILE. menubar's rows in motion.jsonl (content closed <->
// open, items enter / highlight move, trigger hover) are consumed by #2292,
// which lands after this port. Until then every moment is still: no
// transition, duration, curve, delay or animate utility is named here.

const rootClasses = 'flex h-9 items-center gap-1 rounded-md border bg-background p-1';

// The open menu's trigger keeps the accent fill while focus is inside its menu.
const triggerClasses =
  'flex cursor-default select-none items-center rounded-sm px-3 py-1 ' +
  'text-label-medium ts-label-medium outline-none ' +
  'focus:bg-accent focus:text-accent-foreground ' +
  'data-[state=open]:bg-accent data-[state=open]:text-accent-foreground ' +
  'disabled:pointer-events-none disabled:opacity-50';

// z-depth-dropdown is the semantic depth token; fill (bg-popover), not a raw
// color. The menu is positioned (fixed) by positionMenubarContent, not here.
const contentClasses =
  'z-depth-dropdown min-w-48 overflow-hidden rounded-md border bg-popover p-1 ' +
  'text-popover-foreground shadow-lg';

// The active item is the roving-focus current item, styled via :focus. No
// data-highlighted axis (the highlight is ephemeral DOM focus, not score state).
const itemBase =
  'relative flex cursor-default select-none items-center rounded-sm text-body-small ts-body-small outline-none ' +
  'focus:bg-accent focus:text-accent-foreground ' +
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

const itemClasses = `${itemBase} gap-2 px-2 py-1.5`;

const checkboxItemClasses = `${itemBase} py-1.5 pl-8 pr-2`;

const radioItemClasses = `${itemBase} py-1.5 pl-8 pr-2`;

const itemIndicatorClasses = 'absolute left-2 flex h-3.5 w-3.5 items-center justify-center';

const checkIconClasses = 'h-4 w-4';

const radioDotClasses = 'h-2 w-2 rounded-full bg-current';

const separatorClasses = '-mx-1 my-1 h-px border-0 bg-muted';

const shortcutClasses = 'ml-auto text-shortcut ts-shortcut opacity-60';

const labelClasses = 'px-2 py-1.5 text-label-medium ts-label-medium';

const groupClasses = '';

// Aligns inset labels/items with the checkbox/radio indicator column.
const insetClasses = 'pl-8';

// The React host the menus portal into, right after the bar. It generates no
// box of its own, so it never joins the layout the bar sits in; the menus
// inside are fixed-positioned under their triggers.
const menuHostClasses = 'contents';

export function menubarClasses(_config: MenubarConfig, _state: MenubarState): MenubarClassSet {
  return {
    root: rootClasses,
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
    inset: insetClasses,
    menuHost: menuHostClasses,
  };
}
