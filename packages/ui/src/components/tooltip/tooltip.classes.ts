import type { TooltipConfig, TooltipState } from './tooltip.behavior';

export interface TooltipClassSet {
  trigger: string;
  content: string;
}

// The DOM-native root is a binding host, not a box: it carries data-part="root"
// and the config, and NO class -- a behavior root never styles itself; layout
// belongs to the consumer's Container/Grid (operator ruling, 2026-08-02). With
// no class the unclassed <div> root is a BLOCK box: a tooltip is composed by
// Container, not dropped mid-sentence into running text.

// Inside that root the trigger is still inline-flex -- that is the button's own
// box, not the root's, and it keeps the label and any icon on one line.
const triggerClasses = 'inline-flex';

// z-depth-tooltip is the semantic depth token (not a raw z-index); fill uses
// the foreground surface with background-colored text for the classic inverted
// tip. transition-opacity carries the declared fade intent; reduced motion
// drops it.
const contentClasses =
  'z-depth-tooltip w-fit overflow-hidden rounded-md bg-foreground px-3 py-1.5 ' +
  'ts-body-small text-background shadow-lg ' +
  'transition-opacity duration-150 motion-reduce:transition-none ' +
  'data-[state=closed]:opacity-0 data-[state=open]:opacity-100';

export function tooltipClasses(_config: TooltipConfig, _state: TooltipState): TooltipClassSet {
  return {
    trigger: triggerClasses,
    content: contentClasses,
  };
}
