/**
 * Interactive surface primitive
 * Headless, color-agnostic pointer tracking surface that captures mouse, touch,
 * and keyboard input on a container element. Pointer/touch emits normalized
 * {left, top} coordinates (both 0-1); keyboard emits additive {dLeft, dTop}
 * movement deltas (Home/End emit -Infinity/Infinity to signal boundary jumps).
 *
 * WCAG Compliance:
 * - 2.1.1 Keyboard (Level A): Full keyboard navigation support
 * - 4.1.2 Name, Role, Value (Level A): Appropriate ARIA roles and states
 */

import { createKeyBindings } from '@/lib/primitives/keyboard-handler';
import type {
  CleanupFunction,
  Direction,
  InteractiveMode,
  MoveDelta,
  NormalizedPoint,
} from '@/lib/primitives/types';

export interface InteractiveOptions {
  mode: InteractiveMode;
  onMove: (point: NormalizedPoint) => void;
  onKeyMove?: (delta: MoveDelta) => void;
  disabled?: boolean;
  dir?: Direction;
}

const STEP = 0.01;
const SHIFT_MULTIPLIER = 5;
const PAGE_STEP = 0.05;

/** Timeout (ms) to suppress synthesized mouse events after a touch gesture */
const TOUCH_DEDUP_MS = 500;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function restoreAttribute(element: HTMLElement, name: string, previous: string | null): void {
  if (previous === null) {
    element.removeAttribute(name);
  } else {
    element.setAttribute(name, previous);
  }
}

// Mutable point reused across pointer/touch moves to avoid per-event allocation
const _point: NormalizedPoint = { left: 0, top: 0 };

function pointerToNormalized(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  mode: InteractiveMode,
): NormalizedPoint {
  _point.left =
    mode === '1d-vertical'
      ? 0
      : rect.width > 0
        ? clamp((clientX - rect.left) / rect.width, 0, 1)
        : 0;
  _point.top =
    mode === '1d-horizontal'
      ? 0
      : rect.height > 0
        ? clamp((clientY - rect.top) / rect.height, 0, 1)
        : 0;

  return _point;
}

function applyAria(element: HTMLElement, options: InteractiveOptions): void {
  element.setAttribute('tabindex', '0');
  element.setAttribute('role', options.mode === '2d' ? 'application' : 'slider');

  if (options.disabled) {
    element.setAttribute('aria-disabled', 'true');
  } else {
    element.removeAttribute('aria-disabled');
  }
}

// Maps elements to mutable options state shared with the createInteractive closure,
// allowing updateInteractive to change behavior without re-attaching listeners.
const interactiveRegistry = new WeakMap<HTMLElement, { options: InteractiveOptions }>();

/**
 * Create an interactive pointer-tracking surface on the given element.
 * Returns a cleanup function that removes all listeners and restores attributes.
 */
export function createInteractive(
  element: HTMLElement,
  options: InteractiveOptions,
): CleanupFunction {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const prevRole = element.getAttribute('role');
  const prevTabindex = element.getAttribute('tabindex');
  const prevAriaDisabled = element.getAttribute('aria-disabled');

  const state = { options };
  interactiveRegistry.set(element, state);

  applyAria(element, options);

  // Track active document listeners so cleanup can remove them mid-drag
  let activeMouseMove: ((e: MouseEvent) => void) | null = null;
  let activeMouseUp: (() => void) | null = null;

  // Touch dedup: suppress synthesized mouse events shortly after touch
  let lastTouchTime = 0;

  // --------------------------------------------------------------------------
  // Pointer tracking (mouse)
  // --------------------------------------------------------------------------

  function emitPointer(clientX: number, clientY: number): void {
    const rect = element.getBoundingClientRect();
    const point = pointerToNormalized(clientX, clientY, rect, state.options.mode);
    state.options.onMove(point);
  }

  function handleMouseDown(event: MouseEvent): void {
    if (state.options.disabled) return;
    if (Date.now() - lastTouchTime < TOUCH_DEDUP_MS) return;

    emitPointer(event.clientX, event.clientY);

    function handleMouseMove(moveEvent: MouseEvent): void {
      if (state.options.disabled) return;
      emitPointer(moveEvent.clientX, moveEvent.clientY);
    }

    function handleMouseUp(): void {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      activeMouseMove = null;
      activeMouseUp = null;
    }

    activeMouseMove = handleMouseMove;
    activeMouseUp = handleMouseUp;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  // --------------------------------------------------------------------------
  // Touch tracking
  // --------------------------------------------------------------------------

  function handleTouch(event: TouchEvent): void {
    if (state.options.disabled) return;
    if (event.type === 'touchstart') {
      lastTouchTime = Date.now();
    }
    event.preventDefault();

    const touch = event.touches[0] ?? event.changedTouches[0];
    if (!touch) return;

    emitPointer(touch.clientX, touch.clientY);
  }

  // --------------------------------------------------------------------------
  // Keyboard handling
  // --------------------------------------------------------------------------

  function emitKeyDelta(dLeft: number, dTop: number): void {
    if (state.options.disabled) return;
    state.options.onKeyMove?.({ dLeft, dTop });
  }

  function isHorizontalMode(): boolean {
    return state.options.mode === '1d-horizontal' || state.options.mode === '2d';
  }

  function isVerticalMode(): boolean {
    return state.options.mode === '1d-vertical' || state.options.mode === '2d';
  }

  function rtlSign(): 1 | -1 {
    return state.options.dir === 'rtl' ? -1 : 1;
  }

  /** Emit a single-axis delta: horizontal for 1d-horizontal and 2d, vertical for 1d-vertical */
  function emitAxisDelta(magnitude: number): void {
    if (state.options.mode === '1d-vertical') {
      emitKeyDelta(0, magnitude);
    } else {
      // 1d-horizontal and 2d both use horizontal axis for page/boundary keys
      emitKeyDelta(magnitude, 0);
    }
  }

  const cleanupKeyboard = createKeyBindings(element, [
    // Arrow keys (no shift) -- step by STEP
    {
      key: 'ArrowRight',
      modifiers: { shift: false },
      preventDefault: true,
      handler: () => {
        if (isHorizontalMode()) emitKeyDelta(rtlSign() * STEP, 0);
      },
    },
    {
      key: 'ArrowLeft',
      modifiers: { shift: false },
      preventDefault: true,
      handler: () => {
        if (isHorizontalMode()) emitKeyDelta(-rtlSign() * STEP, 0);
      },
    },
    {
      key: 'ArrowDown',
      modifiers: { shift: false },
      preventDefault: true,
      handler: () => {
        if (isVerticalMode()) emitKeyDelta(0, STEP);
      },
    },
    {
      key: 'ArrowUp',
      modifiers: { shift: false },
      preventDefault: true,
      handler: () => {
        if (isVerticalMode()) emitKeyDelta(0, -STEP);
      },
    },
    // Arrow keys (shift) -- step by STEP * SHIFT_MULTIPLIER
    {
      key: 'ArrowRight',
      modifiers: { shift: true },
      preventDefault: true,
      handler: () => {
        if (isHorizontalMode()) emitKeyDelta(rtlSign() * STEP * SHIFT_MULTIPLIER, 0);
      },
    },
    {
      key: 'ArrowLeft',
      modifiers: { shift: true },
      preventDefault: true,
      handler: () => {
        if (isHorizontalMode()) emitKeyDelta(-rtlSign() * STEP * SHIFT_MULTIPLIER, 0);
      },
    },
    {
      key: 'ArrowDown',
      modifiers: { shift: true },
      preventDefault: true,
      handler: () => {
        if (isVerticalMode()) emitKeyDelta(0, STEP * SHIFT_MULTIPLIER);
      },
    },
    {
      key: 'ArrowUp',
      modifiers: { shift: true },
      preventDefault: true,
      handler: () => {
        if (isVerticalMode()) emitKeyDelta(0, -STEP * SHIFT_MULTIPLIER);
      },
    },
    // Page keys emit fixed-step deltas; Home/End emit Infinity to signal "jump to boundary"
    { key: 'PageDown', preventDefault: true, handler: () => emitAxisDelta(PAGE_STEP) },
    { key: 'PageUp', preventDefault: true, handler: () => emitAxisDelta(-PAGE_STEP) },
    { key: 'Home', preventDefault: true, handler: () => emitAxisDelta(-Infinity) },
    { key: 'End', preventDefault: true, handler: () => emitAxisDelta(Infinity) },
  ]);

  // --------------------------------------------------------------------------
  // Event binding
  // --------------------------------------------------------------------------

  element.addEventListener('mousedown', handleMouseDown);
  element.addEventListener('touchstart', handleTouch, { passive: false });
  element.addEventListener('touchmove', handleTouch, { passive: false });
  element.addEventListener('touchend', handleTouch, { passive: false });

  // --------------------------------------------------------------------------
  // Cleanup
  // --------------------------------------------------------------------------

  return () => {
    element.removeEventListener('mousedown', handleMouseDown);
    element.removeEventListener('touchstart', handleTouch);
    element.removeEventListener('touchmove', handleTouch);
    element.removeEventListener('touchend', handleTouch);

    // Remove any active document-level drag listeners
    if (activeMouseMove) document.removeEventListener('mousemove', activeMouseMove);
    if (activeMouseUp) document.removeEventListener('mouseup', activeMouseUp);

    cleanupKeyboard();
    interactiveRegistry.delete(element);

    restoreAttribute(element, 'role', prevRole);
    restoreAttribute(element, 'tabindex', prevTabindex);
    restoreAttribute(element, 'aria-disabled', prevAriaDisabled);
  };
}

/**
 * Update an interactive surface's options without teardown.
 * Re-applies ARIA attributes and updates the stored options so future
 * pointer/keyboard events use the new configuration.
 */
export function updateInteractive(element: HTMLElement, options: InteractiveOptions): void {
  const entry = interactiveRegistry.get(element);
  if (!entry) return;

  entry.options = options;
  applyAria(element, options);
}
