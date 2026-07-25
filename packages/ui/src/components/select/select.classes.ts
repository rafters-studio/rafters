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
// The shadow move goes through motion-focus, which is box-shadow + outline-color
// over --duration-micro on a linear curve -- the same property and the same 100ms
// the raw pair spelled out, now owned by the token layer. motion-focus carries no
// prefers-reduced-motion block of its own, so unlike the chevron below this
// element still needs its guard; nothing else would disable the transition.
const triggerClasses =
  'group flex h-11 @md:h-9 w-full items-center justify-between gap-2 rounded-md ' +
  'border border-input bg-background px-3 py-2 text-body-small shadow-sm ring-offset-background ' +
  'motion-focus motion-reduce:transition-none ' +
  'hover:border-input-hover ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'disabled:cursor-not-allowed disabled:opacity-50 ' +
  'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50';

// The selected label / placeholder. Placeholder look keys off data-empty,
// toggled by the binding when nothing is selected.
const valueClasses = 'pointer-events-none truncate text-left data-[empty]:text-muted-foreground';

// The 180-degree flip is a toggle, so it takes motion-toggle -- transform on the
// spring-snappy curve. No guard here, deliberately: motion-toggle has its own
// prefers-reduced-motion block that drops transform while keeping the colour
// transition, and motion-reduce:transition-none would override that with nothing
// rather than reinforce it. Which layer owns reduced motion is decided per
// element by the utility applied to it.
const chevronClasses =
  'size-4 shrink-0 opacity-50 motion-toggle ' + 'group-data-[state=open]:rotate-180';

// Enter and exit through the semantic layer. These are transitions rather than
// animations, so both endpoints are stated -- an animation brings its own start
// frame and a transition does not.
//
// Scale is available here, unlike on popover: nothing writes an inline
// style.transform to this element, so the zoom the old dead classes intended can
// actually run. motion-dropdown-in already transitions transform alongside
// opacity, so the endpoints below need no extra declaration to move.
//
// `starting:` supplies the from-value. SelectContent keeps the listbox mounted
// and toggles `hidden` (select.tsx:367), so it comes back out of display:none
// with the open state already applied and nothing to interpolate from; the
// @starting-style block is what gives the first frame something to leave.
const contentClasses =
  'z-depth-dropdown max-h-96 min-w-32 overflow-hidden rounded-md border bg-popover ' +
  'text-popover-foreground shadow-md ' +
  'data-[state=open]:motion-dropdown-in data-[state=closed]:motion-dropdown-out ' +
  'starting:opacity-0 starting:scale-95 ' +
  'data-[state=open]:opacity-100 data-[state=closed]:opacity-0 ' +
  'data-[state=open]:scale-100 data-[state=closed]:scale-95';

const viewportClasses = 'p-1';

const itemClasses =
  'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 ' +
  'text-body-small outline-none ' +
  'focus:bg-accent focus:text-accent-foreground ' +
  'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground ' +
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

const itemIndicatorClasses = 'absolute left-2 flex h-3.5 w-3.5 items-center justify-center';

const itemTextClasses = 'truncate';

const groupClasses = 'p-1';

const labelClasses = 'py-1.5 pl-8 pr-2 text-label-medium text-muted-foreground';

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
