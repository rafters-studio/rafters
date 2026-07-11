import { resolveFillName } from '../../primitives/fill-resolver';
import type { ProgressConfig, ProgressSize, ProgressState } from './progress.behavior';

export interface ProgressClassSet {
  root: string;
  indicator: string;
}

const trackClasses = 'relative w-full overflow-hidden rounded-full bg-muted';

const sizeClasses: Record<ProgressSize, string> = {
  sm: 'h-1',
  default: 'h-2',
  lg: 'h-3',
};

/** Indeterminate keys off the projected `data-state`, never a hand-rolled
 *  ternary here -- boundary 6 corollary. */
const indicatorBaseClasses =
  'h-full transition-all duration-300 motion-reduce:transition-none ' +
  'data-[state=indeterminate]:animate-progress-indeterminate ' +
  'data-[state=indeterminate]:motion-reduce:animate-none';

export function progressClasses(config: ProgressConfig, _state: ProgressState): ProgressClassSet {
  const size = config.size ?? 'default';
  return {
    root: `${trackClasses} ${sizeClasses[size]}`,
    indicator: `${indicatorBaseClasses} ${resolveFillName(config.fill ?? 'primary', 'surface')}`,
  };
}
