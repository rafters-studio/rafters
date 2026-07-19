import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearDismissableLayerStack,
  createDismissableLayer,
  createDismissableLayerStack,
  getDismissableLayerStack,
} from '../../src/primitives/dismissable-layer';

describe('createDismissableLayer', () => {
  let layer: HTMLDivElement;

  beforeEach(() => {
    layer = document.createElement('div');
    document.body.appendChild(layer);
  });

  afterEach(() => {
    layer.remove();
  });

  it('calls onEscapeKeyDown when Escape is pressed', () => {
    const onEscapeKeyDown = vi.fn();
    const cleanup = createDismissableLayer(layer, { onEscapeKeyDown });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(onEscapeKeyDown).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it('calls onDismiss when Escape is pressed', () => {
    const onDismiss = vi.fn();
    const cleanup = createDismissableLayer(layer, { onDismiss });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(onDismiss).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it('calls onPointerDownOutside when clicking outside', () => {
    const onPointerDownOutside = vi.fn();
    const cleanup = createDismissableLayer(layer, { onPointerDownOutside });

    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    expect(onPointerDownOutside).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it('calls onDismiss when clicking outside', () => {
    const onDismiss = vi.fn();
    const cleanup = createDismissableLayer(layer, { onDismiss });

    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    expect(onDismiss).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it('does not call onPointerDownOutside when clicking inside', () => {
    const onPointerDownOutside = vi.fn();
    const cleanup = createDismissableLayer(layer, { onPointerDownOutside });

    layer.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    expect(onPointerDownOutside).not.toHaveBeenCalled();

    cleanup();
  });

  it('calls onFocusOutside when focus moves outside', () => {
    const onFocusOutside = vi.fn();
    const cleanup = createDismissableLayer(layer, { onFocusOutside });

    const outsideButton = document.createElement('button');
    document.body.appendChild(outsideButton);

    outsideButton.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    expect(onFocusOutside).toHaveBeenCalledTimes(1);

    cleanup();
    outsideButton.remove();
  });

  it('does not call onFocusOutside when focus stays inside', () => {
    const onFocusOutside = vi.fn();
    const insideButton = document.createElement('button');
    layer.appendChild(insideButton);

    const cleanup = createDismissableLayer(layer, { onFocusOutside });

    insideButton.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    expect(onFocusOutside).not.toHaveBeenCalled();

    cleanup();
  });

  it('calls onInteractOutside for all outside interactions', () => {
    const onInteractOutside = vi.fn();
    const cleanup = createDismissableLayer(layer, { onInteractOutside });

    // Escape
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onInteractOutside).toHaveBeenCalledTimes(1);

    // Click outside
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(onInteractOutside).toHaveBeenCalledTimes(2);

    cleanup();
  });

  it('respects excludeElements option', () => {
    const excludedElement = document.createElement('div');
    document.body.appendChild(excludedElement);

    const onPointerDownOutside = vi.fn();
    const cleanup = createDismissableLayer(layer, {
      onPointerDownOutside,
      excludeElements: [excludedElement],
    });

    excludedElement.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    expect(onPointerDownOutside).not.toHaveBeenCalled();

    cleanup();
    excludedElement.remove();
  });

  it('handles touch events as fallback', () => {
    const onPointerDownOutside = vi.fn();
    const cleanup = createDismissableLayer(layer, { onPointerDownOutside });

    document.body.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }));

    expect(onPointerDownOutside).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it('sets data-dismissable-layer attribute', () => {
    const cleanup = createDismissableLayer(layer);

    expect(layer.hasAttribute('data-dismissable-layer')).toBe(true);

    cleanup();

    expect(layer.hasAttribute('data-dismissable-layer')).toBe(false);
  });

  it('removes listeners on cleanup', () => {
    const onEscapeKeyDown = vi.fn();
    const onPointerDownOutside = vi.fn();

    const cleanup = createDismissableLayer(layer, {
      onEscapeKeyDown,
      onPointerDownOutside,
    });

    cleanup();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    expect(onEscapeKeyDown).not.toHaveBeenCalled();
    expect(onPointerDownOutside).not.toHaveBeenCalled();
  });

  it('does nothing when disabled', () => {
    const onDismiss = vi.fn();
    const cleanup = createDismissableLayer(layer, {
      enabled: false,
      onDismiss,
    });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(onDismiss).not.toHaveBeenCalled();

    cleanup();
  });

  it('returns no-op cleanup in SSR environment', () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error Testing SSR
    delete globalThis.window;

    const cleanup = createDismissableLayer(layer);
    expect(cleanup).toBeInstanceOf(Function);

    globalThis.window = originalWindow;
  });
});

describe('createDismissableLayerStack', () => {
  let layer1: HTMLDivElement;
  let layer2: HTMLDivElement;

  beforeEach(() => {
    layer1 = document.createElement('div');
    layer2 = document.createElement('div');
    document.body.appendChild(layer1);
    document.body.appendChild(layer2);
    clearDismissableLayerStack();
  });

  afterEach(() => {
    layer1.remove();
    layer2.remove();
    clearDismissableLayerStack();
  });

  it('adds layers to stack', () => {
    const cleanup1 = createDismissableLayerStack(layer1);
    expect(getDismissableLayerStack()).toHaveLength(1);

    const cleanup2 = createDismissableLayerStack(layer2);
    expect(getDismissableLayerStack()).toHaveLength(2);

    cleanup1();
    cleanup2();
  });

  it('removes layers from stack on cleanup', () => {
    const cleanup1 = createDismissableLayerStack(layer1);
    const cleanup2 = createDismissableLayerStack(layer2);

    expect(getDismissableLayerStack()).toHaveLength(2);

    cleanup2();
    expect(getDismissableLayerStack()).toHaveLength(1);
    expect(getDismissableLayerStack()[0]).toBe(layer1);

    cleanup1();
    expect(getDismissableLayerStack()).toHaveLength(0);
  });

  it('dismisses only the topmost layer on Escape', () => {
    const onDismiss1 = vi.fn();
    const onDismiss2 = vi.fn();

    const cleanup1 = createDismissableLayerStack(layer1, { onDismiss: onDismiss1 });
    const cleanup2 = createDismissableLayerStack(layer2, { onDismiss: onDismiss2 });

    // A single Escape dismisses ONLY the topmost layer (layer2), never the one
    // beneath it. onDismiss1 firing here is the regression this test guards.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onDismiss2).toHaveBeenCalledTimes(1);
    expect(onDismiss1).not.toHaveBeenCalled();

    // Once the top layer unmounts, the next Escape falls through to the layer
    // beneath it -- one Escape pops one layer, top-down.
    cleanup2();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onDismiss1).toHaveBeenCalledTimes(1);

    cleanup1();
  });
});

describe('getDismissableLayerStack', () => {
  beforeEach(() => {
    clearDismissableLayerStack();
  });

  afterEach(() => {
    clearDismissableLayerStack();
  });

  it('returns a copy of the stack', () => {
    const layer = document.createElement('div');
    document.body.appendChild(layer);

    const cleanup = createDismissableLayerStack(layer);
    const stack = getDismissableLayerStack();

    expect(stack).toEqual([layer]);
    expect(stack).not.toBe(getDismissableLayerStack()); // Different array instance

    cleanup();
    layer.remove();
  });
});
