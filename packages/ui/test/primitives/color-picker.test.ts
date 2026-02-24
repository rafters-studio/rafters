import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ColorPickerStateControls,
  ColorPickerStateOptions,
} from '../../src/primitives/color-picker';
import { createColorPickerState } from '../../src/primitives/color-picker';
import type { OklchColor } from '../../src/primitives/types';

let areaCanvas: HTMLCanvasElement;
let areaContainer: HTMLDivElement;
let hueCanvas: HTMLCanvasElement;
let hueContainer: HTMLDivElement;
let lInput: HTMLInputElement;
let cInput: HTMLInputElement;
let hInput: HTMLInputElement;
let preview: HTMLDivElement;
let areaThumb: HTMLDivElement;
let hueThumb: HTMLDivElement;

/** All DOM elements created per test, used for mount/unmount */
let domElements: HTMLElement[] = [];

function createDom(): void {
  areaCanvas = document.createElement('canvas');
  areaContainer = document.createElement('div');
  hueCanvas = document.createElement('canvas');
  hueContainer = document.createElement('div');
  lInput = document.createElement('input');
  cInput = document.createElement('input');
  hInput = document.createElement('input');
  preview = document.createElement('div');
  areaThumb = document.createElement('div');
  hueThumb = document.createElement('div');

  const stubGradient = { addColorStop: vi.fn() };
  const stubCtx = {
    clearRect: vi.fn(),
    createLinearGradient: vi.fn(() => stubGradient),
    fillRect: vi.fn(),
    fillStyle: '',
    setTransform: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
  };
  vi.spyOn(areaCanvas, 'getContext').mockReturnValue(
    stubCtx as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(hueCanvas, 'getContext').mockReturnValue(stubCtx as unknown as CanvasRenderingContext2D);

  domElements = [
    areaCanvas,
    areaContainer,
    hueCanvas,
    hueContainer,
    lInput,
    cInput,
    hInput,
    preview,
    areaThumb,
    hueThumb,
  ];
  for (const el of domElements) document.body.appendChild(el);
}

const DEFAULT_COLOR: OklchColor = { l: 0.7, c: 0.15, h: 250 };

function setup(overrides: Partial<ColorPickerStateOptions> = {}): ColorPickerStateControls & {
  onColorChange: ReturnType<typeof vi.fn>;
  onColorCommit: ReturnType<typeof vi.fn>;
} {
  const onColorChange = vi.fn();
  const onColorCommit = vi.fn();
  const state = createColorPickerState({
    areaCanvas,
    areaContainer,
    hueCanvas,
    hueContainer,
    inputs: { l: lInput, c: cInput, h: hInput },
    preview,
    areaThumb,
    hueThumb,
    initialColor: DEFAULT_COLOR,
    onColorChange,
    onColorCommit,
    ...overrides,
  });
  return { ...state, onColorChange, onColorCommit };
}

/** Simulate a drag start + release cycle and return the committed color */
function dragCommit(
  container: HTMLElement,
  startEvent: 'mousedown' | 'touchstart',
  endEvent: 'mouseup' | 'touchend',
): OklchColor {
  const Ctor = startEvent === 'mousedown' ? MouseEvent : TouchEvent;
  const EndCtor = endEvent === 'mouseup' ? MouseEvent : TouchEvent;
  container.dispatchEvent(new Ctor(startEvent, { bubbles: true }));
  const expected = state!.$color.get();
  document.dispatchEvent(new EndCtor(endEvent, { bubbles: true }));
  return expected;
}

let state: ReturnType<typeof setup> | null = null;

beforeEach(() => {
  createDom();
});

afterEach(() => {
  state?.destroy();
  state = null;
  for (const el of domElements) el.remove();
  domElements = [];
  vi.restoreAllMocks();
});

describe('createColorPickerState', () => {
  it('returns $color, setColor, and destroy', () => {
    state = setup();
    expect(state.$color).toBeDefined();
    expect(typeof state.$color.get).toBe('function');
    expect(typeof state.$color.subscribe).toBe('function');
    expect(typeof state.setColor).toBe('function');
    expect(typeof state.destroy).toBe('function');
  });

  it('initializes with the provided color', () => {
    state = setup({ initialColor: { l: 0.5, c: 0.1, h: 180 } });
    expect(state.$color.get()).toEqual({ l: 0.5, c: 0.1, h: 180 });
  });

  it('initializes with default color when none provided', () => {
    state = setup();
    expect(state.$color.get()).toEqual(DEFAULT_COLOR);
  });

  describe('setColor', () => {
    it('updates the reactive atom', () => {
      state = setup();
      state.setColor({ l: 0.3, c: 0.2, h: 120 });
      expect(state.$color.get()).toEqual({ l: 0.3, c: 0.2, h: 120 });
    });

    it('fires onColorChange', () => {
      state = setup();
      state.setColor({ l: 0.3, c: 0.2, h: 120 });
      expect(state.onColorChange).toHaveBeenCalledWith({ l: 0.3, c: 0.2, h: 120 });
    });

    it('does not fire onColorCommit', () => {
      state = setup();
      state.setColor({ l: 0.3, c: 0.2, h: 120 });
      expect(state.onColorCommit).not.toHaveBeenCalled();
    });
  });

  describe('pushColor', () => {
    it('updates the reactive atom', () => {
      state = setup();
      state.pushColor({ l: 0.3, c: 0.2, h: 120 });
      expect(state.$color.get()).toEqual({ l: 0.3, c: 0.2, h: 120 });
    });

    it('does not fire onColorChange', () => {
      state = setup();
      state.pushColor({ l: 0.3, c: 0.2, h: 120 });
      expect(state.onColorChange).not.toHaveBeenCalled();
    });

    it('does not fire onColorCommit', () => {
      state = setup();
      state.pushColor({ l: 0.3, c: 0.2, h: 120 });
      expect(state.onColorCommit).not.toHaveBeenCalled();
    });
  });

  describe('$color.subscribe', () => {
    it('fires immediately with current value', () => {
      state = setup();
      const listener = vi.fn();
      const unsub = state.$color.subscribe(listener);
      expect(listener.mock.calls[0][0]).toEqual(DEFAULT_COLOR);
      unsub();
    });

    it('fires on setColor', () => {
      state = setup();
      const listener = vi.fn();
      const unsub = state.$color.subscribe(listener);
      listener.mockClear();
      state.setColor({ l: 0.4, c: 0.1, h: 90 });
      expect(listener.mock.calls[0][0]).toEqual({ l: 0.4, c: 0.1, h: 90 });
      unsub();
    });
  });

  describe('pointer commit', () => {
    // mousedown on an interactive container triggers onMove (changing the color)
    // before our commit listener fires. We capture the atom value after the
    // start event to get the expected commit value.

    it('fires onColorCommit on mouseup after area mousedown', () => {
      state = setup();
      const expected = dragCommit(areaContainer, 'mousedown', 'mouseup');
      expect(state.onColorCommit).toHaveBeenCalledTimes(1);
      expect(state.onColorCommit.mock.calls[0][0]).toEqual(expected);
    });

    it('fires onColorCommit on mouseup after hue mousedown', () => {
      state = setup();
      const expected = dragCommit(hueContainer, 'mousedown', 'mouseup');
      expect(state.onColorCommit).toHaveBeenCalledTimes(1);
      expect(state.onColorCommit.mock.calls[0][0]).toEqual(expected);
    });

    it('fires onColorCommit on touchend after area touchstart', () => {
      state = setup();
      const expected = dragCommit(areaContainer, 'touchstart', 'touchend');
      expect(state.onColorCommit).toHaveBeenCalledTimes(1);
      expect(state.onColorCommit.mock.calls[0][0]).toEqual(expected);
    });

    it('fires onColorCommit on touchend after hue touchstart', () => {
      state = setup();
      const expected = dragCommit(hueContainer, 'touchstart', 'touchend');
      expect(state.onColorCommit).toHaveBeenCalledTimes(1);
      expect(state.onColorCommit.mock.calls[0][0]).toEqual(expected);
    });

    it('does not fire onColorCommit without a preceding mousedown', () => {
      state = setup();
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      expect(state.onColorCommit).not.toHaveBeenCalled();
    });

    it('commits the latest color after setColor + mouseup', () => {
      state = setup();
      const newColor = { l: 0.5, c: 0.2, h: 300 };
      areaContainer.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      state.setColor(newColor);
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      expect(state.onColorCommit.mock.calls[0][0]).toEqual(newColor);
    });

    it('removes document listeners after commit', () => {
      state = setup();
      areaContainer.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      state.onColorCommit.mockClear();
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      expect(state.onColorCommit).not.toHaveBeenCalled();
    });

    it('does not fire onColorCommit when disabled', () => {
      state = setup({ disabled: true });
      areaContainer.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      expect(state.onColorCommit).not.toHaveBeenCalled();
    });

    it('does not throw when onColorCommit is undefined', () => {
      state = setup({ onColorCommit: undefined });
      areaContainer.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      expect(() => {
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      }).not.toThrow();
    });
  });

  describe('destroy', () => {
    it('cleans up pointer commit listeners', () => {
      state = setup();
      state.destroy();
      areaContainer.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      expect(state.onColorCommit).not.toHaveBeenCalled();
    });

    it('cleans up pending document listeners on destroy', () => {
      state = setup();
      areaContainer.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      state.destroy();
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      expect(state.onColorCommit).not.toHaveBeenCalled();
    });
  });
});
