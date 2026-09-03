import type { ButtonConfig, ButtonSize, ButtonState, ButtonVariant } from './button.behavior';

export interface ButtonClassSet {
  root: string;
  spinner: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  default:
    'bg-primary text-primary-foreground ' +
    'hover:bg-primary-hover active:bg-primary-active ' +
    'focus-visible:ring-2 focus-visible:ring-primary-ring',
  primary:
    'bg-primary text-primary-foreground ' +
    'hover:bg-primary-hover active:bg-primary-active ' +
    'focus-visible:ring-2 focus-visible:ring-primary-ring',
  secondary:
    'bg-secondary text-secondary-foreground ' +
    'hover:bg-secondary-hover active:bg-secondary-active ' +
    'focus-visible:ring-2 focus-visible:ring-secondary-ring',
  destructive:
    'bg-destructive text-destructive-foreground ' +
    'hover:bg-destructive-hover active:bg-destructive-active ' +
    'focus-visible:ring-2 focus-visible:ring-destructive-ring',
  success:
    'bg-success text-success-foreground ' +
    'hover:bg-success-hover active:bg-success-active ' +
    'focus-visible:ring-2 focus-visible:ring-success-ring',
  warning:
    'bg-warning text-warning-foreground ' +
    'hover:bg-warning-hover active:bg-warning-active ' +
    'focus-visible:ring-2 focus-visible:ring-warning-ring',
  info:
    'bg-info text-info-foreground ' +
    'hover:bg-info-hover active:bg-info-active ' +
    'focus-visible:ring-2 focus-visible:ring-info-ring',
  muted:
    'bg-muted text-muted-foreground ' +
    'hover:bg-muted-hover active:bg-muted-active ' +
    'focus-visible:ring-2 focus-visible:ring-ring',
  accent:
    'bg-accent text-accent-foreground ' +
    'hover:bg-accent-hover active:bg-accent-active ' +
    'focus-visible:ring-2 focus-visible:ring-accent-ring',
  outline:
    'border border-input bg-transparent text-foreground ' +
    'hover:bg-accent hover:text-accent-foreground ' +
    'focus-visible:ring-2 focus-visible:ring-ring',
  ghost:
    'bg-transparent text-foreground ' +
    'hover:bg-accent hover:text-accent-foreground ' +
    'focus-visible:ring-2 focus-visible:ring-ring',
  link:
    'text-primary underline-offset-4 ' +
    'hover:underline ' +
    'focus-visible:ring-2 focus-visible:ring-ring',
};

const sizeClasses: Record<ButtonSize, string> = {
  default: 'h-11 px-4 py-2.5 @md:h-10 @md:py-2',
  xs: 'h-11 px-3 text-label-small ts-label-small @md:h-6 @md:px-2',
  sm: 'h-11 px-4 text-label-small ts-label-small @md:h-8 @md:px-3',
  lg: 'h-12 px-6 text-label-large ts-label-large',
  icon: 'h-11 w-11 @md:h-10 @md:w-10',
  'icon-xs': 'h-11 w-11 @md:h-6 @md:w-6',
  'icon-sm': 'h-11 w-11 @md:h-8 @md:w-8',
  'icon-lg': 'h-12 w-12',
};

// Motion is the matrix's, transcribed (#2272). Three rows land on this file.
//
// ROOT / HOVER -- "color + elevation" (background/text/border, box-shadow) at
// duration-fast, ease-standard. The element stays put, so it is a transition,
// and the transition-property list names the row's own properties rather than
// the shorthand colour utility, which omits box-shadow.
//
// ROOT / PRESS -- "zoom + color" at duration-micro, ease-spring-snappy,
// extent-press. The zoom half rides the extent namespace exactly as
// context-menu's subContent rides extent-pop: `extent-press` picks the member
// (writing the `--rafters-consumed-extent` alias) and
// `scale-(--rafters-consumed-extent)` reads the alias back, never the leaf.
// `scale-100` is the resting geometry so there is a value to interpolate from.
//
// Duration and curve are scoped to `active:` and the transition-property list
// is declared ONCE on the base: Tailwind's own `transition-*` utilities restate
// transition-duration from `var(--tw-duration, ...)` while this repo's
// `duration-*` utilities set the longhand, so a transition-property utility
// sorting after a duration would silently collapse the cell onto Tailwind's
// default (test/motion/reveal-candidates.test.ts). Scoping only duration/ease
// keeps every variant out of that ordering question. Press-in therefore runs at
// micro/spring-snappy and release settles on the base hover pair -- the same
// "whichever rule you transition INTO owns the timing" convention context-menu
// records.
//
// No `motion-reduce:` escape: the reduced-motion zero is written once on the
// token leaves (packages/design-tokens/src/exporters/tailwind.ts,
// REDUCED_MOTION_ZEROED), and a component-level escape fights it.
const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-md text-label-large ts-label-large cursor-pointer ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
  'transition-[color,background-color,border-color,box-shadow,scale] duration-fast ease-standard ' +
  'scale-100 extent-press ' +
  'active:scale-(--rafters-consumed-extent) active:duration-micro active:ease-spring-snappy ' +
  'disabled:opacity-50 disabled:cursor-not-allowed ' +
  'aria-disabled:opacity-50 aria-disabled:cursor-not-allowed ' +
  'aria-busy:cursor-progress';

// CONTENT / IDLE <-> BUSY -- "swap (label <-> spinner) + fade" at duration-fast,
// ease-standard, marked `proposed` (unreviewed) in motion.jsonl.
//
// The row and the component disagree about the swap, and the disagreement is
// reported rather than resolved: button.tsx renders the spinner ALONGSIDE the
// label (both are children of the root; the label never leaves), so there is no
// label <-> spinner swap to time. The moment that does exist is the spinner
// arriving and leaving, which is the row's fade half, and that is what is
// consumed here.
//
// The fade is a transition, not a keyframe, because the loop already owns
// `animation` on this node: two animate-* utilities compile to the same
// property at the same specificity, so declaring both would leave exactly one
// of them running -- silently. So the row's tier and curve are named on the
// property the row moves, and the browser does the rest once something drives
// that property.
//
// NEITHER DIRECTION PLAYS TODAY, and the reason is the same on both sides: the
// spinner is mounted and unmounted outright, so it is outside the box model
// before an entrance or exit transition can run. Presence is the layer that
// fixes this -- it holds a node until its own animations settle -- and the
// matrix rules out the shortcut explicitly: "No @starting-style dependency; it
// is not trusted outside Tailwind's pipeline" (motion.md, Presence). A
// @starting-style rule would compile cleanly and pass every candidate sweep
// while running nowhere, which is worse than an undeclared moment.
//
// SPINNER / BUSY LOOP -- the loop is spinner/root/busy's cell, `animate-spin-spin`
// (keyframe `spin`, period `spin`). It replaces stock Tailwind's spin utility,
// whose 1s cycle is a literal outside the leaf layer, and the reduced-motion
// escape that rode with it: `period` is deliberately absent from
// REDUCED_MOTION_ZEROED because a work loop slows, it never stops -- a stopped
// spinner says the work stopped.
//
// Neither of those two names is spelled out above, deliberately: Tailwind
// extracts candidates from this file's whole SOURCE TEXT, comments included, so
// naming a utility in prose ships its rule to every consumer that installs the
// component. A comment about a class we deleted must not resurrect it.
const spinnerClasses =
  'h-5 w-5 @md:h-4 @md:w-4 animate-spin-spin transition-opacity duration-fast ease-standard';

export function buttonClasses(config: ButtonConfig, _state: ButtonState): ButtonClassSet {
  return {
    root: `${baseClasses} ${variantClasses[config.variant]} ${sizeClasses[config.size]}`,
    spinner: spinnerClasses,
  };
}

export function buttonVariants(
  options: { variant?: ButtonVariant; size?: ButtonSize } = {},
): string {
  return `${baseClasses} ${variantClasses[options.variant ?? 'default']} ${sizeClasses[options.size ?? 'default']}`;
}
