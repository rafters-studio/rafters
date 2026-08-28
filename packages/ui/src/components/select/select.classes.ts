import type { SelectConfig, SelectState } from './select.behavior';

export interface SelectClassSet {
  trigger: string;
  value: string;
  chevron: string;
  content: string;
  viewport: string;
  item: string;
  itemIndicator: string;
  itemText: string;
  group: string;
  label: string;
  separator: string;
  scrollButton: string;
  scrollIcon: string;
}

// Touch floor at h-11, scaling down via the container query (repo CQ
// convention) rather than the viewport. Fill, not background.
//
// duration-micro, not the trigger's own hover cell: transition-shadow only
// animates box-shadow (the focus-visible ring below), and motion.jsonl has
// no select | trigger | focus cell to source that from directly. input,
// input-group, and textarea carry this identical transition-shadow and are
// correctly sourced from their own root/focus cells, which are all micro
// (motion.jsonl:109,111,113) -- select's ring gets the same tier by that
// analogy. The hover cell (motion.jsonl:103, fast) governs a border-color
// change that this class does not actually transition (no transition-colors
// utility is applied here); adding one is a separate, pre-existing gap, not
// this fix. Adding a dedicated select | trigger | focus cell is matrix
// hygiene (#2158/#2159), not a literal-to-tier substitution.
const triggerClasses =
  'group flex h-11 @md:h-9 w-full items-center justify-between gap-2 rounded-md ' +
  'border border-input bg-background px-3 py-2 text-body-small ts-body-small shadow-sm ring-offset-background ' +
  'transition-shadow duration-micro motion-reduce:transition-none ' +
  'hover:border-input-hover ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'disabled:cursor-not-allowed disabled:opacity-50 ' +
  'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50';

// The selected label / placeholder. Placeholder look keys off data-empty,
// toggled by the binding when nothing is selected.
const valueClasses = 'pointer-events-none truncate text-left data-[empty]:text-muted-foreground';

const chevronClasses =
  'size-4 shrink-0 opacity-50 transition-transform duration-moderate motion-reduce:transition-none ' +
  'group-data-[state=open]:rotate-180';

const contentClasses =
  'z-depth-dropdown max-h-96 min-w-32 overflow-hidden rounded-md border bg-popover ' +
  'text-popover-foreground shadow-md ' +
  'data-[state=open]:animate-in data-[state=closed]:animate-out ' +
  'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ' +
  'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95';

const viewportClasses = 'p-1';

// STAGGER (#2156): motion.jsonl:55 (select | items | enter) declares delay
// generic `stagger-step`, zero by default (defaults.ts:1758 -- "efficient does
// not stagger lists"). `delay-stagger-step` is the generated consumption of
// that cell: a flat `transition-delay`, wrapping the --rafters-delay-stagger-step
// custom property directly (MOTION_NAMESPACE_PROPERTY, tailwind.ts), the only
// form this generic compiles to today. A genuine per-item multiplier
// (`calc(n * <token>)` scoped per `:nth-child`) is NOT implemented here: it
// would require constructing that CSS function directly in this file, which
// the repo's component-authoring guardrail denies outright ("consumers never
// reference [rafters custom properties] directly; the exporter wires them" --
// Spec 00 Sec 6, "classes.ts ... never arbitrary values"), and no
// multiplier-aware utility exists upstream (out of #2156's scope --
// packages/design-tokens is #2154's package). Applying `delay-stagger-step` at
// eight identical `:nth-child` positions would compile eight selectors to one
// identical declaration, which is dead structure, not a stagger -- so it is
// applied once, unscoped, on the whole item collection instead.
const itemClasses =
  'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 ' +
  'text-body-small ts-body-small outline-none ' +
  'delay-stagger-step ' +
  'focus:bg-accent focus:text-accent-foreground ' +
  'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground ' +
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

const itemIndicatorClasses = 'absolute left-2 flex h-3.5 w-3.5 items-center justify-center';

const itemTextClasses = 'truncate';

const groupClasses = 'p-1';

const labelClasses = 'py-1.5 pl-8 pr-2 text-label-medium ts-label-medium text-muted-foreground';

const separatorClasses = '-mx-1 my-1 h-px bg-muted';

const scrollButtonClasses = 'flex cursor-default items-center justify-center py-1';

const scrollIconClasses = 'size-4';

export function selectClasses(_config: SelectConfig, _state: SelectState): SelectClassSet {
  return {
    trigger: triggerClasses,
    value: valueClasses,
    chevron: chevronClasses,
    content: contentClasses,
    viewport: viewportClasses,
    item: itemClasses,
    itemIndicator: itemIndicatorClasses,
    itemText: itemTextClasses,
    group: groupClasses,
    label: labelClasses,
    separator: separatorClasses,
    scrollButton: scrollButtonClasses,
    scrollIcon: scrollIconClasses,
  };
}
