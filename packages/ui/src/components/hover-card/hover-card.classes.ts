import type { HoverCardConfig, HoverCardState } from './hover-card.behavior';

export interface HoverCardClassSet {
  trigger: string;
  content: string;
}

// The DOM-native root is a binding host, not a box: it carries data-part="root"
// and the config, and NO class -- a behavior root never styles itself; layout
// belongs to the consumer's Container/Grid (operator ruling, 2026-08-02). With
// no class the unclassed <div> root is a BLOCK box, so a hover-card is composed
// by Container like any other component -- it is not dropped mid-sentence into
// running text.

// Inside that root the trigger is still an inline-flex anchor: the consumer's
// link keeps its own type, underline, and focus affordances, and hover-card
// adds no chrome to it.
const triggerClasses = 'inline-flex';

// The preview panel sits on the popover depth token (not a raw z-index), fills
// with the popover surface tokens (fill, not background props), and animates
// enter-only with fade + zoom, sliding from the resolved side. Exit animation
// waits on Presence (wave 0-B); motion-reduce disables the enter animation.
const contentClasses =
  'z-depth-popover w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-lg outline-none ' +
  'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 ' +
  'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 ' +
  'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ' +
  'motion-reduce:animate-none';

export function hoverCardClasses(
  _config: HoverCardConfig,
  _state: HoverCardState,
): HoverCardClassSet {
  return {
    trigger: triggerClasses,
    content: contentClasses,
  };
}
