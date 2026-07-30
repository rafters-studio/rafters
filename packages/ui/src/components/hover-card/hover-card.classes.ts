import type { HoverCardConfig, HoverCardState } from './hover-card.behavior';

export interface HoverCardClassSet {
  trigger: string;
  content: string;
}

// The trigger is a bare inline anchor: the consumer's link keeps its own type,
// underline, and focus affordances. Hover-card adds no chrome to it.
const triggerClasses = 'inline-flex';

// The preview panel sits on the popover depth token (not a raw z-index) and fills
// with the popover surface tokens. Enter runs through motion-dropdown-in, which
// carries the tier and the curve, so no duration or easing is written here, and
// which handles prefers-reduced-motion inside its own definition -- a
// motion-reduce guard on this element would fight that rather than reinforce it.
//
// OPACITY ONLY, deliberately. positionHoverCard applies placement as an inline
// style.transform (hover-card.behavior.ts:140), and an inline style outranks any
// class-declared transform, so scale and directional slide cannot move this panel.
// The old zoom and slide classes could never have worked here even had they been
// defined. Restoring them means moving placement onto a wrapper first.
//
// ENTER ONLY, also deliberately. This component does not use usePresence, so the
// content unmounts the instant it closes and there is no closed frame to
// transition through -- a data-[state=closed] utility would be a class that
// resolves and never runs. Exit belongs with the Presence adapter, not here.
//
// `starting:` supplies the from-value: the panel mounts on open, so it arrives
// with the open state already applied and nothing to interpolate away from.
const contentClasses =
  'z-depth-popover w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-lg outline-none ' +
  'data-[state=open]:motion-dropdown-in ' +
  'starting:opacity-0 data-[state=open]:opacity-100';

export function hoverCardClasses(
  _config: HoverCardConfig,
  _state: HoverCardState,
): HoverCardClassSet {
  return {
    trigger: triggerClasses,
    content: contentClasses,
  };
}
