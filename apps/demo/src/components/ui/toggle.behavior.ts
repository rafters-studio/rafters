import { compose, type GlueSlice } from '@/lib/compose';
import {
  createBehavior,
  type AriaAttrs,
  type BehaviorSpec,
  type PartIds,
} from '@/lib/contract';
import { updateAriaAttribute } from '@/lib/primitives/aria-manager';
import {
  pressable,
  type PressableActions,
  type PressableConfig,
  type PressablePart,
  type PressableState,
} from '@/lib/pressable';

export type ToggleVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info'
  | 'accent'
  | 'outline'
  | 'ghost';

export type ToggleSize = 'default' | 'sm' | 'lg';

export interface ToggleConfig extends PressableConfig {
  variant: ToggleVariant;
  size: ToggleSize;
}

export type ToggleState = PressableState;
export type ToggleActions = PressableActions;
export type TogglePart = PressablePart;

/**
 * The toggle score glues the on/off `data-state` over the pressable slice. A
 * toggle is inherently a two-state press button, so it always composes
 * `pressable` in toggle mode (`config.toggle` forced true by every performance)
 * -- `pressed` is therefore always a boolean and `aria-pressed` always
 * projects. The pressable slice already carries a `data-state`
 * (idle/loading/soft-disabled), so a SECOND non-glue contributor to it would
 * throw compose's collision guard; the glue is the sanctioned override seam,
 * projecting `on`/`off` from `state.pressed` (the motion axis the matrix
 * declares as `data-[state=on] swap`).
 */
const toggleState: GlueSlice<ToggleConfig, ToggleState, Record<never, never>, TogglePart> = {
  kind: 'glue',
  name: 'toggle-state',
  aria: (state) => ({
    root: { 'data-state': state.pressed ? 'on' : 'off' },
  }),
};

export const toggle: BehaviorSpec<ToggleConfig, ToggleState, ToggleActions, TogglePart> = compose(
  'toggle',
  pressable<ToggleConfig>(),
  toggleState,
);

/**
 * The DOM-native binding of the toggle score -- the client the Web Component
 * and the Astro <script> both import; only React (retained-mode) reads the
 * projections declaratively instead. Same shape as bindButton: createBehavior
 * is the model, aria-manager applies the projection, and the DOM is the part
 * registry.
 *
 * Archetype notes (toggle-family):
 * - The `root` is a native <button>, so Enter/Space are fulfilled by the
 *   browser as a click; the bind wires click -> press ONLY, with no keydown
 *   branch. A suppressed press (disabled, gated by canDispatch) prevents the
 *   click's default so the activation does not escape.
 * - Config is READ from the projected markup (aria-pressed seeds defaultPressed,
 *   the native disabled attribute seeds disabled) -- one source, no dual
 *   attributes to drift, exactly as bindButton reads its config once.
 * - `toggle` is forced true: a toggle is never a plain press button, so
 *   `pressed` is always boolean and `aria-pressed` is always present.
 */
export function bindToggle(root: HTMLElement): () => void {
  const config: ToggleConfig = {
    variant: 'default',
    size: 'default',
    toggle: true,
    defaultPressed: root.getAttribute('aria-pressed') === 'true',
    disabled: root.hasAttribute('disabled'),
  };

  const getPart = (part: string): HTMLElement | null =>
    part === 'root' ? root : root.querySelector<HTMLElement>(`[data-part="${part}"]`);

  const { memory, dispatch } = createBehavior(toggle, config);

  const request = (action: keyof ToggleActions): boolean => dispatch(action, config);

  // ids are READ from the markup; toggle carries no id-ref aria, but the
  // projection contract still takes them.
  const ids = {} as PartIds<TogglePart>;
  for (const part of Object.keys(toggle.parts) as TogglePart[]) ids[part] = getPart(part)?.id ?? '';

  // The projection is already resolved (final strings, undefined = absent), so
  // apply it raw: validate:false skips aria-manager's author-input coercion,
  // which would re-interpret the resolved string 'false' as truthy.
  const applyProjection = (el: HTMLElement, attrs: AriaAttrs) => {
    for (const [name, value] of Object.entries(attrs)) {
      updateAriaAttribute(el, name as never, value as never, { validate: false });
    }
  };

  const render = () => {
    const state = memory.get();
    const projection = toggle.aria(state, config, ids);
    for (const part of Object.keys(projection) as TogglePart[]) {
      const attrs = projection[part];
      const el = getPart(part);
      if (el && attrs) applyProjection(el, attrs);
    }
  };
  const unsubscribe = memory.subscribe(render); // fires immediately: first paint

  // Native <button> converts Enter/Space to click; the click dispatches press.
  // A rejected dispatch (the disabled gate) cancels the default so the
  // activation does not escape.
  const onClick = (event: Event) => {
    if (!request('press')) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  root.addEventListener('click', onClick);

  return () => {
    unsubscribe();
    root.removeEventListener('click', onClick);
  };
}
