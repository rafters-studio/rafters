import type { PopoverConfig, PopoverState } from './popover.behavior';

export interface PopoverClassSet {
  root: string;
  content: string;
  close: string;
  closeIcon: string;
}

// The DOM-native root is a binding host, not a box: it carries data-part="root"
// and the config, and its two children (the trigger button and a fixed-
// positioned panel) place themselves. `contents` removes the wrapper box so the
// trigger flows in the consumer's layout exactly as an unwrapped button would --
// the layout-neutral answer to the display:inline hazard in #2004.
const rootClasses = 'contents';

// Ported from the old popover.classes.ts. The panel sits on the popover depth
// token, fills with the popover surface tokens, and animates enter/exit with
// fade + zoom, sliding from the resolved side. motion-reduce disables it.
const contentClasses =
  'z-depth-popover w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-lg outline-none ' +
  'transition-all duration-200 motion-reduce:transition-none ' +
  'data-[state=open]:animate-in data-[state=closed]:animate-out ' +
  'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ' +
  'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 ' +
  'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 ' +
  'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2';

// The optional in-panel dismiss control. Sized to the touch floor, scaling
// down through the container query, echoing dialog's close affordance.
const closeClasses =
  'absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center ' +
  '@md:right-4 @md:top-4 @md:h-8 @md:w-8 ' +
  'rounded-sm opacity-70 ring-offset-background cursor-pointer ' +
  'transition-opacity duration-150 motion-reduce:transition-none hover:opacity-100 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const closeIconClasses = 'h-5 w-5 @md:h-4 @md:w-4';

export function popoverClasses(_config: PopoverConfig, _state: PopoverState): PopoverClassSet {
  return {
    root: rootClasses,
    content: contentClasses,
    close: closeClasses,
    closeIcon: closeIconClasses,
  };
}
