import { compose, type Slice } from '@/lib/compose';
import { createBehavior, type AriaAttrs, type BehaviorSpec, type PartIds } from '@/lib/contract';
import { updateAriaAttribute } from '@/lib/primitives/aria-manager';
import { createInteractive } from '@/lib/primitives/interactive';
import { createKeyboardHandler } from '@/lib/primitives/keyboard-handler';
import type { InteractiveMode, NormalizedPoint } from '@/lib/primitives/types';

/**
 * Resizable: split panels whose adjacent sizes are moved by dragging a handle or
 * pressing arrow keys. The shadcn/react-resizable-panels surface is a
 * `PanelGroup` of `Panel`s separated by resize `Handle`s; the score's only state
 * axis is the panel `sizes` (percent per panel). Which handle is being dragged
 * and the `data-dragging` flag the CSS reads are ephemeral (bind-local closure,
 * like slider tracks the active thumb), never score state.
 *
 * Composition (Spec 05, "compose the primitive, never reimplement it"):
 * - pointer drag rides the `interactive` primitive -- it owns the mouse/touch
 *   surface and the document-level drag tracking and hands back a normalized
 *   {left, top}. The surface is the GROUP root, not a handle (a 1px handle has no
 *   meaningful rect); a press is only honoured when it lands on a handle (the
 *   `active` gate below, mirroring slider's `pickPending`). The percent math that
 *   turns the point into new sizes is component-internal pure state -- the
 *   exported `resizeSizes` helper -- never inside a reducer (a reducer gets no
 *   config, and the constraint math needs each panel's min/max).
 * - keyboard resize rides `keyboard-handler` (`createKeyboardHandler`); the
 *   keymap projection is the pure claim record (Spec 01) and the bind computes
 *   the delta via `keyDelta`.
 *
 * Uncontrolled only: react-resizable-panels reports layout via `onLayout` rather
 * than shadowing an external `sizes` prop, so there is no controlled boundary to
 * cross -- the intrinsic `sizes` are always the effective sizes.
 */
export type ResizableDirection = 'horizontal' | 'vertical';

/** Per-panel sizing metadata. All values are percentages of the group. */
export interface ResizablePanelConfig {
  /** Initial size (percent). Seeds the intrinsic `sizes`. */
  defaultSize: number;
  /** Floor the panel is clamped to while a neighbour pushes against it. */
  minSize: number;
  /** Ceiling the panel is clamped to. */
  maxSize: number;
}

export interface ResizableConfig {
  /** Axis the panels are laid along: horizontal = side by side. */
  direction: ResizableDirection;
  /** One entry per panel, in DOM order. Length defines the panel count. */
  panels: ResizablePanelConfig[];
  /** No drag or key movement while disabled (gates the reducer too). */
  disabled?: boolean | undefined;
}

export interface ResizableState {
  /** Percent per panel, in DOM order. A resize keeps the sum constant. */
  sizes: number[];
}

export type ResizableActions = {
  /** Replace every panel size at once (the pure helper owns the clamp math). */
  setSizes: { sizes: number[] };
};

export type ResizablePart = 'root' | 'panel' | 'handle';

/** Clamp a value into an inclusive range. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * The new size array after moving the handle between panel `handleIndex` and its
 * successor by `delta` percent. Faithful port of the oracle's `resizePanels`:
 * the delta is added to the panel before the handle and removed from the panel
 * after, then each is clamped to its min (redistributing the shortfall to the
 * neighbour) and its max. Pure over (sizes, panels) so it is unit-tested with no
 * DOM and shared by the pointer path (delta from the drag origin) and the
 * keyboard path (delta from a key).
 */
export function resizeSizes(
  sizes: number[],
  handleIndex: number,
  delta: number,
  panels: ResizablePanelConfig[],
): number[] {
  const before = panels[handleIndex];
  const after = panels[handleIndex + 1];
  const sizeBefore = sizes[handleIndex];
  const sizeAfter = sizes[handleIndex + 1];
  if (!before || !after || sizeBefore === undefined || sizeAfter === undefined) return sizes;

  let newBefore = sizeBefore + delta;
  let newAfter = sizeAfter - delta;

  if (newBefore < before.minSize) {
    const shortfall = before.minSize - newBefore;
    newBefore = before.minSize;
    newAfter -= shortfall;
  }
  if (newAfter < after.minSize) {
    const shortfall = after.minSize - newAfter;
    newAfter = after.minSize;
    newBefore -= shortfall;
  }
  newBefore = clamp(newBefore, before.minSize, before.maxSize);
  newAfter = clamp(newAfter, after.minSize, after.maxSize);

  return sizes.map((size, index) => {
    if (index === handleIndex) return newBefore;
    if (index === handleIndex + 1) return newAfter;
    return size;
  });
}

const ARROW_STEP = 1;
const SHIFT_STEP = 10;

/**
 * The resize delta a key targets from the current sizes, or `null` when the key
 * is not a resize key for this direction. Arrows step by 1 (10 with Shift);
 * Home shrinks the leading panel to its min, End grows it to its max. Right/Down
 * grow the leading panel, Left/Up shrink it (the visible drag direction).
 */
export function keyDelta(
  key: string,
  shiftKey: boolean,
  config: ResizableConfig,
  sizes: number[],
  handleIndex: number,
): number | null {
  const step = shiftKey ? SHIFT_STEP : ARROW_STEP;
  const panel = config.panels[handleIndex];
  const current = sizes[handleIndex];
  const horizontal = config.direction === 'horizontal';
  switch (key) {
    case 'ArrowRight':
      return horizontal ? step : null;
    case 'ArrowLeft':
      return horizontal ? -step : null;
    case 'ArrowDown':
      return horizontal ? null : step;
    case 'ArrowUp':
      return horizontal ? null : -step;
    case 'Home':
      return panel && current !== undefined ? panel.minSize - current : null;
    case 'End':
      return panel && current !== undefined ? panel.maxSize - current : null;
    default:
      return null;
  }
}

/** Keys that resize for a given direction -- the keymap's claim set. */
function resizeKeysFor(direction: ResizableDirection): ReadonlyArray<string> {
  return direction === 'horizontal'
    ? ['ArrowLeft', 'ArrowRight', 'Home', 'End']
    : ['ArrowUp', 'ArrowDown', 'Home', 'End'];
}

/**
 * The separator orientation follows the WAI-ARIA Window Splitter pattern: the
 * separator line is perpendicular to the group axis, so a horizontally-arranged
 * group (panels side by side) has a VERTICAL separator, and a vertical group has
 * a horizontal one.
 */
function separatorOrientation(direction: ResizableDirection): 'horizontal' | 'vertical' {
  return direction === 'horizontal' ? 'vertical' : 'horizontal';
}

const resizable: Slice<ResizableConfig, ResizableState, ResizableActions, ResizablePart> = {
  name: 'resizable',
  parts: {
    // The group root carries no widget role (it is a plain container); the
    // handles are the role=separator widgets. Panels are geometry.
    root: {},
    panel: { many: true },
    handle: { many: true, role: 'separator' },
  },
  initialState: (config) => ({ sizes: config.panels.map((panel) => panel.defaultSize) }),
  actions: {
    // The sizes arrive already clamped/redistributed (resizeSizes owns the math,
    // since a reducer gets no config). Replacing wholesale keeps the sum stable.
    setSizes: (_state, { sizes }) => ({ sizes }),
  },
  // The gate: a disabled group rejects every resize, so a consumer's onLayout
  // never fires for a move it would refuse.
  canDispatch: (_state, action, config) => (action === 'setSizes' ? !config.disabled : true),
  aria: (_state, config) => ({
    root: {
      'data-orientation': config.direction,
      'data-disabled': config.disabled ? 'true' : undefined,
    },
  }),
  // The pure claim record (Spec 01): these keys resize. The bind computes WHICH
  // handle (the focused one) and the delta via keyDelta.
  keymap: (event, _state, part, config) =>
    part === 'handle' && resizeKeysFor(config.direction).includes(event.key) ? 'setSizes' : null,
};

/**
 * Per-instance ARIA for the `handle` many-part (Spec 01: instanceAria). `aria()`
 * projects one AriaAttrs per part NAME; a handle occurs once per boundary, so its
 * projection takes the instance value -- the handle index -- and reads the size
 * of the panel BEFORE it as aria-valuenow (bounded by that panel's min/max). The
 * handle's data-value equals its index, so the harness's data-value-keyed driver
 * and this projection agree by construction. The accessible name is a decorator
 * concern (a separator has no intrinsic text), not projected here.
 */
export function resizableHandleAria(
  value: string,
  state: ResizableState,
  config: ResizableConfig,
): AriaAttrs {
  const index = Number(value);
  const panel = config.panels[index];
  const size = state.sizes[index] ?? panel?.defaultSize ?? 0;
  return {
    'aria-orientation': separatorOrientation(config.direction),
    'aria-valuenow': String(Math.round(size)),
    'aria-valuemin': String(panel?.minSize ?? 0),
    'aria-valuemax': String(panel?.maxSize ?? 100),
    'aria-disabled': config.disabled ? 'true' : undefined,
  };
}

// First-class the handle's per-instance projection on the spec (Spec 05's open
// gap): the harness's generic `assertInstanceAriaFulfillment` reads
// `spec.instanceAria`, and `compose` does not carry it, so it is attached here.
export const resizableBehavior: BehaviorSpec<
  ResizableConfig,
  ResizableState,
  ResizableActions,
  ResizablePart
> = {
  ...compose('resizable', resizable),
  instanceAria: (part, value, state, config) =>
    part === 'handle' ? resizableHandleAria(value, state, config) : {},
};

/** The interactive mode for a direction (1D, single axis). */
function interactiveMode(config: ResizableConfig): InteractiveMode {
  return config.direction === 'vertical' ? '1d-vertical' : '1d-horizontal';
}

const HANDLE_SELECTOR = '[data-part="handle"]';

/** The focused handle's index from the DOM, or null. Shared by bind and React. */
export function focusedHandleIndex(root: HTMLElement): number | null {
  const activeEl = (root.getRootNode() as Document | ShadowRoot)
    .activeElement as HTMLElement | null;
  const handle = activeEl?.closest<HTMLElement>(HANDLE_SELECTOR) ?? null;
  if (!handle || !root.contains(handle)) return null;
  const index = Number(handle.dataset['index']);
  return Number.isInteger(index) ? index : null;
}

/** Whether the handle at `index` is individually disabled (data-disabled). */
function handleDisabled(root: HTMLElement, index: number): boolean {
  const handle = root.querySelector<HTMLElement>(`${HANDLE_SELECTOR}[data-index="${index}"]`);
  return handle?.dataset['disabled'] === 'true';
}

/** Strip the role/tabindex the interactive primitive stamps on its surface. The
 *  surface here is the group root, not a widget, so the stamp is removed after
 *  create -- the same wipe slider applies. */
function neutralizeInteractiveAria(surface: HTMLElement): void {
  surface.removeAttribute('role');
  surface.removeAttribute('tabindex');
  surface.removeAttribute('aria-disabled');
}

export interface ResizableInteractionOptions {
  /** The interactive surface AND the keyboard host -- the group root. */
  root: HTMLElement;
  getConfig: () => ResizableConfig;
  /** Intrinsic sizes at call time. */
  getSizes: () => number[];
  /** Commit a new size array (already clamped by resizeSizes). */
  commit: (sizes: number[]) => void;
}

/**
 * Compose the impure pointer + keyboard surface. Shared verbatim by
 * `bindResizable` (WC + Astro) and the React controller's effect -- one
 * composition, three performances, so the drag/keyboard rules can never drift.
 */
export function composeResizableInteractions(options: ResizableInteractionOptions): () => void {
  const { root, getConfig, getSizes, commit } = options;

  let active: number | null = null;
  // The sizes and pointer fraction at the drag origin: every move applies the
  // cumulative delta to THIS snapshot (absolute-follow, no accumulation drift).
  let snapshot: number[] | null = null;
  let startFraction: number | null = null;

  const setDragging = (index: number | null, on: boolean): void => {
    if (index === null) return;
    const handle = root.querySelector<HTMLElement>(`${HANDLE_SELECTOR}[data-index="${index}"]`);
    if (!handle) return;
    if (on) handle.setAttribute('data-dragging', 'true');
    else handle.removeAttribute('data-dragging');
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (getConfig().disabled) return;
    const handle = (event.target as HTMLElement).closest<HTMLElement>(HANDLE_SELECTOR);
    if (!handle || !root.contains(handle)) return;
    const index = Number(handle.dataset['index']);
    if (!Number.isInteger(index) || handleDisabled(root, index)) return;
    active = index;
    snapshot = [...getSizes()];
    startFraction = null;
    setDragging(index, true);
  };
  root.addEventListener('pointerdown', onPointerDown);

  const cleanupInteractive = createInteractive(root, {
    mode: interactiveMode(getConfig()),
    disabled: getConfig().disabled ?? false,
    onMove: (point: NormalizedPoint) => {
      if (active === null || snapshot === null) return;
      const fraction = getConfig().direction === 'vertical' ? point.top : point.left;
      // The press point anchors the drag: the first move records it (no jump),
      // later moves apply the delta from it.
      if (startFraction === null) {
        startFraction = fraction;
        return;
      }
      const delta = (fraction - startFraction) * 100;
      commit(resizeSizes(snapshot, active, delta, getConfig().panels));
    },
  });
  neutralizeInteractiveAria(root);

  const endDrag = (): void => {
    setDragging(active, false);
    active = null;
    snapshot = null;
    startFraction = null;
  };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  // Keyboard rides the keyboard-handler primitive, on the root so a focused
  // handle's keydown bubbles up; the handler resolves the focused handle from
  // the DOM (like slider resolves the focused thumb) and computes the delta.
  const cleanupKeyboard = createKeyboardHandler(root, {
    key: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'],
    preventDefault: true,
    handler: (event) => {
      const config = getConfig();
      if (config.disabled) return;
      const index = focusedHandleIndex(root);
      if (index === null || handleDisabled(root, index)) return;
      const delta = keyDelta(event.key, event.shiftKey, config, getSizes(), index);
      if (delta === null || delta === 0) return;
      commit(resizeSizes(getSizes(), index, delta, config.panels));
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

/** Read the panel configs the author/server rendered onto the DOM. */
function readPanels(root: HTMLElement): ResizablePanelConfig[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[data-part="panel"]')).map((panel) => ({
    defaultSize: Number(panel.dataset['panelDefault'] ?? panel.dataset['panelSize'] ?? 0),
    minSize: Number(panel.dataset['panelMin'] ?? 0),
    maxSize: Number(panel.dataset['panelMax'] ?? 100),
  }));
}

/**
 * The DOM-native binding of the resizable score -- the client the Web Component
 * and the Astro <script> both import. React (retained-mode) reads the
 * projections declaratively instead, but composes the SAME
 * `composeResizableInteractions`.
 */
export function bindResizable(root: HTMLElement): () => void {
  const config: ResizableConfig = {
    direction: root.dataset['direction'] === 'vertical' ? 'vertical' : 'horizontal',
    disabled: root.dataset['disabled'] === 'true',
    panels: readPanels(root),
  };

  const getPart = (part: string): HTMLElement | null =>
    part === 'root' ? root : root.querySelector<HTMLElement>(`[data-part="${part}"]`);

  const { memory, dispatch } = createBehavior(resizableBehavior, config);

  const ids = {} as PartIds<ResizablePart>;
  for (const part of Object.keys(resizableBehavior.parts) as ResizablePart[]) {
    ids[part] = getPart(part)?.id ?? '';
  }

  const applyProjection = (el: HTMLElement, attrs: AriaAttrs) => {
    for (const [name, value] of Object.entries(attrs)) {
      updateAriaAttribute(el, name as never, value as never, { validate: false });
    }
  };

  const render = () => {
    const state = memory.get();
    const projection = resizableBehavior.aria(state, config, ids);
    const rootAttrs = projection.root;
    if (rootAttrs) applyProjection(root, rootAttrs);

    // Paint each panel's flex-basis and each handle's per-instance ARIA.
    const panels = Array.from(root.querySelectorAll<HTMLElement>('[data-part="panel"]'));
    for (const [index, el] of panels.entries()) {
      const size = state.sizes[index];
      if (size === undefined) continue;
      el.style.flexBasis = `${size}%`;
    }
    for (const handle of root.querySelectorAll<HTMLElement>(HANDLE_SELECTOR)) {
      const value = handle.dataset['value'];
      if (value === undefined) continue;
      applyProjection(handle, resizableHandleAria(value, state, config));
    }
  };
  const unsubscribe = memory.subscribe(render); // fires immediately: first paint

  const commit = (sizes: number[]): void => {
    if (!dispatch('setSizes', config, { sizes })) return;
    root.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  };

  const stopInteractions = composeResizableInteractions({
    root,
    getConfig: () => config,
    getSizes: () => memory.get().sizes,
    commit,
  });

  return () => {
    unsubscribe();
    stopInteractions();
  };
}
