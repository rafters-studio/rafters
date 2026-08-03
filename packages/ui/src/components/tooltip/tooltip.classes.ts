import type { TooltipConfig, TooltipState } from './tooltip.behavior';

export interface TooltipClassSet {
  root: string;
  trigger: string;
  content: string;
}

// The DOM-native root is a binding host, not a box: it carries data-part="root"
// and the config, and its two children (an inline-flex trigger and a fixed-
// positioned tip) place themselves. `contents` removes the wrapper box entirely
// so the trigger flows in the consumer's layout exactly as an unwrapped button
// would -- the layout-neutral answer to the display:inline hazard in #2004.
const rootClasses = 'contents';

const triggerClasses = 'inline-flex';

// z-depth-tooltip is the semantic depth token (not a raw z-index); fill uses
// the foreground surface with background-colored text for the classic inverted
// tip. transition-opacity carries the declared fade intent; reduced motion
// drops it.
const contentClasses =
  'z-depth-tooltip w-fit overflow-hidden rounded-md bg-foreground px-3 py-1.5 ' +
  'text-body-small text-background shadow-lg ' +
  'transition-opacity duration-150 motion-reduce:transition-none ' +
  'data-[state=closed]:opacity-0 data-[state=open]:opacity-100';

export function tooltipClasses(_config: TooltipConfig, _state: TooltipState): TooltipClassSet {
  return {
    root: rootClasses,
    trigger: triggerClasses,
    content: contentClasses,
  };
}
