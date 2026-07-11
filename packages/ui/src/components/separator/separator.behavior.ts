import type { BehaviorSpec } from '../../lib/contract';

/**
 * Separator: a static score whose only contract is which of two lies it
 * refuses to tell. Decorative by default (`role="none"`, no
 * `aria-orientation` -- an unannounced hairline costs a screen-reader user
 * nothing). Non-decorative flips to `role="separator"` with a real
 * `aria-orientation`, matching the oracle's WC/React/Astro triad (ruled
 * 2026-07-03 precedent: role is honest or absent, never both at once --
 * see grid.behavior.ts). No state, no actions, no keymap, no effects: the
 * line has nothing to subscribe to and nothing to dispatch.
 */

export type SeparatorOrientation = 'horizontal' | 'vertical';

export interface SeparatorConfig {
  orientation?: SeparatorOrientation | undefined;
  /** Purely visual when true (the default): role="none", no orientation
   *  announced. False promises the real ARIA separator semantics. */
  decorative?: boolean | undefined;
}

export type SeparatorState = Record<never, never>;
export type SeparatorActions = Record<never, never>;
export type SeparatorPart = 'root';

export const separator: BehaviorSpec<
  SeparatorConfig,
  SeparatorState,
  SeparatorActions,
  SeparatorPart
> = {
  name: 'separator',
  parts: { root: {} },
  initialState: () => ({}),
  actions: {},
  canDispatch: () => true,
  aria: (_state, config) => {
    const decorative = config.decorative ?? true;
    const orientation = config.orientation ?? 'horizontal';
    return {
      root: {
        role: decorative ? 'none' : 'separator',
        'aria-orientation': decorative ? undefined : orientation,
      },
    };
  },
  keymap: () => null,
  effects: () => [],
};
