import type { BehaviorSpec } from '@rafters/ui/lib/contract';

export interface WcagMatrixConfig {
  showLabels?: boolean | undefined;
}

export type WcagMatrixState = Record<never, never>;
export type WcagMatrixActions = Record<never, never>;
export type WcagMatrixPart = 'root' | 'header' | 'row' | 'cell';

export const wcagMatrix: BehaviorSpec<
  WcagMatrixConfig,
  WcagMatrixState,
  WcagMatrixActions,
  WcagMatrixPart
> = {
  name: 'wcag-matrix',
  parts: {
    root: {},
    header: {},
    row: { many: true },
    cell: { many: true },
  },
  initialState: () => ({}),
  actions: {},
  canDispatch: () => true,
  aria: () => ({ root: { role: 'table' } }),
  keymap: () => null,
};
