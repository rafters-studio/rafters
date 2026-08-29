import type { ComboboxConfig, ComboboxState } from './combobox.behavior';

export interface ComboboxClassSet {
  root: string;
  field: string;
  input: string;
  trigger: string;
  chevron: string;
  content: string;
  item: string;
  itemIndicator: string;
  itemText: string;
  empty: string;
  group: string;
  groupLabel: string;
  separator: string;
}

// `group` scopes the chevron's open-state rotation to the root's data-state.
const rootClasses = 'group';

// The positioning context for the toggle chevron, which sits absolutely inside.
const fieldClasses = 'relative w-full';

// Touch floor at h-11, scaling down via the container query (repo CQ
// convention). Right padding leaves room for the chevron. Fill, not background.
const inputClasses =
  'flex h-11 @md:h-9 w-full rounded-md border border-input bg-background px-3 py-1 pr-9 ' +
  'text-body-small ts-body-small shadow-sm ring-offset-background transition-shadow motion-reduce:transition-none ' +
  'placeholder:text-muted-foreground hover:border-input-hover ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'disabled:cursor-not-allowed disabled:opacity-50 ' +
  'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50';

const triggerClasses =
  'absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground hover:text-foreground';

const chevronClasses =
  'size-4 shrink-0 opacity-50 transition-transform motion-reduce:transition-none ' +
  'group-data-[state=open]:rotate-180';

// Enter/exit motion is intentionally undeclared: the semantic dropdown motion
// token (motion-dropdown-in/-out) is documented in docs/MOTION.md but not yet
// generated as a utility (#1899/#1902). Per the port rules we leave motion
// undeclared rather than hardcode a numeric duration; the token gap is recorded
// in docs/spec/components/combobox.md.
// stagger-items (#2156) is the exporter-emitted per-position ladder (#2189):
// classes.ts SELECTS the utility on the item collection's container, it never
// constructs calc()/nth-child itself (00-boundaries Sec 6). Content is the
// direct DOM parent of the item children in the ungrouped case.
const contentClasses =
  'z-depth-dropdown max-h-60 min-w-32 overflow-auto rounded-md border bg-popover p-1 ' +
  'text-popover-foreground shadow-md stagger-items';

const itemClasses =
  'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 ' +
  'text-body-small ts-body-small outline-none ' +
  'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground ' +
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

const itemIndicatorClasses = 'absolute left-2 flex size-3.5 items-center justify-center';

const itemTextClasses = 'truncate';

const emptyClasses = 'py-6 text-center text-body-small ts-body-small text-muted-foreground';

const groupClasses = 'overflow-hidden p-1';

const groupLabelClasses = 'px-2 py-1.5 text-label-medium ts-label-medium text-muted-foreground';

const separatorClasses = '-mx-1 my-1 h-px bg-muted';

export function comboboxClasses(_config: ComboboxConfig, _state: ComboboxState): ComboboxClassSet {
  return {
    root: rootClasses,
    field: fieldClasses,
    input: inputClasses,
    trigger: triggerClasses,
    chevron: chevronClasses,
    content: contentClasses,
    item: itemClasses,
    itemIndicator: itemIndicatorClasses,
    itemText: itemTextClasses,
    empty: emptyClasses,
    group: groupClasses,
    groupLabel: groupLabelClasses,
    separator: separatorClasses,
  };
}
