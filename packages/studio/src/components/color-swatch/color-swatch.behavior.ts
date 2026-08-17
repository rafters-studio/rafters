import type { BehaviorSpec } from '@rafters/ui/lib/contract';

export type ColorSwatchSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ColorSwatchConfig {
  size?: ColorSwatchSize | undefined;
}

export type ColorSwatchState = Record<never, never>;
export type ColorSwatchActions = Record<never, never>;
export type ColorSwatchPart = 'root';

export const colorSwatch: BehaviorSpec<
  ColorSwatchConfig,
  ColorSwatchState,
  ColorSwatchActions,
  ColorSwatchPart
> = {
  name: 'color-swatch',
  parts: { root: {} },
  initialState: () => ({}),
  actions: {},
  canDispatch: () => true,
  aria: () => ({ root: {} }),
  keymap: () => null,
};
