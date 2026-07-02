import { compose, type GlueSlice, type Slice } from '../../lib/compose';
import type { BehaviorSpec } from '../../lib/contract';
import {
  disclosable,
  isOpen,
  type DisclosableActions,
  type DisclosableConfig,
  type DisclosablePart,
  type DisclosableState,
} from '../../lib/disclosable';

export interface DialogConfig extends DisclosableConfig {
  /** Modal dialogs trap focus, lock scroll, and dismiss on outside
   *  pointerdown. Default: true. */
  modal?: boolean | undefined;
}

export type DialogState = DisclosableState;
export type DialogActions = DisclosableActions;

export type DialogSurfacePart = 'overlay' | 'title' | 'description' | 'close';
export type DialogPart = DisclosablePart | DialogSurfacePart;

export { isOpen };

function isModal(config: DialogConfig): boolean {
  return config.modal !== false;
}

/** Structure-only slice: the parts a dialog has beyond the disclosable
 *  trigger/content pair. Contributes no state and no actions. */
const dialogSurface: Slice<
  DialogConfig,
  Record<never, never>,
  Record<never, never>,
  DialogSurfacePart
> = {
  name: 'dialog-surface',
  parts: {
    overlay: { optional: true },
    title: { optional: true },
    description: { optional: true },
    close: { optional: true },
  },
  initialState: () => ({}),
};

/** The dialog glue: ARIA identity, the Escape contract, and the modal
 *  effect set, written over the merged state. */
const dialogGlue: GlueSlice<DialogConfig, DialogState, { close: undefined }, DialogPart> = {
  kind: 'glue',
  name: 'dialog',
  aria: (state, config, ids) => {
    const open = isOpen(state, config);
    return {
      trigger: {
        'aria-haspopup': 'dialog',
      },
      content: {
        role: 'dialog',
        'aria-modal': isModal(config) ? 'true' : undefined,
        // An empty id means the binding did not render that part; a
        // reference to a missing id is an axe violation, so project absence.
        'aria-labelledby': ids.title || undefined,
        'aria-describedby': ids.description || undefined,
      },
      overlay: {
        'aria-hidden': 'true',
        'data-state': open ? 'open' : 'closed',
      },
      close: {
        'aria-label': 'Close',
      },
    };
  },
  keymap: (event, _state, part) => (part === 'content' && event.key === 'Escape' ? 'close' : null),
  effects: (state, config) => {
    if (!isOpen(state, config) || !isModal(config)) return [];
    return [
      { type: 'focus-trap', part: 'content' },
      { type: 'scroll-lock' },
      {
        type: 'dismiss-on-outside',
        part: 'content',
        action: 'close',
        // Without this, pointerdown on the trigger dismisses the layer and
        // the same gesture's click re-opens it (live defect in the oracle).
        exceptParts: ['trigger'],
      },
    ];
  },
};

export const dialog: BehaviorSpec<DialogConfig, DialogState, DialogActions, DialogPart> = compose(
  'dialog',
  disclosable<DialogConfig>(),
  dialogSurface,
  dialogGlue,
);
