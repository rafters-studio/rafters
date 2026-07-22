import type { ResizableConfig, ResizableDirection, ResizableState } from '@/components/ui/resizable.behavior';

export interface ResizableClassSet {
  root: string;
  panel: string;
  handle: string;
  grip: string;
  gripIcon: string;
}

// The group is a flex container; the axis maps directly to flex-direction.
const baseRootClasses = 'flex h-full w-full';

const rootDirectionClasses: Record<ResizableDirection, string> = {
  horizontal: 'flex-row',
  vertical: 'flex-col',
};

// Panels do not grow/shrink; their flex-basis carries the percent the score
// paints. `overflow-hidden` keeps content from spilling past a shrunk panel.
const basePanelClasses = 'relative grow-0 shrink-0 overflow-hidden';

// The handle presentation rides the projected data-attributes (data-disabled,
// data-dragging), not swapped strings: one class set covers every state and the
// CSS reads the flags -- so light-DOM markup, the WC, and React look identical.
// Motion is left undeclared: no semantic motion token exists yet for a
// separator hover/focus transition (the raw duration the oracle used is
// prohibited), so the focus ring and drag colour swap apply instantly.
const baseHandleClasses =
  'relative flex items-center justify-center bg-border ' +
  'after:absolute after:inset-y-0 after:left-1/2 after:-translate-x-1/2 ' +
  'hover:bg-muted ' +
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 ' +
  'data-[dragging]:bg-primary ' +
  'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50';

const handleDirectionClasses: Record<ResizableDirection, string> = {
  horizontal: 'w-px cursor-col-resize after:w-1',
  vertical: 'h-px cursor-row-resize after:h-1',
};

// The optional grip affordance (withHandle) -- a small draggable-looking chip.
const baseGripClasses = 'z-10 flex items-center justify-center rounded-sm border bg-border';

const gripDirectionClasses: Record<ResizableDirection, string> = {
  horizontal: 'h-4 w-3',
  vertical: 'h-3 w-4',
};

const baseGripIconClasses = 'size-2.5';

export function resizableClasses(
  config: ResizableConfig,
  _state?: ResizableState,
): ResizableClassSet {
  const { direction } = config;
  return {
    root: `${baseRootClasses} ${rootDirectionClasses[direction]}`,
    panel: basePanelClasses,
    handle: `${baseHandleClasses} ${handleDirectionClasses[direction]}`,
    grip: `${baseGripClasses} ${gripDirectionClasses[direction]}`,
    gripIcon: direction === 'horizontal' ? `${baseGripIconClasses} rotate-90` : baseGripIconClasses,
  };
}
