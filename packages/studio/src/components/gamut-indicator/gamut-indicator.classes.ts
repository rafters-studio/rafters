import type { GamutIndicatorConfig, GamutIndicatorState } from './gamut-indicator.behavior';

export interface GamutIndicatorClassSet {
  root: string;
  on: string;
  off: string;
  separator: string;
}

export function gamutIndicatorClasses(
  _config: GamutIndicatorConfig,
  _state: GamutIndicatorState,
): GamutIndicatorClassSet {
  return {
    root: 'flex items-center justify-center rounded-sm border border-current px-2 py-0.5 text-label-small ts-label-small',
    on: 'text-success',
    off: 'opacity-40',
    separator: 'border-current px-1',
  };
}
