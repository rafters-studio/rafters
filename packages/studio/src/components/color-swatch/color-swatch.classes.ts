import type { ColorSwatchConfig, ColorSwatchSize, ColorSwatchState } from './color-swatch.behavior';

export interface ColorSwatchClassSet {
  root: string;
}

const sizeClasses: Record<ColorSwatchSize, string> = {
  sm: 'w-8 h-8 rounded-md',
  md: 'w-16 h-16 rounded-lg',
  lg: 'w-32 h-32 rounded-lg',
  xl: 'w-full aspect-square rounded-xl',
};

export function colorSwatchClasses(
  config: ColorSwatchConfig,
  _state: ColorSwatchState,
): ColorSwatchClassSet {
  const size = config.size ?? 'xl';
  return { root: `${sizeClasses[size]} border border-card-border` };
}
