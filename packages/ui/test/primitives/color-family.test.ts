import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ColorFamilyState } from '../../src/primitives/color-family';
import { createColorFamily } from '../../src/primitives/color-family';

const SECTION_NAMES = [
  'scale',
  'accessibility',
  'cvd',
  'weight',
  'semantic',
  'intelligence',
] as const;

describe('color-family primitive', () => {
  let container: HTMLElement;
  let state: ColorFamilyState;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    state?.destroy();
    container.remove();
  });

  it('starts in resting state with data-color-state="resting"', () => {
    state = createColorFamily(container, {});
    expect(container.getAttribute('data-color-state')).toBe('resting');
    expect(state.$state.get()).toBe('resting');
  });

  it('transitions to hover on pointerenter, sets data-color-state="hover"', () => {
    state = createColorFamily(container, {});
    container.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    expect(container.getAttribute('data-color-state')).toBe('hover');
    expect(state.$state.get()).toBe('hover');
  });

  it('transitions back to resting on pointerleave', () => {
    state = createColorFamily(container, {});
    container.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    expect(state.$state.get()).toBe('hover');
    container.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
    expect(container.getAttribute('data-color-state')).toBe('resting');
    expect(state.$state.get()).toBe('resting');
  });

  it('transitions to selected on click, sets data-color-state="selected"', () => {
    state = createColorFamily(container, {});
    container.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(container.getAttribute('data-color-state')).toBe('selected');
    expect(state.$state.get()).toBe('selected');
  });

  it('transitions to selected on Enter key', () => {
    state = createColorFamily(container, {});
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(container.getAttribute('data-color-state')).toBe('selected');
    expect(state.$state.get()).toBe('selected');
  });

  it('transitions to selected on Space key', () => {
    state = createColorFamily(container, {});
    container.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(container.getAttribute('data-color-state')).toBe('selected');
    expect(state.$state.get()).toBe('selected');
  });

  it('stays selected on pointerleave (does not go back to resting)', () => {
    state = createColorFamily(container, {});
    container.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(state.$state.get()).toBe('selected');
    container.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
    expect(container.getAttribute('data-color-state')).toBe('selected');
    expect(state.$state.get()).toBe('selected');
  });

  it('transitions back to resting on Escape key', () => {
    state = createColorFamily(container, {});
    container.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(state.$state.get()).toBe('selected');
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(container.getAttribute('data-color-state')).toBe('resting');
    expect(state.$state.get()).toBe('resting');
  });

  it('sets aria-selected="true" when selected', () => {
    state = createColorFamily(container, {});
    expect(container.getAttribute('aria-selected')).toBeNull();
    container.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(container.getAttribute('aria-selected')).toBe('true');
  });

  it('sets aria-expanded="true" when selected', () => {
    state = createColorFamily(container, {});
    expect(container.getAttribute('aria-expanded')).toBeNull();
    container.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(container.getAttribute('aria-expanded')).toBe('true');
  });

  it('removes aria-selected and aria-expanded when deselected', () => {
    state = createColorFamily(container, {});
    container.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(container.getAttribute('aria-selected')).toBe('true');
    expect(container.getAttribute('aria-expanded')).toBe('true');
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(container.getAttribute('aria-selected')).toBeNull();
    expect(container.getAttribute('aria-expanded')).toBeNull();
  });

  it('creates scale section container in hover state', () => {
    state = createColorFamily(container, {});
    expect(container.querySelector('[data-color-section="scale"]')).toBeNull();
    container.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    expect(container.querySelector('[data-color-section="scale"]')).not.toBeNull();
  });

  it('creates all section containers in selected state', () => {
    state = createColorFamily(container, {});
    container.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    for (const name of SECTION_NAMES) {
      expect(
        container.querySelector(`[data-color-section="${name}"]`),
        `expected section "${name}" to exist`,
      ).not.toBeNull();
    }
  });

  it('removes section containers when returning to resting', () => {
    state = createColorFamily(container, {});
    container.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    // All sections exist
    expect(container.querySelectorAll('[data-color-section]').length).toBe(SECTION_NAMES.length);
    // Deselect
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(container.querySelectorAll('[data-color-section]').length).toBe(0);
  });

  it('hover state only has scale section, not the others', () => {
    state = createColorFamily(container, {});
    container.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    expect(container.querySelector('[data-color-section="scale"]')).not.toBeNull();
    expect(container.querySelector('[data-color-section="accessibility"]')).toBeNull();
    expect(container.querySelector('[data-color-section="cvd"]')).toBeNull();
    expect(container.querySelector('[data-color-section="weight"]')).toBeNull();
    expect(container.querySelector('[data-color-section="semantic"]')).toBeNull();
    expect(container.querySelector('[data-color-section="intelligence"]')).toBeNull();
  });

  it('fires onStateChange callback with new state', () => {
    const states: string[] = [];
    state = createColorFamily(container, {
      onStateChange: (s) => states.push(s),
    });
    container.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    container.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
    container.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(states).toEqual(['hover', 'resting', 'selected']);
  });

  it('fires onSelect callback on select', () => {
    const onSelect = vi.fn();
    state = createColorFamily(container, { onSelect });
    container.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('fires onDeselect callback on deselect', () => {
    const onDeselect = vi.fn();
    state = createColorFamily(container, { onDeselect });
    container.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onDeselect).toHaveBeenCalledOnce();
  });

  it('destroy() removes all listeners and restores container', () => {
    state = createColorFamily(container, {});
    container.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(container.getAttribute('data-color-state')).toBe('selected');
    state.destroy();
    // After destroy, attributes should be cleaned up
    expect(container.getAttribute('data-color-state')).toBeNull();
    expect(container.getAttribute('aria-selected')).toBeNull();
    expect(container.getAttribute('aria-expanded')).toBeNull();
    expect(container.querySelectorAll('[data-color-section]').length).toBe(0);
    // Events should no longer work
    container.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    expect(container.getAttribute('data-color-state')).toBeNull();
  });

  it('programmatic select() and deselect() work', () => {
    state = createColorFamily(container, {});
    state.select();
    expect(state.$state.get()).toBe('selected');
    expect(container.getAttribute('data-color-state')).toBe('selected');
    expect(container.getAttribute('aria-selected')).toBe('true');
    state.deselect();
    expect(state.$state.get()).toBe('resting');
    expect(container.getAttribute('data-color-state')).toBe('resting');
    expect(container.getAttribute('aria-selected')).toBeNull();
  });
});
