import type { ScaleStripConfig, ScaleStripState } from './scale-strip.behavior';

export interface ScaleStripClassSet {
  root: string;
  stop: string;
  stopHighlighted: string;
}

export function scaleStripClasses(
  _config: ScaleStripConfig,
  _state: ScaleStripState,
): ScaleStripClassSet {
  return {
    root: 'flex gap-0.5',
    stop: 'size-8 rounded-sm',
    stopHighlighted: 'size-8 rounded-sm ring-2 ring-ring ring-offset-1',
  };
}
