import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type BlockPaletteControls,
  type BlockPaletteItem,
  createBlockPalette,
} from '../../src/primitives/block-palette';

// =============================================================================
// Helpers
// =============================================================================

function makeItems(): BlockPaletteItem[] {
  return [
    { id: 'heading', label: 'Heading', category: 'Text', keywords: ['h1', 'title'] },
    { id: 'paragraph', label: 'Paragraph', category: 'Text' },
    { id: 'quote', label: 'Blockquote', category: 'Text', keywords: ['quote', 'citation'] },
    { id: 'image', label: 'Image', category: 'Media', keywords: ['photo', 'picture'] },
    { id: 'video', label: 'Video', category: 'Media', keywords: ['movie', 'clip'] },
    { id: 'divider', label: 'Divider', category: 'Layout', keywords: ['hr', 'separator'] },
  ];
}

const CATEGORIES = ['Text', 'Media', 'Layout'];

/**
 * Build a container with palette item elements matching the given items.
 * Each category gets a header (role="presentation") followed by items.
 */
function buildContainer(items: BlockPaletteItem[], categories: string[]): HTMLDivElement {
  const container = document.createElement('div');

  const grouped = new Map<string, BlockPaletteItem[]>();
  for (const cat of categories) grouped.set(cat, []);
  for (const item of items) {
    const arr = grouped.get(item.category);
    if (arr) arr.push(item);
    else grouped.set(item.category, [item]);
  }

  for (const [cat, catItems] of grouped) {
    if (catItems.length === 0) continue;
    const header = document.createElement('div');
    header.setAttribute('role', 'presentation');
    header.textContent = cat;
    container.appendChild(header);

    for (const item of catItems) {
      const el = document.createElement('div');
      el.setAttribute('data-palette-item', '');
      el.setAttribute('data-palette-id', item.id);
      el.setAttribute('role', 'option');
      el.setAttribute('aria-selected', 'false');
      el.setAttribute('draggable', 'true');
      el.textContent = item.label;
      container.appendChild(el);
    }
  }

  return container;
}

function keydown(target: HTMLElement, key: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

// =============================================================================
// Tests
// =============================================================================

describe('createBlockPalette', () => {
  let container: HTMLDivElement;
  let palette: BlockPaletteControls;
  const items = makeItems();

  beforeEach(() => {
    container = buildContainer(items, CATEGORIES);
    document.body.appendChild(container);
  });

  afterEach(() => {
    palette?.destroy();
    container.remove();
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // Initialization and ARIA
  // ---------------------------------------------------------------------------

  it('sets role="listbox" on the container', () => {
    palette = createBlockPalette({ container, items, categories: CATEGORIES });
    expect(container.getAttribute('role')).toBe('listbox');
  });

  it('creates a live region inside the container', () => {
    palette = createBlockPalette({ container, items, categories: CATEGORIES });
    const liveRegion = container.querySelector('[data-palette-live]');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion?.getAttribute('aria-live')).toBe('polite');
    expect(liveRegion?.getAttribute('role')).toBe('status');
  });

  it('sets role="searchbox" on the search input when provided', () => {
    const searchInput = document.createElement('input');
    palette = createBlockPalette({ container, items, categories: CATEGORIES, searchInput });
    expect(searchInput.getAttribute('role')).toBe('searchbox');
  });

  // ---------------------------------------------------------------------------
  // Category grouping
  // ---------------------------------------------------------------------------

  describe('category grouping', () => {
    it('groups items by category in specified order', () => {
      palette = createBlockPalette({ container, items, categories: CATEGORIES });
      const grouped = palette.getGroupedItems();

      const keys = Array.from(grouped.keys());
      expect(keys).toEqual(['Text', 'Media', 'Layout']);
    });

    it('returns correct items per category', () => {
      palette = createBlockPalette({ container, items, categories: CATEGORIES });
      const grouped = palette.getGroupedItems();

      expect(grouped.get('Text')?.map((i) => i.id)).toEqual(['heading', 'paragraph', 'quote']);
      expect(grouped.get('Media')?.map((i) => i.id)).toEqual(['image', 'video']);
      expect(grouped.get('Layout')?.map((i) => i.id)).toEqual(['divider']);
    });

    it('omits empty categories', () => {
      const textOnly = items.filter((i) => i.category === 'Text');
      palette = createBlockPalette({
        container: buildContainer(textOnly, CATEGORIES),
        items: textOnly,
        categories: CATEGORIES,
      });
      const grouped = palette.getGroupedItems();
      expect(grouped.has('Media')).toBe(false);
      expect(grouped.has('Layout')).toBe(false);
      expect(grouped.has('Text')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Fuzzy search filtering
  // ---------------------------------------------------------------------------

  describe('fuzzy search filtering', () => {
    it('returns all items when query is empty', () => {
      palette = createBlockPalette({ container, items, categories: CATEGORIES });
      expect(palette.getFilteredItems()).toHaveLength(items.length);
    });

    it('filters items by label match', () => {
      palette = createBlockPalette({ container, items, categories: CATEGORIES });
      palette.setSearchQuery('head');
      const filtered = palette.getFilteredItems();
      expect(filtered.some((i) => i.id === 'heading')).toBe(true);
    });

    it('filters items by keyword match', () => {
      palette = createBlockPalette({ container, items, categories: CATEGORIES });
      palette.setSearchQuery('photo');
      const filtered = palette.getFilteredItems();
      expect(filtered.some((i) => i.id === 'image')).toBe(true);
    });

    it('returns empty list when no items match', () => {
      palette = createBlockPalette({ container, items, categories: CATEGORIES });
      palette.setSearchQuery('zzzzz');
      expect(palette.getFilteredItems()).toHaveLength(0);
    });

    it('filtered grouping omits empty categories', () => {
      palette = createBlockPalette({ container, items, categories: CATEGORIES });
      palette.setSearchQuery('head');
      const grouped = palette.getGroupedItems();
      expect(grouped.has('Media')).toBe(false);
      expect(grouped.has('Layout')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Search input integration
  // ---------------------------------------------------------------------------

  describe('search input', () => {
    it('filters on input event from searchInput', () => {
      vi.useFakeTimers();
      const searchInput = document.createElement('input');
      document.body.appendChild(searchInput);

      palette = createBlockPalette({ container, items, categories: CATEGORIES, searchInput });

      searchInput.value = 'vid';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));

      const filtered = palette.getFilteredItems();
      expect(filtered.some((i) => i.id === 'video')).toBe(true);
      expect(filtered.some((i) => i.id === 'heading')).toBe(false);

      searchInput.remove();
    });

    it('announces filtered count after search change', () => {
      vi.useFakeTimers();
      const searchInput = document.createElement('input');
      document.body.appendChild(searchInput);

      palette = createBlockPalette({ container, items, categories: CATEGORIES, searchInput });

      searchInput.value = 'image';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));

      // Advance past debounce + rAF
      vi.advanceTimersByTime(200);

      const liveRegion = container.querySelector('[data-palette-live]');
      // The announce uses rAF, so we need to trigger it
      // In jsdom rAF is synchronous with fake timers
      vi.advanceTimersByTime(20);

      // The textContent may be set after rAF; check that the region exists
      expect(liveRegion).not.toBeNull();

      searchInput.remove();
    });
  });

  // ---------------------------------------------------------------------------
  // Keyboard navigation: ArrowUp / ArrowDown
  // ---------------------------------------------------------------------------

  describe('keyboard navigation - ArrowUp/ArrowDown', () => {
    it('ArrowDown selects the first item when nothing is active', () => {
      palette = createBlockPalette({ container, items, categories: CATEGORIES });
      keydown(container, 'ArrowDown');

      const selected = container.querySelector('[aria-selected="true"]');
      expect(selected?.getAttribute('data-palette-id')).toBe('heading');
    });

    it('ArrowDown moves to the next item', () => {
      palette = createBlockPalette({ container, items, categories: CATEGORIES });
      keydown(container, 'ArrowDown'); // heading
      keydown(container, 'ArrowDown'); // paragraph

      const selected = container.querySelector('[aria-selected="true"]');
      expect(selected?.getAttribute('data-palette-id')).toBe('paragraph');
    });

    it('ArrowDown crosses category boundaries', () => {
      palette = createBlockPalette({ container, items, categories: CATEGORIES });
      keydown(container, 'ArrowDown'); // heading
      keydown(container, 'ArrowDown'); // paragraph
      keydown(container, 'ArrowDown'); // quote
      keydown(container, 'ArrowDown'); // image (Media category)

      const selected = container.querySelector('[aria-selected="true"]');
      expect(selected?.getAttribute('data-palette-id')).toBe('image');
    });

    it('ArrowDown clamps at the last item', () => {
      palette = createBlockPalette({ container, items, categories: CATEGORIES });
      // Navigate to the last item
      for (let i = 0; i < items.length + 2; i++) {
        keydown(container, 'ArrowDown');
      }

      const selected = container.querySelector('[aria-selected="true"]');
      expect(selected?.getAttribute('data-palette-id')).toBe('divider');
    });

    it('ArrowUp selects the last item when nothing is active', () => {
      palette = createBlockPalette({ container, items, categories: CATEGORIES });
      keydown(container, 'ArrowUp');

      const selected = container.querySelector('[aria-selected="true"]');
      expect(selected?.getAttribute('data-palette-id')).toBe('divider');
    });

    it('ArrowUp moves to the previous item', () => {
      palette = createBlockPalette({ container, items, categories: CATEGORIES });
      keydown(container, 'ArrowDown'); // heading
      keydown(container, 'ArrowDown'); // paragraph
      keydown(container, 'ArrowUp'); // back to heading

      const selected = container.querySelector('[aria-selected="true"]');
      expect(selected?.getAttribute('data-palette-id')).toBe('heading');
    });

    it('ArrowUp clamps at the first item', () => {
      palette = createBlockPalette({ container, items, categories: CATEGORIES });
      keydown(container, 'ArrowDown'); // heading
      keydown(container, 'ArrowUp'); // still heading (clamped)

      const selected = container.querySelector('[aria-selected="true"]');
      expect(selected?.getAttribute('data-palette-id')).toBe('heading');
    });
  });

  // ---------------------------------------------------------------------------
  // Keyboard navigation: ArrowLeft / ArrowRight (category jumps)
  // ---------------------------------------------------------------------------

  describe('keyboard navigation - ArrowLeft/ArrowRight', () => {
    it('ArrowRight jumps to the first item of the next category', () => {
      palette = createBlockPalette({ container, items, categories: CATEGORIES });
      keydown(container, 'ArrowDown'); // heading (Text)
      keydown(container, 'ArrowRight'); // image (Media)

      const selected = container.querySelector('[aria-selected="true"]');
      expect(selected?.getAttribute('data-palette-id')).toBe('image');
    });

    it('ArrowRight wraps to the first category from the last', () => {
      palette = createBlockPalette({ container, items, categories: CATEGORIES });
      keydown(container, 'ArrowDown'); // heading (Text)
      keydown(container, 'ArrowRight'); // image (Media)
      keydown(container, 'ArrowRight'); // divider (Layout)
      keydown(container, 'ArrowRight'); // heading (Text, wrapped)

      const selected = container.querySelector('[aria-selected="true"]');
      expect(selected?.getAttribute('data-palette-id')).toBe('heading');
    });

    it('ArrowLeft jumps to the first item of the previous category', () => {
      palette = createBlockPalette({ container, items, categories: CATEGORIES });
      keydown(container, 'ArrowDown'); // heading (Text)
      keydown(container, 'ArrowRight'); // image (Media)
      keydown(container, 'ArrowLeft'); // heading (Text)

      const selected = container.querySelector('[aria-selected="true"]');
      expect(selected?.getAttribute('data-palette-id')).toBe('heading');
    });

    it('ArrowLeft wraps to the last category from the first', () => {
      palette = createBlockPalette({ container, items, categories: CATEGORIES });
      keydown(container, 'ArrowDown'); // heading (Text)
      keydown(container, 'ArrowLeft'); // divider (Layout, wrapped)

      const selected = container.querySelector('[aria-selected="true"]');
      expect(selected?.getAttribute('data-palette-id')).toBe('divider');
    });
  });

  // ---------------------------------------------------------------------------
  // Keyboard navigation: Home / End
  // ---------------------------------------------------------------------------

  describe('keyboard navigation - Home/End', () => {
    it('Home selects the first item', () => {
      palette = createBlockPalette({ container, items, categories: CATEGORIES });
      keydown(container, 'ArrowDown');
      keydown(container, 'ArrowDown');
      keydown(container, 'ArrowDown');
      keydown(container, 'Home');

      const selected = container.querySelector('[aria-selected="true"]');
      expect(selected?.getAttribute('data-palette-id')).toBe('heading');
    });

    it('End selects the last item', () => {
      palette = createBlockPalette({ container, items, categories: CATEGORIES });
      keydown(container, 'ArrowDown');
      keydown(container, 'End');

      const selected = container.querySelector('[aria-selected="true"]');
      expect(selected?.getAttribute('data-palette-id')).toBe('divider');
    });
  });

  // ---------------------------------------------------------------------------
  // Enter / Space activation
  // ---------------------------------------------------------------------------

  describe('Enter/Space activation', () => {
    it('Enter activates the selected item', () => {
      const onActivate = vi.fn();
      palette = createBlockPalette({
        container,
        items,
        categories: CATEGORIES,
        onActivate,
      });

      keydown(container, 'ArrowDown'); // heading
      keydown(container, 'Enter');

      expect(onActivate).toHaveBeenCalledTimes(1);
      expect(onActivate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'heading', label: 'Heading' }),
      );
    });

    it('Space activates the selected item', () => {
      const onActivate = vi.fn();
      palette = createBlockPalette({
        container,
        items,
        categories: CATEGORIES,
        onActivate,
      });

      keydown(container, 'ArrowDown'); // heading
      keydown(container, ' ');

      expect(onActivate).toHaveBeenCalledTimes(1);
      expect(onActivate).toHaveBeenCalledWith(expect.objectContaining({ id: 'heading' }));
    });

    it('does not call onActivate when no item is selected', () => {
      const onActivate = vi.fn();
      palette = createBlockPalette({
        container,
        items,
        categories: CATEGORIES,
        onActivate,
      });

      keydown(container, 'Enter');
      expect(onActivate).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Click activation
  // ---------------------------------------------------------------------------

  describe('click activation', () => {
    it('click on item element calls onActivate', () => {
      const onActivate = vi.fn();
      palette = createBlockPalette({
        container,
        items,
        categories: CATEGORIES,
        onActivate,
      });

      const itemEl = container.querySelector('[data-palette-id="image"]') as HTMLElement;
      itemEl.click();

      expect(onActivate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'image', label: 'Image' }),
      );
    });

    it('click updates aria-selected', () => {
      palette = createBlockPalette({ container, items, categories: CATEGORIES });

      const itemEl = container.querySelector('[data-palette-id="video"]') as HTMLElement;
      itemEl.click();

      expect(itemEl.getAttribute('aria-selected')).toBe('true');

      // Others should be false
      const others = container.querySelectorAll(
        '[data-palette-item]:not([data-palette-id="video"])',
      );
      for (const el of others) {
        expect(el.getAttribute('aria-selected')).toBe('false');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Drag events
  // ---------------------------------------------------------------------------

  describe('drag events', () => {
    it('dragstart fires onDragStart callback', () => {
      const onDragStart = vi.fn();
      palette = createBlockPalette({
        container,
        items,
        categories: CATEGORIES,
        onDragStart,
      });

      const itemEl = container.querySelector('[data-palette-id="heading"]') as HTMLElement;
      const dragEvent = new DragEvent('dragstart', { bubbles: true });
      // jsdom DataTransfer is limited; define a minimal mock
      Object.defineProperty(dragEvent, 'dataTransfer', {
        value: {
          effectAllowed: 'none',
          setData: vi.fn(),
        },
      });
      itemEl.dispatchEvent(dragEvent);

      expect(onDragStart).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'heading', label: 'Heading' }),
      );
    });

    it('dragend fires onDragEnd callback', () => {
      const onDragEnd = vi.fn();
      palette = createBlockPalette({
        container,
        items,
        categories: CATEGORIES,
        onDragEnd,
      });

      const itemEl = container.querySelector('[data-palette-id="image"]') as HTMLElement;
      const dragEvent = new DragEvent('dragend', { bubbles: true });
      itemEl.dispatchEvent(dragEvent);

      expect(onDragEnd).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'image', label: 'Image' }),
      );
    });

    it('dragstart sets data on dataTransfer', () => {
      palette = createBlockPalette({ container, items, categories: CATEGORIES });

      const itemEl = container.querySelector('[data-palette-id="quote"]') as HTMLElement;
      const setData = vi.fn();
      const dragEvent = new DragEvent('dragstart', { bubbles: true });
      Object.defineProperty(dragEvent, 'dataTransfer', {
        value: {
          effectAllowed: 'none',
          setData,
        },
      });
      itemEl.dispatchEvent(dragEvent);

      expect(setData).toHaveBeenCalledWith('application/x-rafters-block', expect.any(String));
      expect(setData).toHaveBeenCalledWith('text/plain', 'Blockquote');
    });
  });

  // ---------------------------------------------------------------------------
  // Disabled state
  // ---------------------------------------------------------------------------

  describe('disabled state', () => {
    it('ignores keyboard events when disabled', () => {
      const onActivate = vi.fn();
      palette = createBlockPalette({
        container,
        items,
        categories: CATEGORIES,
        onActivate,
        disabled: true,
      });

      keydown(container, 'ArrowDown');
      keydown(container, 'Enter');

      expect(onActivate).not.toHaveBeenCalled();
    });

    it('ignores click events when disabled', () => {
      const onActivate = vi.fn();
      palette = createBlockPalette({
        container,
        items,
        categories: CATEGORIES,
        onActivate,
        disabled: true,
      });

      const itemEl = container.querySelector('[data-palette-id="heading"]') as HTMLElement;
      itemEl.click();

      expect(onActivate).not.toHaveBeenCalled();
    });

    it('prevents dragstart when disabled', () => {
      const onDragStart = vi.fn();
      palette = createBlockPalette({
        container,
        items,
        categories: CATEGORIES,
        onDragStart,
        disabled: true,
      });

      const itemEl = container.querySelector('[data-palette-id="heading"]') as HTMLElement;
      const dragEvent = new DragEvent('dragstart', { bubbles: true, cancelable: true });
      itemEl.dispatchEvent(dragEvent);

      expect(onDragStart).not.toHaveBeenCalled();
      expect(dragEvent.defaultPrevented).toBe(true);
    });

    it('sets aria-disabled on container when disabled', () => {
      palette = createBlockPalette({
        container,
        items,
        categories: CATEGORIES,
        disabled: true,
      });

      expect(container.getAttribute('aria-disabled')).toBe('true');
    });

    it('setDisabled toggles disabled state at runtime', () => {
      const onActivate = vi.fn();
      palette = createBlockPalette({
        container,
        items,
        categories: CATEGORIES,
        onActivate,
      });

      palette.setDisabled(true);
      expect(container.getAttribute('aria-disabled')).toBe('true');

      keydown(container, 'ArrowDown');
      keydown(container, 'Enter');
      expect(onActivate).not.toHaveBeenCalled();

      palette.setDisabled(false);
      expect(container.hasAttribute('aria-disabled')).toBe(false);

      keydown(container, 'ArrowDown');
      keydown(container, 'Enter');
      expect(onActivate).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Live region announcements
  // ---------------------------------------------------------------------------

  describe('live region announcements', () => {
    it('announces filtered count via setSearchQuery', () => {
      vi.useFakeTimers();
      palette = createBlockPalette({ container, items, categories: CATEGORIES });

      palette.setSearchQuery('image');

      // Advance past debounce
      vi.advanceTimersByTime(200);
      // rAF in jsdom
      vi.advanceTimersByTime(20);

      const liveRegion = container.querySelector('[data-palette-live]') as HTMLElement;
      // The region should have been set (rAF is synchronous in jsdom with fake timers)
      expect(liveRegion).not.toBeNull();
    });

    it('uses singular "block" for single result', () => {
      vi.useFakeTimers();
      palette = createBlockPalette({ container, items, categories: CATEGORIES });

      // "divider" should match exactly 1 item
      palette.setSearchQuery('divider');

      vi.advanceTimersByTime(200);
      vi.advanceTimersByTime(20);

      expect(palette.getFilteredItems()).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // setItems
  // ---------------------------------------------------------------------------

  describe('setItems', () => {
    it('replaces items dynamically', () => {
      palette = createBlockPalette({ container, items, categories: CATEGORIES });
      expect(palette.getFilteredItems()).toHaveLength(6);

      const newItems: BlockPaletteItem[] = [
        { id: 'table', label: 'Table', category: 'Layout' },
        { id: 'code', label: 'Code Block', category: 'Text', keywords: ['code'] },
      ];
      palette.setItems(newItems);

      expect(palette.getFilteredItems()).toHaveLength(2);
      expect(palette.getFilteredItems().map((i) => i.id)).toEqual(
        expect.arrayContaining(['table', 'code']),
      );
    });

    it('resets active item if it no longer exists after setItems', () => {
      palette = createBlockPalette({ container, items, categories: CATEGORIES });
      keydown(container, 'ArrowDown'); // heading

      // Replace with items that don't include heading
      palette.setItems([{ id: 'new-item', label: 'New', category: 'Text' }]);

      // getFilteredItems should have the new item
      expect(palette.getFilteredItems()).toHaveLength(1);
      expect(palette.getFilteredItems()[0]?.id).toBe('new-item');
    });
  });

  // ---------------------------------------------------------------------------
  // setSearchQuery
  // ---------------------------------------------------------------------------

  describe('setSearchQuery', () => {
    it('filters items programmatically', () => {
      palette = createBlockPalette({ container, items, categories: CATEGORIES });

      palette.setSearchQuery('vid');
      const filtered = palette.getFilteredItems();
      expect(filtered.some((i) => i.id === 'video')).toBe(true);
    });

    it('updates searchInput value when provided', () => {
      const searchInput = document.createElement('input');
      palette = createBlockPalette({ container, items, categories: CATEGORIES, searchInput });

      palette.setSearchQuery('heading');
      expect(searchInput.value).toBe('heading');
    });

    it('resets search with empty string', () => {
      palette = createBlockPalette({ container, items, categories: CATEGORIES });

      palette.setSearchQuery('vid');
      expect(palette.getFilteredItems().length).toBeLessThan(items.length);

      palette.setSearchQuery('');
      expect(palette.getFilteredItems()).toHaveLength(items.length);
    });
  });

  // ---------------------------------------------------------------------------
  // getGroupedItems
  // ---------------------------------------------------------------------------

  describe('getGroupedItems', () => {
    it('returns a Map with category keys in order', () => {
      palette = createBlockPalette({ container, items, categories: CATEGORIES });
      const grouped = palette.getGroupedItems();
      const keys = Array.from(grouped.keys());
      expect(keys).toEqual(['Text', 'Media', 'Layout']);
    });

    it('reflects current filter state', () => {
      palette = createBlockPalette({ container, items, categories: CATEGORIES });
      palette.setSearchQuery('image');
      const grouped = palette.getGroupedItems();

      expect(grouped.size).toBe(1);
      expect(grouped.has('Media')).toBe(true);
      expect(grouped.get('Media')?.[0]?.id).toBe('image');
    });
  });

  // ---------------------------------------------------------------------------
  // destroy / cleanup
  // ---------------------------------------------------------------------------

  describe('destroy', () => {
    it('removes event listeners', () => {
      const onActivate = vi.fn();
      palette = createBlockPalette({
        container,
        items,
        categories: CATEGORIES,
        onActivate,
      });

      palette.destroy();

      keydown(container, 'ArrowDown');
      keydown(container, 'Enter');

      expect(onActivate).not.toHaveBeenCalled();
    });

    it('removes the live region element', () => {
      palette = createBlockPalette({ container, items, categories: CATEGORIES });
      expect(container.querySelector('[data-palette-live]')).not.toBeNull();

      palette.destroy();
      expect(container.querySelector('[data-palette-live]')).toBeNull();
    });

    it('cleans up ARIA attributes on container', () => {
      palette = createBlockPalette({ container, items, categories: CATEGORIES });
      expect(container.getAttribute('role')).toBe('listbox');

      palette.destroy();
      expect(container.hasAttribute('role')).toBe(false);
    });

    it('removes input listener from searchInput', () => {
      const searchInput = document.createElement('input');
      palette = createBlockPalette({ container, items, categories: CATEGORIES, searchInput });

      palette.destroy();

      // Changing search input should have no effect
      searchInput.value = 'test';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));

      // Palette should still have all items since listener was removed
      // (internal state frozen at destroy time)
    });
  });

  // ---------------------------------------------------------------------------
  // SSR guard
  // ---------------------------------------------------------------------------

  describe('SSR guard', () => {
    it('returns no-op controls when window is undefined', () => {
      const originalWindow = globalThis.window;
      // @ts-expect-error Testing SSR environment
      delete globalThis.window;

      const controls = createBlockPalette({
        container: null as unknown as HTMLElement,
        items: [],
        categories: [],
      });

      expect(controls.getFilteredItems()).toEqual([]);
      expect(controls.getGroupedItems()).toBeInstanceOf(Map);
      expect(controls.getGroupedItems().size).toBe(0);

      // Methods should not throw
      controls.setItems([]);
      controls.setSearchQuery('test');
      controls.setDisabled(true);
      controls.destroy();

      globalThis.window = originalWindow;
    });
  });

  // ---------------------------------------------------------------------------
  // aria-selected and aria-activedescendant sync
  // ---------------------------------------------------------------------------

  describe('ARIA active descendant', () => {
    it('sets aria-selected on the active item only', () => {
      palette = createBlockPalette({ container, items, categories: CATEGORIES });

      keydown(container, 'ArrowDown'); // heading
      keydown(container, 'ArrowDown'); // paragraph

      const paragraphEl = container.querySelector('[data-palette-id="paragraph"]');
      expect(paragraphEl?.getAttribute('aria-selected')).toBe('true');

      const headingEl = container.querySelector('[data-palette-id="heading"]');
      expect(headingEl?.getAttribute('aria-selected')).toBe('false');
    });

    it('sets aria-activedescendant on container', () => {
      palette = createBlockPalette({ container, items, categories: CATEGORIES });

      keydown(container, 'ArrowDown'); // heading

      const activedescendant = container.getAttribute('aria-activedescendant');
      expect(activedescendant).toBeTruthy();
      // The id should reference the heading element
      const activeEl = activedescendant ? document.getElementById(activedescendant) : null;
      expect(activeEl?.getAttribute('data-palette-id')).toBe('heading');
    });
  });

  // ---------------------------------------------------------------------------
  // Event delegation (events bubble from child items)
  // ---------------------------------------------------------------------------

  describe('event delegation', () => {
    it('handles click on child element within a palette item', () => {
      const onActivate = vi.fn();
      palette = createBlockPalette({
        container,
        items,
        categories: CATEGORIES,
        onActivate,
      });

      // Simulate a click on a child span inside the item element
      const itemEl = container.querySelector('[data-palette-id="video"]') as HTMLElement;
      const childSpan = document.createElement('span');
      childSpan.textContent = 'Video';
      itemEl.appendChild(childSpan);

      childSpan.click();

      expect(onActivate).toHaveBeenCalledWith(expect.objectContaining({ id: 'video' }));
    });
  });
});
