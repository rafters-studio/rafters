import type { SeparatorConfig, SeparatorOrientation, SeparatorState } from './separator.behavior';

export interface SeparatorClassSet {
  root: string;
}

/** shrink-0 keeps the line from collapsing when a flex/grid ancestor
 *  squeezes it; bg-border paints the hairline itself (there is no edge to
 *  stroke a border ON -- the line IS the fill). */
const baseClasses = 'shrink-0 bg-border';

const orientationClasses: Record<SeparatorOrientation, string> = {
  horizontal: 'h-px w-full',
  vertical: 'h-full w-px',
};

export function separatorClasses(
  config: SeparatorConfig,
  _state: SeparatorState,
): SeparatorClassSet {
  const orientation = config.orientation ?? 'horizontal';
  return { root: `${baseClasses} ${orientationClasses[orientation]}` };
}
