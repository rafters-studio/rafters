import { compose, type Slice } from '@/lib/compose';
import { type BehaviorSpec, type PartIds } from '@/lib/contract';
import { updateAriaAttribute } from '@/lib/primitives/aria-manager';

/**
 * InputGroup: a text control adjoined with leading/trailing addons (a currency
 * symbol, a unit, a search icon, an action button) so the whole assembly reads
 * and focuses as ONE control.
 *
 * The archetype is the WRAPPER, not the value-owner -- the same shape `field`
 * proves. The group does not hold the text: the contained native `<input>`
 * owns its value, caret, IME composition, selection, and form participation,
 * exactly as it does when it stands alone. Introducing a `setValue` reducer
 * here would install a SECOND memory cell over a control that already has one,
 * and the two would fight the moment a consumer nested the ported `<Input>`
 * (whose own score owns the value) inside a group. The issue's `value` state is
 * therefore satisfied by composition rather than duplication.
 *
 * What the score owns (the earned semantics, extracted from
 * `src/old/ui/input-group.*`):
 *  - the disabled propagation rule: a disabled GROUP disables every control it
 *    contains, and -- correcting an oracle defect -- an ENABLED group never
 *    re-enables a control the author disabled individually (`isControlDisabled`);
 *  - the validity projection: `aria-invalid` on the contained control plus the
 *    `data-state` both the root and the control style off, so the destructive
 *    border lands on the GROUP's border (the group draws the box, the control
 *    has none);
 *  - the addon position vocabulary (`start`/`end`) as two distinct parts, so
 *    each side's divider class and `data-position` are asserted identically
 *    across React, the Web Component, and Astro.
 *
 * What the score does NOT own:
 *  - the value, and every editing concern attached to it -- the contained
 *    control's, per above;
 *  - `required` / error-message wiring -- `field` owns those and composes
 *    AROUND a group; duplicating them here would produce two `aria-describedby`
 *    authorities over one control;
 *  - the focus-within ring, size heights, and addon dividers -- decoration,
 *    painted from `input-group.classes.ts`.
 *
 * There is no keymap: every keystroke belongs to the contained control, and the
 * addons hold ordinary focusable content that keeps its own native behavior.
 */

export type InputGroupSize = 'sm' | 'default' | 'lg';

export type InputGroupAddonPosition = 'start' | 'end';

export interface InputGroupConfig {
  /** Control height vocabulary, shared with the standalone input. */
  size?: InputGroupSize | undefined;
  /** Disables the whole assembly: the contained control and any focusable
   *  addon content (an "Apply" button must not stay live inside a dead group). */
  disabled?: boolean | undefined;
  /** Advertised to AT via `aria-invalid` on the contained control, and reflected
   *  as `data-state` so the GROUP's border carries the destructive treatment. */
  invalid?: boolean | undefined;
}

/** No state axis: the group is a total function from config to projection. */
export type InputGroupState = Record<never, never>;

/** No actions: nothing about the group is dispatchable. */
export type InputGroupActions = Record<never, never>;

/**
 * root       -- the bordered box that draws the control's chrome and focus ring.
 * control    -- the contained text control the group wraps (never rendered by
 *               the group in the WC/Astro performances: it is authored/slotted).
 * addonStart -- optional leading affix.
 * addonEnd   -- optional trailing affix.
 */
export type InputGroupPart = 'root' | 'control' | 'addonStart' | 'addonEnd';

const SIZES: ReadonlyArray<InputGroupSize> = ['sm', 'default', 'lg'];

const POSITIONS: ReadonlyArray<InputGroupAddonPosition> = ['start', 'end'];

/** Unknown size values silently fall back to `default` (the oracle's rule). */
export function parseInputGroupSize(value: string | null | undefined): InputGroupSize {
  return typeof value === 'string' && (SIZES as ReadonlyArray<string>).includes(value)
    ? (value as InputGroupSize)
    : 'default';
}

/** Unknown position values silently fall back to `start` (the oracle's rule). */
export function parseAddonPosition(value: string | null | undefined): InputGroupAddonPosition {
  return typeof value === 'string' && (POSITIONS as ReadonlyArray<string>).includes(value)
    ? (value as InputGroupAddonPosition)
    : 'start';
}

/** The part name a given addon position renders as. */
export function addonPart(position: InputGroupAddonPosition): InputGroupPart {
  return position === 'end' ? 'addonEnd' : 'addonStart';
}

/**
 * The disabled rule, stated ONCE for all three performances: a disabled group
 * disables what it contains, and an enabled group leaves an individually
 * disabled control alone.
 *
 * The oracle propagated unconditionally (`child.disabled = disabled`), which
 * silently RE-ENABLED a control the author had disabled on its own whenever the
 * group was enabled -- dispositioned `defect-do-not-port` in the component doc.
 * Expressing the rule as an OR fixes it in one place; `bindInputGroup` and the
 * React decorator both read this function rather than restating it.
 */
export function isControlDisabled(config: InputGroupConfig, ownDisabled: boolean): boolean {
  return config.disabled === true || ownDisabled;
}

const inputGroup: Slice<InputGroupConfig, InputGroupState, InputGroupActions, InputGroupPart> = {
  name: 'input-group',
  parts: {
    // No role on the root: `field` sets the precedent, and a `role="group"`
    // with no accessible name adds a nameless landmark to the AT tree without
    // adding meaning. The contained control carries the semantics.
    root: {},
    control: {},
    addonStart: { optional: true },
    addonEnd: { optional: true },
  },
  initialState: () => ({}),
  actions: {},
  canDispatch: () => true,
  aria: (_state, config) => {
    const invalid = config.invalid === true;
    return {
      // The root reflects validity because the root draws the border: the
      // control inside has no border of its own to turn destructive.
      root: { 'data-state': invalid ? 'invalid' : 'default' },
      control: {
        // Omitted when valid (field's convention, not input's always-present
        // 'true'/'false'). The group is a wrapper: an absent attribute lets a
        // contained control that projects its OWN validity -- the ported Input
        // -- stay the single authority, instead of being overwritten with a
        // literal 'false'. It also sidesteps aria-manager's truthy coercion of
        // the string 'false' entirely.
        'aria-invalid': invalid ? 'true' : undefined,
        'data-state': invalid ? 'invalid' : 'default',
      },
      // Position is projected rather than hand-written into each decorator's
      // markup, so the conformance harness asserts the same `data-position` in
      // React, the Web Component, and Astro from one source.
      addonStart: { 'data-position': 'start' },
      addonEnd: { 'data-position': 'end' },
    };
  },
  // The contained control owns every keystroke; the addons hold ordinary
  // focusable content with its own native behavior. The group claims no key.
  keymap: () => null,
};

export const inputGroupBehavior: BehaviorSpec<
  InputGroupConfig,
  InputGroupState,
  InputGroupActions,
  InputGroupPart
> = compose('input-group', inputGroup);

/**
 * Locate the group's control. Prefer the explicit part marker; fall back to the
 * first native form control so a light-DOM control the author did not annotate
 * is still found (and is then stamped with `data-part="control"` so the
 * conformance harness and any re-query find it too). Mirrors `findControl` in
 * `field.behavior.ts` -- the same slotted-control problem, the same answer.
 */
function findControl(root: HTMLElement): HTMLElement | null {
  return (
    root.querySelector<HTMLElement>('[data-part="control"]') ??
    root.querySelector<HTMLElement>('input, select, textarea')
  );
}

/** Elements exposing a boolean `disabled` property (native controls, and our
 *  own form-associated custom elements) -- narrowed from `unknown`, no `any`. */
interface DisableableElement extends Element {
  disabled: boolean;
}

function isDisableable(node: Element): node is DisableableElement {
  // `in` narrows the unknown-shaped element without a cast and without `any`.
  return 'disabled' in node && typeof node.disabled === 'boolean';
}

/**
 * The DOM-native client of the input-group score -- shared by the Web Component
 * and the Astro `<script>`. React (retained mode) reads the projection
 * declaratively instead.
 *
 * Near-empty by construction, like `bindField`: the score has no state and no
 * actions, so there is no `createBehavior`, no memory, no dispatch, and no
 * event listener. The bind does exactly the two things SSR cannot reach into a
 * slotted control:
 *  1. apply the score's projection to the root, the control, and each addon;
 *  2. propagate the group's `disabled` to every disableable descendant.
 *
 * Bind-once, matching input/field/radio-group: the client wires the
 * server/author markup a single time. Re-toggling `disabled` or `data-invalid`
 * at runtime is React's declarative affordance, not a WC lifecycle this client
 * re-observes -- a disposition recorded in input-group.md.
 */
export function bindInputGroup(root: HTMLElement): () => void {
  const control = findControl(root);
  if (!control) return () => {};
  // Stamp the marker so the harness (and a re-query) find a bare authored
  // control, exactly as bindField does.
  control.setAttribute('data-part', 'control');

  // Host signals, read BEFORE the projection is applied so the score's own
  // `data-state` output is never mistaken for author input. `disabled` is the
  // attribute an author writes on the custom element; `data-disabled` is the
  // form Astro server-renders.
  const config: InputGroupConfig = {
    size: parseInputGroupSize(root.getAttribute('data-size')),
    disabled: root.hasAttribute('disabled') || root.hasAttribute('data-disabled'),
    invalid: root.hasAttribute('data-invalid'),
  };

  const getPart = (part: InputGroupPart): HTMLElement | null =>
    part === 'root'
      ? root
      : part === 'control'
        ? control
        : root.querySelector(`[data-part="${part}"]`);

  // ids READ from the rendered parts, never generated (Spec 01).
  const ids = {} as PartIds<InputGroupPart>;
  for (const part of Object.keys(inputGroupBehavior.parts) as InputGroupPart[]) {
    ids[part] = getPart(part)?.id ?? '';
  }

  // The projection is already resolved (final strings, undefined = absent), so
  // apply it raw: validate:false skips aria-manager's author-input coercion.
  const projection = inputGroupBehavior.aria({}, config, ids);
  for (const part of Object.keys(projection) as InputGroupPart[]) {
    const attrs = projection[part];
    const element = getPart(part);
    if (!element || !attrs) continue;
    for (const [name, value] of Object.entries(attrs)) {
      updateAriaAttribute(element, name as never, value as never, { validate: false });
    }
  }

  // Disabled propagation -- native attribute AND property, so a disabled group
  // both reflects and actually disables. Applied to every disableable
  // descendant, not just the control: an addon's action button must not stay
  // live inside a dead group (the oracle's earned rule). Guarded by the group's
  // own disabled, so an enabled group never re-enables an individually disabled
  // control -- the corrected propagation, see isControlDisabled.
  if (config.disabled === true) {
    for (const node of Array.from(root.querySelectorAll<Element>('*'))) {
      if (!isDisableable(node)) continue;
      node.setAttribute('disabled', '');
      node.disabled = true;
    }
  }

  return () => {};
}
