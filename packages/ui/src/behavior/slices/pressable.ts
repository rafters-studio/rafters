/**
 * pressable -- the button-family slice.
 *
 * Owns activation state (disabled / soft-disabled / loading / pressed) and
 * the press action. The double-submission guard, the soft-disabled no-op,
 * and the loading ARIA all live here; framework bindings only wire events.
 *
 * Toggle mode is encoded into state at initialState time (pressed becomes a
 * boolean instead of undefined), so reducers stay config-free.
 */
import type { AriaAttrs, PartDecl } from '../contract';
import type { Slice } from '../compose';
import type { EffectSpec } from '../effects';

export interface PressableConfig {
  /** aria-pressed toggle mode. */
  toggle?: boolean | undefined;
  /** Live-region message when loading begins. Default "Loading". */
  loadingAnnouncement?: string | undefined;
  /** Live-region message when loading ends. Default: none. */
  loadedAnnouncement?: string | undefined;
  /** Initial state reflection (bindings sync changes via set* actions). */
  disabled?: boolean | undefined;
  softDisabled?: boolean | undefined;
  loading?: boolean | undefined;
  pressed?: boolean | undefined;
}

export interface PressableState {
  disabled: boolean;
  softDisabled: boolean;
  loading: boolean;
  /** undefined = not a toggle button; boolean = toggle mode. */
  pressed: boolean | undefined;
}

export type PressableActions = {
  press: undefined;
  setDisabled: boolean;
  setSoftDisabled: boolean;
  setLoading: boolean;
  setPressed: boolean;
};

export type PressablePart = 'root' | 'label' | 'spinner';

const parts: Record<PressablePart, PartDecl> = {
  root: {},
  label: {},
  spinner: { optional: true },
};

export function pressable<Config extends PressableConfig>(): Slice<
  Config,
  PressableState,
  PressableActions,
  PressablePart
> {
  return {
    name: 'pressable',
    parts,
    initialState: (config) => ({
      disabled: config.disabled ?? false,
      softDisabled: config.softDisabled ?? false,
      loading: config.loading ?? false,
      pressed: config.toggle ? (config.pressed ?? false) : undefined,
    }),
    actions: {
      press: (state) =>
        state.pressed === undefined ? state : { ...state, pressed: !state.pressed },
      setDisabled: (state, disabled) => ({ ...state, disabled }),
      setSoftDisabled: (state, softDisabled) => ({ ...state, softDisabled }),
      setLoading: (state, loading) => ({ ...state, loading }),
      setPressed: (state, pressed) => (state.pressed === undefined ? state : { ...state, pressed }),
    },
    canDispatch: (state, action) =>
      action === 'press' ? !(state.disabled || state.softDisabled || state.loading) : true,
    aria: (state) => {
      const root: AriaAttrs = {
        'aria-busy': state.loading ? 'true' : undefined,
        // Hard-disabled uses the native attribute only (binding-level);
        // aria-disabled is the discoverable soft-disabled channel.
        'aria-disabled': state.softDisabled && !state.disabled ? 'true' : undefined,
        'aria-pressed': state.pressed === undefined ? undefined : state.pressed ? 'true' : 'false',
        'data-state': state.loading ? 'loading' : state.softDisabled ? 'soft-disabled' : 'idle',
      };
      return {
        root,
        spinner: { 'aria-hidden': 'true' },
      };
    },
    keymap: (event, _state, part) =>
      part === 'root' && (event.key === 'Enter' || event.key === ' ') ? 'press' : null,
    effects: (state, config): EffectSpec[] =>
      state.loading
        ? [
            {
              type: 'announce',
              message: config.loadingAnnouncement ?? 'Loading',
              politeness: 'polite',
            },
          ]
        : config.loadedAnnouncement
          ? [{ type: 'announce', message: config.loadedAnnouncement, politeness: 'polite' }]
          : [],
  };
}
