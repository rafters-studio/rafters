import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type BlockContextMenuControls,
  createBlockContextMenu,
} from '../../../src/primitives/editor/block-context-menu';

// =============================================================================
// Helpers
// =============================================================================

function buildCanvas(): HTMLDivElement {
  const canvas = document.createElement('div');

  // Add block elements
  for (const id of ['block-1', 'block-2', 'block-3']) {
    const block = document.createElement('div');
    block.setAttribute('data-block-id', id);
    block.textContent = `Block ${id}`;
    canvas.appendChild(block);
  }

  document.body.appendChild(canvas);
  return canvas;
}

function buildMenu(itemIds: string[]): HTMLDivElement {
  const menu = document.createElement('div');

  for (const id of itemIds) {
    const item = document.createElement('div');
    item.setAttribute('role', 'menuitem');
    item.setAttribute('data-menu-item-id', id);
    item.setAttribute('tabindex', '-1');
    item.textContent = id;
    menu.appendChild(item);
  }

  document.body.appendChild(menu);
  return menu;
}

function rightClick(target: HTMLElement, x = 100, y = 100): void {
  const event = new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
  });
  target.dispatchEvent(event);
}

function keydown(target: HTMLElement, key: string, options?: Partial<KeyboardEvent>): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...options }));
}

// =============================================================================
// Tests
// =============================================================================

describe('createBlockContextMenu', () => {
  let canvas: HTMLDivElement;
  let menu: HTMLDivElement;
  let controls: BlockContextMenuControls;

  beforeEach(() => {
    canvas = buildCanvas();
    menu = buildMenu(['edit-rules', 'settings', 'remove']);
  });

  afterEach(() => {
    controls?.destroy();
    canvas.remove();
    menu.remove();
  });

  // ---------------------------------------------------------------------------
  // Initialization and ARIA
  // ---------------------------------------------------------------------------

  it('sets role="menu" on the menu element', () => {
    const onAction = vi.fn();
    controls = createBlockContextMenu({ container: canvas, menu, onAction });
    expect(menu.getAttribute('role')).toBe('menu');
  });

  it('hides menu initially', () => {
    const onAction = vi.fn();
    controls = createBlockContextMenu({ container: canvas, menu, onAction });
    expect(menu.hidden).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Opening via right-click
  // ---------------------------------------------------------------------------

  it('opens on right-click on a block', () => {
    const onAction = vi.fn();
    const onOpen = vi.fn();
    controls = createBlockContextMenu({ container: canvas, menu, onAction, onOpen });

    const block = canvas.querySelector('[data-block-id="block-1"]') as HTMLElement;
    rightClick(block);

    expect(controls.isOpen()).toBe(true);
    expect(controls.getBlockId()).toBe('block-1');
    expect(menu.hidden).toBe(false);
    expect(onOpen).toHaveBeenCalledWith('block-1', { x: 100, y: 100 });
  });

  it('does not open when right-clicking canvas background', () => {
    const onAction = vi.fn();
    controls = createBlockContextMenu({ container: canvas, menu, onAction });

    rightClick(canvas);
    expect(controls.isOpen()).toBe(false);
  });

  it('positions menu with fixed positioning', () => {
    const onAction = vi.fn();
    controls = createBlockContextMenu({ container: canvas, menu, onAction });

    const block = canvas.querySelector('[data-block-id="block-1"]') as HTMLElement;
    rightClick(block, 200, 150);

    expect(menu.style.position).toBe('fixed');
    expect(menu.style.top).toBeTruthy();
    expect(menu.style.left).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Opening via Shift+F10
  // ---------------------------------------------------------------------------

  it('opens on Shift+F10 when block is focused', () => {
    const onAction = vi.fn();
    controls = createBlockContextMenu({ container: canvas, menu, onAction });

    // Simulate a focused block via aria-activedescendant
    const block = canvas.querySelector('[data-block-id="block-2"]') as HTMLElement;
    block.id = 'editor-block-2';
    canvas.setAttribute('aria-activedescendant', 'editor-block-2');

    // jsdom doesn't lay out, stub getBoundingClientRect
    block.getBoundingClientRect = () => ({
      top: 50,
      bottom: 80,
      left: 10,
      right: 200,
      width: 190,
      height: 30,
      x: 10,
      y: 50,
      toJSON: () => ({}),
    });

    keydown(canvas, 'F10', { shiftKey: true });

    expect(controls.isOpen()).toBe(true);
    expect(controls.getBlockId()).toBe('block-2');
  });

  // ---------------------------------------------------------------------------
  // Menu item activation
  // ---------------------------------------------------------------------------

  it('fires onAction when menu item is clicked', () => {
    const onAction = vi.fn();
    controls = createBlockContextMenu({ container: canvas, menu, onAction });

    const block = canvas.querySelector('[data-block-id="block-1"]') as HTMLElement;
    rightClick(block);

    const menuItem = menu.querySelector('[data-menu-item-id="remove"]') as HTMLElement;
    menuItem.click();

    expect(onAction).toHaveBeenCalledWith('remove', 'block-1');
    expect(controls.isOpen()).toBe(false);
  });

  it('does not fire onAction for disabled items', () => {
    const onAction = vi.fn();
    controls = createBlockContextMenu({ container: canvas, menu, onAction });

    // Disable the settings item
    const settingsItem = menu.querySelector('[data-menu-item-id="settings"]') as HTMLElement;
    settingsItem.setAttribute('aria-disabled', 'true');

    const block = canvas.querySelector('[data-block-id="block-1"]') as HTMLElement;
    rightClick(block);

    settingsItem.click();
    expect(onAction).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Keyboard navigation
  // ---------------------------------------------------------------------------

  it('ArrowDown navigates through menu items', () => {
    const onAction = vi.fn();
    controls = createBlockContextMenu({ container: canvas, menu, onAction });

    controls.open('block-1', { x: 100, y: 100 });

    // open() synchronously sets first item active (index 0)
    const items = menu.querySelectorAll('[role="menuitem"]');
    expect((items[0] as HTMLElement).getAttribute('tabindex')).toBe('0');

    // Navigate down: 0 -> 1
    keydown(menu, 'ArrowDown');
    expect((items[1] as HTMLElement).getAttribute('tabindex')).toBe('0');
    expect((items[0] as HTMLElement).getAttribute('tabindex')).toBe('-1');
  });

  it('Enter activates focused menu item', () => {
    const onAction = vi.fn();
    controls = createBlockContextMenu({ container: canvas, menu, onAction });

    controls.open('block-1', { x: 100, y: 100 });

    // open() sets activeItemIndex to 0 (edit-rules)
    // Press Enter to activate the first item
    keydown(menu, 'Enter');

    expect(onAction).toHaveBeenCalledWith('edit-rules', 'block-1');
  });

  // ---------------------------------------------------------------------------
  // Closing
  // ---------------------------------------------------------------------------

  it('closes on Escape', () => {
    const onAction = vi.fn();
    const onClose = vi.fn();
    controls = createBlockContextMenu({ container: canvas, menu, onAction, onClose });

    const block = canvas.querySelector('[data-block-id="block-1"]') as HTMLElement;
    rightClick(block);
    expect(controls.isOpen()).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(controls.isOpen()).toBe(false);
    expect(onClose).toHaveBeenCalled();
  });

  it('closes via programmatic close()', () => {
    const onAction = vi.fn();
    controls = createBlockContextMenu({ container: canvas, menu, onAction });

    const block = canvas.querySelector('[data-block-id="block-1"]') as HTMLElement;
    rightClick(block);
    controls.close();

    expect(controls.isOpen()).toBe(false);
    expect(menu.hidden).toBe(true);
  });

  it('re-opens on different block right-click while open', () => {
    const onAction = vi.fn();
    controls = createBlockContextMenu({ container: canvas, menu, onAction });

    const block1 = canvas.querySelector('[data-block-id="block-1"]') as HTMLElement;
    const block2 = canvas.querySelector('[data-block-id="block-2"]') as HTMLElement;

    rightClick(block1);
    expect(controls.getBlockId()).toBe('block-1');

    rightClick(block2);
    expect(controls.getBlockId()).toBe('block-2');
    expect(controls.isOpen()).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Destroy
  // ---------------------------------------------------------------------------

  it('removes event listeners on destroy', () => {
    const onAction = vi.fn();
    controls = createBlockContextMenu({ container: canvas, menu, onAction });
    controls.destroy();

    const block = canvas.querySelector('[data-block-id="block-1"]') as HTMLElement;
    rightClick(block);
    expect(controls.isOpen()).toBe(false);
  });

  it('cleans up ARIA attributes on destroy', () => {
    const onAction = vi.fn();
    controls = createBlockContextMenu({ container: canvas, menu, onAction });
    controls.destroy();

    expect(menu.hasAttribute('role')).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // SSR guard
  // ---------------------------------------------------------------------------

  it('returns no-op controls when window is undefined', () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error Testing SSR environment
    delete globalThis.window;

    const ssrControls = createBlockContextMenu({
      container: null as unknown as HTMLElement,
      menu: null as unknown as HTMLElement,
      onAction: () => {},
    });

    expect(ssrControls.isOpen()).toBe(false);
    expect(ssrControls.getBlockId()).toBeNull();
    ssrControls.open('x', { x: 0, y: 0 });
    ssrControls.close();
    ssrControls.destroy();

    globalThis.window = originalWindow;
  });
});
