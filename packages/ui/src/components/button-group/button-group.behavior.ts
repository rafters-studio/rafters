import type { BehaviorSpec } from '../../lib/contract';

/**
 * ButtonGroup: adjoins related buttons into a single cohesive action set --
 * shared borders, one focus ring. A static score -- no state, no actions,
 * no keymap, no effects. Its contract is structural: the root always carries
 * `role="group"` (the WAI-ARIA APG pattern for a related control set --
 * NOT native to `div`, so the score projects it rather than leaving it to
 * element choice, exactly as alert projects `role="alert"`), and orientation
 * drives the connected-border layout classes only.
 *
 * Orientation is the whole config the score reads: `horizontal` joins buttons
 * left-to-right, `vertical` stacks them. Size inheritance to child buttons is
 * a React-only context affordance carried by the `.tsx` decorator, not the
 * score -- it never touches the group's own projection or classes, so it stays
 * out of the config here (the WC and Astro performances observe orientation
 * only, matching the oracle element).
 */

export type ButtonGroupOrientation = 'horizontal' | 'vertical';

export interface ButtonGroupConfig {
  orientation: ButtonGroupOrientation;
}

export type ButtonGroupState = Record<never, never>;
export type ButtonGroupActions = Record<never, never>;
export type ButtonGroupPart = 'root';

const ORIENTATIONS: ReadonlyArray<ButtonGroupOrientation> = ['horizontal', 'vertical'];

/** Unknown orientation values silently fall back to `horizontal` (oracle rule). */
export function isButtonGroupOrientation(value: unknown): value is ButtonGroupOrientation {
  return typeof value === 'string' && (ORIENTATIONS as ReadonlyArray<string>).includes(value);
}

export function parseOrientation(value: string | null | undefined): ButtonGroupOrientation {
  return isButtonGroupOrientation(value) ? value : 'horizontal';
}

export const buttonGroup: BehaviorSpec<
  ButtonGroupConfig,
  ButtonGroupState,
  ButtonGroupActions,
  ButtonGroupPart
> = {
  name: 'button-group',
  parts: { root: {} },
  initialState: () => ({}),
  actions: {},
  canDispatch: () => true,
  // role=group is the whole contract: a related-control-set grouping,
  // projected unconditionally (never native to div, so the score must state
  // it). aria-label is a consumer passthrough the decorator applies -- the
  // score cannot know the label, so it is never projected here.
  aria: () => ({ root: { role: 'group' } }),
  keymap: () => null,
  effects: () => [],
};
