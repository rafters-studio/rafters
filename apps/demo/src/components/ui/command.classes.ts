import type { CommandConfig, CommandState } from '@/components/ui/command.behavior';

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

// THE ROW: command / items / highlight move -- color, duration-micro,
// ease-standard (motion.md:200), PROPOSED and unreviewed, transcribed as
// written. `transition-colors` was already here with NO tier and no curve, so
// it ran on Tailwind's built-in 150ms -- the #1955 trap, a literal that never
// appears in the file. A transition, not a keyframe (`command | items |
// highlight move`, EXCLUDED_ROWS.noIntersectingProperty in
// packages/design-tokens/test/motion-cells.test.ts).
//
// THE SECOND ROW: command / items / enter -- fade (with content), which assigns
// `delay-stagger-step` and no duration and no curve (motion.jsonl:66).
// `duration: {"kind":"none"}` means no DURATION is assigned, not that nothing
// is: the delay generic is the entire assignment, and naming it is the whole
// consumption. The fade is the content keyframe's; this class carries only the
// offset, which resolves to 0ms at the efficient intent. Zero is the
// assignment, not a gap -- see dropdown-menu's items class for the full note,
// including the per-element `transition-delay` coupling with the row above.
//
// ONE ROW WITH NO CONSUMABLE FORM HERE, reported rather than faked:
//
//   command / items / filter change -- fade + swap, micro, standard
//   (motion.md:201), also PROPOSED. Filtering toggles the `hidden` ATTRIBUTE
//   (commandItemAria, command.behavior.ts:209), i.e. display:none, and fading
//   across display:none needs `transition-behavior: allow-discrete` plus
//   `@starting-style` -- which the presence ruling forbids outright ("no
//   @starting-style dependency; it is not trusted outside Tailwind's pipeline",
//   motion.md:84). The matrix's own INPUT RULE points the same way: layout
//   driven by the user's own typing tracks instantly (motion.md:91-94), and this
//   filter runs per keystroke. Both readings say the row wants a second look
//   before a component animates a person's own hands.
const itemClasses =
  'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 ' +
  'text-body-small ts-body-small outline-none ' +
  'transition-colors duration-micro ease-standard delay-stagger-step motion-reduce:transition-none ' +
  'data-[selected]:bg-accent data-[selected]:text-accent-foreground ' +
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

const separatorClasses = '-mx-1 h-px bg-border';

const shortcutClasses = 'ml-auto text-shortcut ts-shortcut tracking-widest text-muted-foreground';

// The dialog wrapper is the overlay variant -- the palette itself, and so the
// `content` part motion.jsonl names. The comment here used to cite
// `motion-modal-in/-out` as tokens that "do not exist yet"; those thirteen
// semantic classes were deleted by ruling (2026-08-02) and are not coming.
//
// THE BACKDROP HAS NO ROW. dialog, sheet and drawer each carry an explicit
// `overlay` pair; command does not, so nothing is declared for the scrim rather
// than borrowing a sibling's tier. Reported, not filled in.
const dialogBackdropClasses = 'fixed inset-0 z-depth-overlay bg-foreground/80';

// THE CELL IS THE SPEC. These two utilities are the generated consumption of
// command / content / closed -> open (moderate, enter) and open -> closed
// (fast, exit) -- motion.md:197-198, emitted as `command-content-open` /
// `-close`. FADE ALONE, no zoom: command is the one anchored-popup row that
// declares no `extent-pop`, so there is no `scale-*` here and that absence is
// the matrix's judgement, not an omission.
//
// ONE KNOWN LIMIT, reported not papered over: neither cell can run today.
// `CommandDialog` sets no `data-state` at all and returns `null` the moment
// `open` goes false (command.tsx:229), so the open selector never matches and
// the closed one has no node left to match. Every sibling popup reaches
// `data-state` through its behavior's `aria.content` projection; command's
// score has no dialog part to project one from. Wiring it is a
// behavior/view change outside this file's scope -- the classes name the right
// cells on the right part and start running the moment it lands.
const dialogContentClasses =
  'fixed left-1/2 top-1/2 z-depth-modal w-full max-w-lg -translate-x-1/2 -translate-y-1/2 ' +
  'overflow-hidden rounded-lg border bg-popover shadow-lg ' +
  'data-[state=open]:animate-fade-in-moderate-enter ' +
  'data-[state=closed]:animate-fade-out-fast-exit ' +
  'data-[state=closed]:pointer-events-none';

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
