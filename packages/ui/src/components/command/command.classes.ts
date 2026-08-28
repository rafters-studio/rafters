import type { CommandConfig, CommandState } from './command.behavior';

export interface CommandClassSet {
  root: string;
  inputWrapper: string;
  inputIcon: string;
  input: string;
  list: string;
  empty: string;
  group: string;
  groupHeading: string;
  item: string;
  separator: string;
  shortcut: string;
  dialogBackdrop: string;
  dialogContent: string;
}

const rootClasses =
  'flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground';

const inputWrapperClasses = 'flex items-center gap-2 border-b px-3';

const inputIconClasses = 'size-4 shrink-0 opacity-50';

const inputClasses =
  'flex h-11 @md:h-10 w-full rounded-md bg-transparent py-3 text-body-small ts-body-small outline-none ' +
  'placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50';

const listClasses = 'max-h-80 overflow-y-auto overflow-x-hidden p-1';

const emptyClasses = 'py-6 text-center text-body-small ts-body-small';

const groupClasses = 'overflow-hidden p-1 text-foreground';

const groupHeadingClasses = 'px-2 py-1.5 text-label-small ts-label-small text-muted-foreground';

// STAGGER (#2156): motion.jsonl:66 (command | items | enter) declares delay
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
  'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 ' +
  'text-body-small ts-body-small outline-none transition-colors motion-reduce:transition-none ' +
  'delay-stagger-step ' +
  'data-[selected]:bg-accent data-[selected]:text-accent-foreground ' +
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

const separatorClasses = '-mx-1 h-px bg-border';

const shortcutClasses = 'ml-auto text-shortcut ts-shortcut tracking-widest text-muted-foreground';

// The dialog wrapper is the overlay variant. Enter/exit motion is intentionally
// left undeclared: the semantic motion tokens (motion-modal-in/-out, #1899) do
// not exist yet, and the issue directs leaving motion undeclared over hardcoding
// a raw duration.
const dialogBackdropClasses = 'fixed inset-0 z-depth-overlay bg-foreground/80';

const dialogContentClasses =
  'fixed left-1/2 top-1/2 z-depth-modal w-full max-w-lg -translate-x-1/2 -translate-y-1/2 ' +
  'overflow-hidden rounded-lg border bg-popover shadow-lg';

export function commandClasses(_config: CommandConfig, _state: CommandState): CommandClassSet {
  return {
    root: rootClasses,
    inputWrapper: inputWrapperClasses,
    inputIcon: inputIconClasses,
    input: inputClasses,
    list: listClasses,
    empty: emptyClasses,
    group: groupClasses,
    groupHeading: groupHeadingClasses,
    item: itemClasses,
    separator: separatorClasses,
    shortcut: shortcutClasses,
    dialogBackdrop: dialogBackdropClasses,
    dialogContent: dialogContentClasses,
  };
}
