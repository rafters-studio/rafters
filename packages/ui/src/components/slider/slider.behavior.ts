import { compose, type Slice } from '../../lib/compose';
import {
  createBehavior,
  type AriaAttrs,
  type BehaviorSpec,
  type PartIds,
} from '../../lib/contract';
import { updateAriaAttribute } from '../../primitives/aria-manager';
import { createInteractive } from '../../primitives/interactive';
import { createKeyboardHandler } from '../../primitives/keyboard-handler';
import { formValueAttrs, type FormValueAttrs } from '../../primitives/form-value';
import type { InteractiveMode, NormalizedPoint } from '../../primitives/types';

/**
 * Slider: a continuous/stepped value control. One or more thumbs (role=slider)
 * set value(s) in a [min, max] range by drag or arrow keys. The shadcn/Radix
 * base surface is array-valued (`defaultValue={[25, 75]}` is a range slider), so
 * the score is multi-thumb from the ground up; a single-thumb slider is just the
 * one-element array.
 *
 * Composition (Spec 05, "compose the primitive, never reimplement it"):
 * - pointer drag rides the `interactive` primitive -- it owns the mouse/touch
 *   surface and the document-level drag tracking, and hands back a normalized
 *   {left, top} (both 0-1). The value math that turns that point (or a key) into
 *   a stepped, clamped value is COMPONENT-INTERNAL pure state -- the exported
 *   `valueFromPoint`/`stepForKey`/`clampToStep` helpers below, never inside a
 *   reducer (a reducer gets no config, and the math needs min/max/step).
 * - keyboard nav rides `keyboard-handler` (`createKeyboardHandler`); the keymap
 *   projection is the pure claim record (Spec 01), the bind computes the payload.
 * - the form-value axis (`name` -> submitted values) is the pure
 *   `sliderFormValue` projection built on the `form-value` primitive; the three
 *   decorators render its hidden inputs and the bind keeps them in sync.
 *
 * Ephemeral, not score state: which thumb is being dragged (bind-local closure,
 * like radio-group tracks focus in the DOM) and the `data-dragging` flag the CSS
 * reads. The only score state is `values`; controlled/uncontrolled follows the
 * ownership-of-truth boundary (config.value shadows state.values).
 */
export type SliderVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info'
  | 'accent';

export type SliderSize = 'sm' | 'default' | 'lg';

export type SliderOrientation = 'horizontal' | 'vertical';

export interface SliderConfig {
  variant: SliderVariant;
  size: SliderSize;
  /** Range floor. */
  min: number;
  /** Range ceiling. */
  max: number;
  /** Increment the value snaps to. */
  step: number;
  /** Axis the thumbs travel along. */
  orientation: SliderOrientation;
  /** Controlled values: shadow the intrinsic state when present. */
  value?: number[] | undefined;
  /** Uncontrolled seed for the intrinsic values. */
  defaultValue?: number[] | undefined;
  /** No drag or key movement while disabled (gates the programmatic path too). */
  disabled?: boolean | undefined;
  /** Form-value axis: the field name each thumb's value submits under. */
  name?: string | undefined;
}

export interface SliderState {
  /** Intrinsic values -- ignored while a controlled value is present. Always
   *  ascending for a range (the reducer re-sorts on every move). */
  values: number[];
}

export type SliderActions = {
  /** Move one thumb to an already-clamped value; re-sorts a range. */
  setThumb: { index: number; value: number };
};

export type SliderPart = 'root' | 'track' | 'range' | 'thumb';

/** The effective values: a controlled `config.value` shadows intrinsic state. */
export function effectiveValues(state: SliderState, config: SliderConfig): number[] {
  return config.value ?? state.values;
}

/** Snap a raw value to the step grid and clamp it into [min, max]. */
export function clampToStep(value: number, config: SliderConfig): number {
  const { min, max, step } = config;
  const stepped = step > 0 ? min + Math.round((value - min) / step) * step : value;
  return Math.min(Math.max(stepped, min), max);
}

/** Percentage (0-100) of a value along the range -- the thumb/range geometry. */
export function percentFor(value: number, config: SliderConfig): number {
  const { min, max } = config;
  if (max === min) return 0;
  return ((value - min) / (max - min)) * 100;
}

/**
 * Turn a normalized pointer point (interactive's raw output, both axes 0-1) into
 * a stepped, clamped value. Vertical inverts: the track top is the max end.
 */
export function valueFromPoint(point: NormalizedPoint, config: SliderConfig): number {
  const pct = config.orientation === 'vertical' ? 1 - point.top : point.left;
  return clampToStep(config.min + pct * (config.max - config.min), config);
}

/** Index of the thumb nearest a value -- the one a track press grabs. */
export function nearestThumbIndex(values: number[], value: number): number {
  let closest = 0;
  let best = Infinity;
  for (let i = 0; i < values.length; i++) {
    const current = values[i];
    if (current === undefined) continue;
    const distance = Math.abs(current - value);
    if (distance < best) {
      best = distance;
      closest = i;
    }
  }
  return closest;
}

/**
 * The value a key targets from a thumb's current value, or `null` when the key
 * is not a slider key. Arrows step by `step`, Page keys by ten steps, Home/End
 * jump to the ends. Orientation does not remap the keys (the oracle's rule:
 * Right/Up always increase, Left/Down always decrease).
 */
export function stepForKey(key: string, current: number, config: SliderConfig): number | null {
  const large = config.step * 10;
  switch (key) {
    case 'ArrowRight':
    case 'ArrowUp':
      return clampToStep(current + config.step, config);
    case 'ArrowLeft':
    case 'ArrowDown':
      return clampToStep(current - config.step, config);
    case 'PageUp':
      return clampToStep(current + large, config);
    case 'PageDown':
      return clampToStep(current - large, config);
    case 'Home':
      return config.min;
    case 'End':
      return config.max;
    default:
      return null;
  }
}

/**
 * The form-value projection: one hidden-input descriptor per thumb (Radix
 * mirrors a range's every value under the same name). Pure data -- the three
 * decorators render it and the bind syncs the live values. Empty without a name.
 */
export function sliderFormValue(state: SliderState, config: SliderConfig): FormValueAttrs[] {
  if (!config.name) return [];
  return effectiveValues(state, config)
    .map((value) => formValueAttrs({ name: config.name, value: String(value) }))
    .filter((attrs): attrs is FormValueAttrs => attrs !== null);
}

const SLIDER_KEYS = [
  'ArrowRight',
  'ArrowLeft',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'PageUp',
  'PageDown',
] as const;

const slider: Slice<SliderConfig, SliderState, SliderActions, SliderPart> = {
  name: 'slider',
  parts: {
    // The container carries no role (it is not the widget); the thumbs are the
    // role=slider widgets. track + range are decorative geometry.
    root: {},
    track: {},
    range: {},
    thumb: { role: 'slider', many: true },
  },
  initialState: (config) => ({
    values: [...(config.value ?? config.defaultValue ?? [config.min])],
  }),
  actions: {
    // The value arrives already clamped/stepped (the pure helpers own the math,
    // since a reducer gets no config). A range stays sorted ascending so the
    // thumbs never cross and the neighbours' geometry stays monotonic.
    setThumb: (state, { index, value }) => {
      const values = [...state.values];
      if (index < 0 || index >= values.length) return state;
      values[index] = value;
      if (values.length > 1) values.sort((a, b) => a - b);
      return { values };
    },
  },
  // The gate: a disabled slider rejects every move, so a controlled consumer's
  // callback never fires for a change it would refuse.
  canDispatch: (_state, action, config) => (action === 'setThumb' ? !config.disabled : true),
  aria: (_state, config) => ({
    root: {
      'data-orientation': config.orientation,
      'data-disabled': config.disabled ? 'true' : undefined,
    },
    track: { 'aria-hidden': 'true', 'data-orientation': config.orientation },
    range: { 'aria-hidden': 'true' },
  }),
  // The pure claim record (Spec 01): these keys move a thumb. The bind computes
  // WHICH thumb (the focused one) and the target value via stepForKey.
  keymap: (event, _state, part) =>
    part === 'thumb' && (SLIDER_KEYS as ReadonlyArray<string>).includes(event.key)
      ? 'setThumb'
      : null,
};

/**
 * Per-instance projection for the `thumb` many-part. `aria()` projects one
 * AriaAttrs per part NAME; thumbs occur once per value, so their projection
 * takes the instance value (mirroring radio-group's radioItemAria). The oracle
 * used the GLOBAL min/max for every thumb (no neighbour-clamping); that is
 * preserved faithfully -- see the dispositions in slider.md. `aria-valuenow`
 * equals the thumb's own value string (its data-value), so the harness's
 * data-value-keyed driver and the projection agree by construction.
 */
export function sliderThumbAria(
  value: string,
  _state: SliderState,
  config: SliderConfig,
): AriaAttrs {
  return {
    'aria-valuemin': String(config.min),
    'aria-valuemax': String(config.max),
    'aria-valuenow': value,
    'aria-orientation': config.orientation,
    'aria-disabled': config.disabled ? 'true' : undefined,
  };
}

// First-class the thumb's per-instance projection on the spec (Spec 05's open
// gap): the harness's generic `assertInstanceAriaFulfillment` reads
// `spec.instanceAria`, and `compose` does not carry it, so it is attached here.
export const sliderBehavior: BehaviorSpec<SliderConfig, SliderState, SliderActions, SliderPart> = {
  ...compose('slider', slider),
  instanceAria: (part, value, state, config) =>
    part === 'thumb' ? sliderThumbAria(value, state, config) : {},
};

/** The interactive mode for a slider orientation (1D, single axis). */
function interactiveMode(config: SliderConfig): InteractiveMode {
  return config.orientation === 'vertical' ? '1d-vertical' : '1d-horizontal';
}

/**
 * Strip the ARIA the `interactive` primitive stamps on its surface. Interactive
 * assumes it IS the slider (role=slider + tabindex=0); here the surface is the
 * container and the THUMBS are the sliders, so the stamp is removed right after
 * every create/update. `applyAria` only runs inside create/update (never on a
 * pointer event -- confirmed in interactive.ts), so one wipe per call suffices.
 */
function neutralizeInteractiveAria(surface: HTMLElement): void {
  surface.removeAttribute('role');
  surface.removeAttribute('tabindex');
  surface.removeAttribute('aria-disabled');
}

export interface SliderInteractionOptions {
  /** The interactive surface AND the keyboard host -- the container root. */
  root: HTMLElement;
  getConfig: () => SliderConfig;
  /** Effective (controlled-aware) values at call time. */
  getValues: () => number[];
  /** Focused thumb index, from the DOM -- the keyboard target. */
  getFocusedIndex: () => number | null;
  /** Commit a thumb move; returns the thumb's index AFTER the range re-sort. */
  request: (index: number, value: number) => number;
  /** Toggle the ephemeral `data-dragging` flag the CSS reads. */
  setDragging: (on: boolean) => void;
}

/**
 * Compose the impure pointer + keyboard surface. Shared verbatim by `bindSlider`
 * (WC + Astro) and the React controller's effect -- one composition, three
 * performances, so the drag/keyboard rules can never drift.
 */
export function composeSliderInteractions(options: SliderInteractionOptions): () => void {
  const { root, getConfig, getValues, getFocusedIndex, request, setDragging } = options;

  let active: number | null = null;
  // A press flags "pick the nearest thumb on the NEXT normalized move" -- so the
  // pick reuses interactive's own point math instead of duplicating rect reads.
  let pickPending = false;

  const onPointerDown = (): void => {
    if (getConfig().disabled) return;
    pickPending = true;
    setDragging(true);
  };
  root.addEventListener('pointerdown', onPointerDown);

  const cleanupInteractive = createInteractive(root, {
    mode: interactiveMode(getConfig()),
    disabled: getConfig().disabled ?? false,
    onMove: (point) => {
      if (getConfig().disabled) return;
      const value = valueFromPoint(point, getConfig());
      if (pickPending) {
        active = nearestThumbIndex(getValues(), value);
        pickPending = false;
      }
      if (active === null) return;
      active = request(active, value);
    },
  });
  neutralizeInteractiveAria(root);

  const endDrag = (): void => {
    active = null;
    pickPending = false;
    setDragging(false);
  };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  // Keyboard rides the keyboard-handler primitive. Registered on the root so a
  // focused thumb's keydown bubbles up; the handler resolves the focused thumb
  // from the DOM (like radio-group) and computes the target via stepForKey.
  const cleanupKeyboard = createKeyboardHandler(root, {
    key: ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'],
    preventDefault: true,
    handler: (event) => {
      const config = getConfig();
      if (config.disabled) return;
      const index = getFocusedIndex();
      if (index === null) return;
      const current = getValues()[index];
      if (current === undefined) return;
      const target = stepForKey(event.key, current, config);
      if (target === null || target === current) return;
      request(index, target);
    },
  });

  return () => {
    root.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointercancel', endDrag);
    cleanupInteractive();
    cleanupKeyboard();
  };
}

/** The focused thumb's index from the DOM, or null. Shared by bind and React. */
export function focusedThumbIndex(root: HTMLElement): number | null {
  const activeEl = (root.getRootNode() as Document | ShadowRoot)
    .activeElement as HTMLElement | null;
  const thumb = activeEl?.closest<HTMLElement>('[data-part="thumb"]') ?? null;
  if (!thumb || !root.contains(thumb)) return null;
  const index = Number(thumb.dataset['index']);
  return Number.isInteger(index) ? index : null;
}

const THUMB_SELECTOR = '[data-part="thumb"]';

/**
 * The DOM-native binding of the slider score -- the client the Web Component and
 * the Astro <script> both import. React (retained-mode) reads the projections
 * declaratively instead, but composes the SAME `composeSliderInteractions`.
 *
 * Uncontrolled: WC/Astro have no reactive prop, so `config.value` is undefined
 * and the effective values are the intrinsic state, seeded from the
 * server-rendered thumbs.
 */
export function bindSlider(root: HTMLElement): () => void {
  const thumbEls = Array.from(root.querySelectorAll<HTMLElement>(THUMB_SELECTOR));
  const seeded = thumbEls
    .map((el) => Number(el.getAttribute('aria-valuenow')))
    .filter((n) => Number.isFinite(n));

  const config: SliderConfig = {
    variant: 'default',
    size: 'default',
    min: Number(thumbEls[0]?.getAttribute('aria-valuemin') ?? 0),
    max: Number(thumbEls[0]?.getAttribute('aria-valuemax') ?? 100),
    step: Number(root.getAttribute('data-step') ?? 1),
    orientation: root.getAttribute('data-orientation') === 'vertical' ? 'vertical' : 'horizontal',
    disabled: root.getAttribute('data-disabled') === 'true',
    name: root.getAttribute('data-name') ?? undefined,
    defaultValue:
      seeded.length > 0 ? seeded : [Number(thumbEls[0]?.getAttribute('aria-valuemin') ?? 0)],
  };

  const getPart = (part: string): HTMLElement | null =>
    part === 'root' ? root : root.querySelector<HTMLElement>(`[data-part="${part}"]`);

  const { memory, dispatch } = createBehavior(sliderBehavior, config);

  const ids = {} as PartIds<SliderPart>;
  for (const part of Object.keys(sliderBehavior.parts) as SliderPart[]) {
    ids[part] = getPart(part)?.id ?? '';
  }

  const applyProjection = (el: HTMLElement, attrs: AriaAttrs) => {
    for (const [name, value] of Object.entries(attrs)) {
      updateAriaAttribute(el, name as never, value as never, { validate: false });
    }
  };

  const isHorizontal = config.orientation === 'horizontal';

  const paintThumb = (el: HTMLElement, index: number, value: number): void => {
    el.dataset['index'] = String(index);
    el.dataset['value'] = String(value);
    applyProjection(el, sliderThumbAria(String(value), memory.get(), config));
    const pct = percentFor(value, config);
    if (isHorizontal) {
      el.style.left = `${pct}%`;
    } else {
      el.style.bottom = `${pct}%`;
    }
  };

  const render = () => {
    const state = memory.get();
    const values = effectiveValues(state, config);
    const projection = sliderBehavior.aria(state, config, ids);
    for (const part of ['root', 'track', 'range'] as const) {
      const attrs = projection[part];
      const el = getPart(part);
      if (el && attrs) applyProjection(el, attrs);
    }

    const thumbs = Array.from(root.querySelectorAll<HTMLElement>(THUMB_SELECTOR));
    for (const [index, el] of thumbs.entries()) {
      const value = values[index];
      if (value !== undefined) paintThumb(el, index, value);
    }

    // The range fill spans the thumbs (single thumb: min end -> value).
    const range = getPart('range');
    if (range) {
      const low = percentFor(Math.min(...values), config);
      const high = percentFor(Math.max(...values), config);
      const start = values.length > 1 ? low : 0;
      if (isHorizontal) {
        range.style.left = `${start}%`;
        range.style.right = `${100 - high}%`;
      } else {
        range.style.bottom = `${start}%`;
        range.style.top = `${100 - high}%`;
      }
    }

    // Keep the hidden form inputs in sync with the live values.
    const inputs = Array.from(root.querySelectorAll<HTMLInputElement>('input[data-slider-input]'));
    for (const [index, input] of inputs.entries()) {
      const value = values[index];
      if (value !== undefined) input.value = String(value);
    }
  };
  const unsubscribe = memory.subscribe(render); // fires immediately: first paint

  const request = (index: number, value: number): number => {
    if (!dispatch('setThumb', config, { index, value })) return index;
    const values = memory.get().values;
    root.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    const landed = values.indexOf(value);
    return landed === -1 ? index : landed;
  };

  const stopInteractions = composeSliderInteractions({
    root,
    getConfig: () => config,
    getValues: () => effectiveValues(memory.get(), config),
    getFocusedIndex: () => focusedThumbIndex(root),
    request,
    setDragging: (on) => {
      if (on) root.setAttribute('data-dragging', 'true');
      else root.removeAttribute('data-dragging');
    },
  });

  return () => {
    unsubscribe();
    stopInteractions();
  };
}
