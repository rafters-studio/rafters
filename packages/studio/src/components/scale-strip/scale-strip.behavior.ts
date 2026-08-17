import type { BehaviorSpec } from '@rafters/ui/lib/contract';

export interface ScaleStripConfig {
  highlight?: number | undefined;
}

export type ScaleStripState = Record<never, never>;
export type ScaleStripActions = Record<never, never>;
export type ScaleStripPart = 'root' | 'stop';

export const scaleStrip: BehaviorSpec<
  ScaleStripConfig,
  ScaleStripState,
  ScaleStripActions,
  ScaleStripPart
> = {
  name: 'scale-strip',
  parts: { root: {}, stop: { many: true } },
  initialState: () => ({}),
  actions: {},
  canDispatch: () => true,
  aria: () => ({ root: {} }),
  keymap: () => null,
};
