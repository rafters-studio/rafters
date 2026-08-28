import type { ContextMenuConfig, ContextMenuState } from './context-menu.behavior';

/**
 * The view for context-menu: class strings only, no logic. Motion rides the
 * semantic motion tokens (Spec 05): the content enters on `motion-dropdown-in`
 * (fade + zoom, the dropdown tier), and item highlight rides `motion-focus`.
 * No raw numeric durations or hand-picked easings -- the tokens encode timing,
 * curve, and the prefers-reduced-motion degradation. Fill, not background:
 * bg-popover/text-popover-foreground are the popover surface tokens; the depth
 * token (z-depth-dropdown) replaces a raw z-index.
 *
 * Exit motion (`motion-dropdown-out`) is intentionally NOT declared: the content
 * toggles `hidden` when closed, so the exiting node leaves the box model before
 * an out transition can play. A played exit awaits the Presence layer (Spec 04);
 * declaring it now would be a silent no-op.
 */
export interface ContextMenuClassSet {
  trigger: string;
  content: string;
  item: string;
  checkboxItem: string;
  radioItem: string;
  subTrigger: string;
  subTriggerChevron: string;
  itemIndicator: string;
  checkIcon: string;
  radioDot: string;
  label: string;
  separator: string;
  shortcut: string;
  group: string;
}

const trigger = 'inline-block';

const content =
  'z-depth-dropdown min-w-32 overflow-hidden rounded-md border bg-popover p-1 ' +
  'text-popover-foreground shadow-lg outline-none ' +
  'motion-dropdown-in opacity-0 scale-95 data-[state=open]:opacity-100 data-[state=open]:scale-100';

// STAGGER (#2156): motion.jsonl:42 (context-menu | items | enter) declares
// delay generic `stagger-step`, zero by default (defaults.ts:1758 -- "efficient
// does not stagger lists"). `delay-stagger-step` is the generated consumption
// of that cell: a flat `transition-delay`, wrapping the --rafters-delay-stagger-step
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
const itemBase =
  'relative flex cursor-default select-none items-center rounded-sm text-body-small ts-body-small outline-none ' +
  'delay-stagger-step ' +
  'motion-focus focus:bg-accent focus:text-accent-foreground ' +
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

const item = `${itemBase} gap-2 px-2 py-1.5`;

const checkboxItem = `${itemBase} py-1.5 pl-8 pr-2`;

const radioItem = `${itemBase} py-1.5 pl-8 pr-2`;

// The sub-trigger is a menuitem that also stays highlighted while its submenu is
// open (data-[state=open]).
const subTrigger = `${itemBase} gap-2 px-2 py-1.5 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground`;

const subTriggerChevron = 'ml-auto h-4 w-4';

const itemIndicator = 'absolute left-2 flex h-3.5 w-3.5 items-center justify-center';

const checkIcon = 'h-4 w-4';

const radioDot = 'h-2 w-2 rounded-full bg-current';

const label = 'px-2 py-1.5 text-label-medium ts-label-medium';

const separator = '-mx-1 my-1 h-px border-0 bg-muted';

const shortcut = 'ml-auto text-shortcut ts-shortcut opacity-60';

const group = '';

export function contextMenuClasses(
  _config: ContextMenuConfig,
  _state: ContextMenuState,
): ContextMenuClassSet {
  return {
    trigger,
    content,
    item,
    checkboxItem,
    radioItem,
    subTrigger,
    subTriggerChevron,
    itemIndicator,
    checkIcon,
    radioDot,
    label,
    separator,
    shortcut,
    group,
  };
}
