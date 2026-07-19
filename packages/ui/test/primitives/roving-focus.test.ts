import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createRovingFocus,
  focusItem,
  getCurrentIndex,
  refreshRovingFocus,
} from '../../src/primitives/roving-focus';

describe('createRovingFocus', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  function createItems(count: number, role = 'menuitem'): HTMLButtonElement[] {
    const items: HTMLButtonElement[] = [];
    for (let i = 0; i < count; i++) {
      const item = document.createElement('button');
      item.textContent = `Item ${i + 1}`;
      item.setAttribute('role', role);
      container.appendChild(item);
      items.push(item);
    }
    return items;
  }

  it('initializes with first item having tabindex=0', () => {
    const items = createItems(3);
    const cleanup = createRovingFocus(container);

    expect(items[0]?.getAttribute('tabindex')).toBe('0');
    expect(items[1]?.getAttribute('tabindex')).toBe('-1');
    expect(items[2]?.getAttribute('tabindex')).toBe('-1');

    cleanup();
  });

  it('navigates with ArrowRight in horizontal orientation', () => {
    const items = createItems(3);
    const onNavigate = vi.fn();
    const cleanup = createRovingFocus(container, {
      orientation: 'horizontal',
      onNavigate,
    });

    items[0]?.focus();

    // Arrow Right to next
    const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    container.dispatchEvent(rightEvent);

    expect(document.activeElement).toBe(items[1]);
    expect(onNavigate).toHaveBeenCalledWith(items[1], 1);

    cleanup();
  });

  it('navigates with ArrowDown in vertical orientation', () => {
    const items = createItems(3);
    const cleanup = createRovingFocus(container, {
      orientation: 'vertical',
    });

    items[0]?.focus();

    const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
    container.dispatchEvent(downEvent);

    expect(document.activeElement).toBe(items[1]);

    cleanup();
  });

  it('wraps navigation when loop is enabled', () => {
    const items = createItems(3);
    const cleanup = createRovingFocus(container, {
      orientation: 'horizontal',
      loop: true,
    });

    // Focus last item
    items[2]?.focus();
    container.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    // Arrow Right should wrap to first
    const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    container.dispatchEvent(rightEvent);

    expect(document.activeElement).toBe(items[0]);

    cleanup();
  });

  it('does not wrap navigation when loop is disabled', () => {
    const items = createItems(3);
    const cleanup = createRovingFocus(container, {
      orientation: 'horizontal',
      loop: false,
    });

    // Focus last item
    items[2]?.focus();
    container.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    // Arrow Right should stay on last
    const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    container.dispatchEvent(rightEvent);

    expect(document.activeElement).toBe(items[2]);

    cleanup();
  });

  it('navigates to first item with Home key', () => {
    const items = createItems(3);
    const cleanup = createRovingFocus(container);

    items[2]?.focus();
    container.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    const homeEvent = new KeyboardEvent('keydown', { key: 'Home', bubbles: true });
    container.dispatchEvent(homeEvent);

    expect(document.activeElement).toBe(items[0]);

    cleanup();
  });

  it('navigates to last item with End key', () => {
    const items = createItems(3);
    const cleanup = createRovingFocus(container);

    items[0]?.focus();

    const endEvent = new KeyboardEvent('keydown', { key: 'End', bubbles: true });
    container.dispatchEvent(endEvent);

    expect(document.activeElement).toBe(items[2]);

    cleanup();
  });

  it('respects RTL direction for horizontal navigation', () => {
    const items = createItems(3);
    const cleanup = createRovingFocus(container, {
      orientation: 'horizontal',
      dir: 'rtl',
    });

    items[0]?.focus();

    // In RTL, ArrowLeft moves forward
    const leftEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true });
    container.dispatchEvent(leftEvent);

    expect(document.activeElement).toBe(items[1]);

    cleanup();
  });

  it('skips disabled items', () => {
    const items = createItems(3);
    items[1]?.setAttribute('disabled', '');

    const cleanup = createRovingFocus(container, {
      orientation: 'horizontal',
    });

    items[0]?.focus();

    const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    container.dispatchEvent(rightEvent);

    // Should skip disabled item and go to item 2
    expect(document.activeElement).toBe(items[2]);

    cleanup();
  });

  it('skips aria-disabled items', () => {
    const items = createItems(3);
    items[1]?.setAttribute('aria-disabled', 'true');

    const cleanup = createRovingFocus(container, {
      orientation: 'horizontal',
    });

    items[0]?.focus();

    const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    container.dispatchEvent(rightEvent);

    expect(document.activeElement).toBe(items[2]);

    cleanup();
  });

  it('updates tabindex on focus change', () => {
    const items = createItems(3);
    const cleanup = createRovingFocus(container);

    // Initially item 0 has tabindex=0
    expect(items[0]?.getAttribute('tabindex')).toBe('0');

    // Focus item 2
    items[2]?.focus();
    container.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    // Now item 2 should have tabindex=0
    expect(items[0]?.getAttribute('tabindex')).toBe('-1');
    expect(items[2]?.getAttribute('tabindex')).toBe('0');

    cleanup();
  });

  it('supports both orientation', () => {
    const items = createItems(4);
    const cleanup = createRovingFocus(container, {
      orientation: 'both',
    });

    items[0]?.focus();

    // ArrowRight works
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement).toBe(items[1]);

    // ArrowDown also works
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(items[2]);

    cleanup();
  });

  it('removes listeners on cleanup', () => {
    const items = createItems(3);
    const onNavigate = vi.fn();
    const cleanup = createRovingFocus(container, { onNavigate });

    cleanup();

    items[0]?.focus();
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('returns no-op cleanup in SSR environment', () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error Testing SSR
    delete globalThis.window;

    const cleanup = createRovingFocus(container);
    expect(cleanup).toBeInstanceOf(Function);

    globalThis.window = originalWindow;
  });
});

describe('createRovingFocus 2D (columns)', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  // A 2x2 grid of roving cells, matching the ARIA grid conformance fixtures.
  function createGrid(count: number): HTMLButtonElement[] {
    const items: HTMLButtonElement[] = [];
    for (let i = 0; i < count; i++) {
      const item = document.createElement('button');
      item.setAttribute('data-roving-item', '');
      container.appendChild(item);
      items.push(item);
    }
    return items;
  }

  it('roves in two dimensions: Left/Right by 1, Up/Down by a row', () => {
    const items = createGrid(4);
    const cleanup = createRovingFocus(container, { columns: 2 });

    expect(items[0]?.getAttribute('tabindex')).toBe('0');
    expect(items[1]?.getAttribute('tabindex')).toBe('-1');

    items[0]?.focus();
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement).toBe(items[1]);
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(items[3]);
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(document.activeElement).toBe(items[2]);
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(document.activeElement).toBe(items[0]);

    cleanup();
  });

  it('Home/End jump to the first/last cell', () => {
    const items = createGrid(4);
    const cleanup = createRovingFocus(container, { columns: 2 });

    items[0]?.focus();
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(document.activeElement).toBe(items[3]);
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(document.activeElement).toBe(items[0]);

    cleanup();
  });

  it('clamps at the edges (no wrap)', () => {
    const items = createGrid(4);
    const cleanup = createRovingFocus(container, { columns: 2 });

    // Top-left: Up and Left stay put.
    items[0]?.focus();
    container.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(document.activeElement).toBe(items[0]);
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(document.activeElement).toBe(items[0]);

    // Bottom-right: Down and Right stay put.
    items[3]?.focus();
    container.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(items[3]);
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement).toBe(items[3]);

    cleanup();
  });
});

describe('focusItem', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('focuses item at specified index', () => {
    const item1 = document.createElement('button');
    const item2 = document.createElement('button');
    item1.setAttribute('role', 'menuitem');
    item2.setAttribute('role', 'menuitem');
    container.appendChild(item1);
    container.appendChild(item2);

    const result = focusItem(container, 1);

    expect(result).toBe(true);
    expect(document.activeElement).toBe(item2);
    expect(item2.getAttribute('tabindex')).toBe('0');
  });

  it('returns false for invalid index', () => {
    const item = document.createElement('button');
    item.setAttribute('role', 'menuitem');
    container.appendChild(item);

    const result = focusItem(container, 5);

    expect(result).toBe(false);
  });
});

describe('getCurrentIndex', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('returns index of focused item', () => {
    const item1 = document.createElement('button');
    const item2 = document.createElement('button');
    item1.setAttribute('role', 'menuitem');
    item2.setAttribute('role', 'menuitem');
    container.appendChild(item1);
    container.appendChild(item2);

    item2.focus();

    expect(getCurrentIndex(container)).toBe(1);
  });

  it('returns -1 when no item is focused', () => {
    const item = document.createElement('button');
    item.setAttribute('role', 'menuitem');
    container.appendChild(item);

    expect(getCurrentIndex(container)).toBe(-1);
  });
});

describe('refreshRovingFocus', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('updates tabindex after DOM changes', () => {
    const item1 = document.createElement('button');
    const item2 = document.createElement('button');
    item1.setAttribute('role', 'menuitem');
    item2.setAttribute('role', 'menuitem');
    container.appendChild(item1);
    container.appendChild(item2);

    refreshRovingFocus(container, 1);

    expect(item1.getAttribute('tabindex')).toBe('-1');
    expect(item2.getAttribute('tabindex')).toBe('0');
  });

  it('clamps index to valid range', () => {
    const item1 = document.createElement('button');
    const item2 = document.createElement('button');
    item1.setAttribute('role', 'menuitem');
    item2.setAttribute('role', 'menuitem');
    container.appendChild(item1);
    container.appendChild(item2);

    refreshRovingFocus(container, 100);

    // Should clamp to last item
    expect(item2.getAttribute('tabindex')).toBe('0');
  });
});
