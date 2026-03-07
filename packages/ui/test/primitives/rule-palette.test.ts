import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createRulePalette,
  type RulePaletteControls,
  type RulePaletteItem,
} from '../../src/primitives/rule-palette';

// =============================================================================
// Helpers
// =============================================================================

function makeItems(): RulePaletteItem[] {
  return [
    { id: 'required', label: 'Required', category: 'Validation', keywords: ['mandatory'] },
    {
      id: 'min-length',
      label: 'Min Length',
      category: 'Validation',
      keywords: ['minimum'],
      requiresConfig: true,
    },
    { id: 'email', label: 'Email', category: 'Type Constraints', keywords: ['mail'] },
    { id: 'url', label: 'URL', category: 'Type Constraints', keywords: ['link', 'href'] },
    { id: 'password', label: 'Password', category: 'Type Constraints' },
  ];
}

const CATEGORIES = ['Validation', 'Type Constraints'];

function buildContainer(items: RulePaletteItem[], categories: string[]): HTMLDivElement {
  const container = document.createElement('div');

  const grouped = new Map<string, RulePaletteItem[]>();
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
      el.setAttribute('data-rule-item', '');
      el.setAttribute('data-rule-id', item.id);
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

describe('createRulePalette', () => {
  let container: HTMLDivElement;
  let palette: RulePaletteControls;
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
    palette = createRulePalette({ container, items, categories: CATEGORIES });
    expect(container.getAttribute('role')).toBe('listbox');
  });

  it('creates a live region inside the container', () => {
    palette = createRulePalette({ container, items, categories: CATEGORIES });
    const liveRegion = container.querySelector('[data-rule-palette-live]');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion?.getAttribute('aria-live')).toBe('polite');
    expect(liveRegion?.getAttribute('role')).toBe('status');
  });

  it('sets role="searchbox" on the search input when provided', () => {
    const searchInput = document.createElement('input');
    palette = createRulePalette({ container, items, categories: CATEGORIES, searchInput });
    expect(searchInput.getAttribute('role')).toBe('searchbox');
  });

  // ---------------------------------------------------------------------------
  // Category grouping
  // ---------------------------------------------------------------------------

  describe('category grouping', () => {
    it('groups items by category in specified order', () => {
      palette = createRulePalette({ container, items, categories: CATEGORIES });
      const grouped = palette.getGroupedItems();
      expect(Array.from(grouped.keys())).toEqual(['Validation', 'Type Constraints']);
    });

    it('returns correct items per category', () => {
      palette = createRulePalette({ container, items, categories: CATEGORIES });
      const grouped = palette.getGroupedItems();
      expect(grouped.get('Validation')?.map((i) => i.id)).toEqual(['required', 'min-length']);
      expect(grouped.get('Type Constraints')?.map((i) => i.id)).toEqual([
        'email',
        'url',
        'password',
      ]);
    });
  });

  // ---------------------------------------------------------------------------
  // Fuzzy search
  // ---------------------------------------------------------------------------

  describe('fuzzy search', () => {
    it('returns all items when query is empty', () => {
      palette = createRulePalette({ container, items, categories: CATEGORIES });
      expect(palette.getFilteredItems()).toHaveLength(items.length);
    });

    it('filters items by label match', () => {
      palette = createRulePalette({ container, items, categories: CATEGORIES });
      palette.setSearchQuery('email');
      const filtered = palette.getFilteredItems();
      expect(filtered.some((i) => i.id === 'email')).toBe(true);
    });

    it('filters items by keyword match', () => {
      palette = createRulePalette({ container, items, categories: CATEGORIES });
      palette.setSearchQuery('mandatory');
      const filtered = palette.getFilteredItems();
      expect(filtered.some((i) => i.id === 'required')).toBe(true);
    });

    it('returns empty when no match', () => {
      palette = createRulePalette({ container, items, categories: CATEGORIES });
      palette.setSearchQuery('zzzzz');
      expect(palette.getFilteredItems()).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Keyboard navigation
  // ---------------------------------------------------------------------------

  describe('keyboard navigation', () => {
    it('ArrowDown selects the first item', () => {
      palette = createRulePalette({ container, items, categories: CATEGORIES });
      keydown(container, 'ArrowDown');
      const selected = container.querySelector('[aria-selected="true"]');
      expect(selected?.getAttribute('data-rule-id')).toBe('required');
    });

    it('ArrowDown moves through items across categories', () => {
      palette = createRulePalette({ container, items, categories: CATEGORIES });
      keydown(container, 'ArrowDown'); // required
      keydown(container, 'ArrowDown'); // min-length
      keydown(container, 'ArrowDown'); // email (Type Constraints)
      const selected = container.querySelector('[aria-selected="true"]');
      expect(selected?.getAttribute('data-rule-id')).toBe('email');
    });

    it('ArrowRight jumps to next category', () => {
      palette = createRulePalette({ container, items, categories: CATEGORIES });
      keydown(container, 'ArrowDown'); // required (Validation)
      keydown(container, 'ArrowRight'); // email (Type Constraints)
      const selected = container.querySelector('[aria-selected="true"]');
      expect(selected?.getAttribute('data-rule-id')).toBe('email');
    });

    it('Home selects first item', () => {
      palette = createRulePalette({ container, items, categories: CATEGORIES });
      keydown(container, 'End');
      keydown(container, 'Home');
      const selected = container.querySelector('[aria-selected="true"]');
      expect(selected?.getAttribute('data-rule-id')).toBe('required');
    });

    it('End selects last item', () => {
      palette = createRulePalette({ container, items, categories: CATEGORIES });
      keydown(container, 'ArrowDown');
      keydown(container, 'End');
      const selected = container.querySelector('[aria-selected="true"]');
      expect(selected?.getAttribute('data-rule-id')).toBe('password');
    });
  });

  // ---------------------------------------------------------------------------
  // Activation
  // ---------------------------------------------------------------------------

  describe('activation', () => {
    it('Enter activates the selected item', () => {
      const onActivate = vi.fn();
      palette = createRulePalette({
        container,
        items,
        categories: CATEGORIES,
        onActivate,
      });
      keydown(container, 'ArrowDown');
      keydown(container, 'Enter');
      expect(onActivate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'required', label: 'Required' }),
      );
    });

    it('click activates an item', () => {
      const onActivate = vi.fn();
      palette = createRulePalette({
        container,
        items,
        categories: CATEGORIES,
        onActivate,
      });
      const itemEl = container.querySelector('[data-rule-id="email"]') as HTMLElement;
      itemEl.click();
      expect(onActivate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'email', label: 'Email' }),
      );
    });

    it('preserves requiresConfig in activated item', () => {
      const onActivate = vi.fn();
      palette = createRulePalette({
        container,
        items,
        categories: CATEGORIES,
        onActivate,
      });
      const itemEl = container.querySelector('[data-rule-id="min-length"]') as HTMLElement;
      itemEl.click();
      expect(onActivate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'min-length', requiresConfig: true }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Drag events
  // ---------------------------------------------------------------------------

  describe('drag events', () => {
    it('dragstart sets rule MIME type on dataTransfer', () => {
      palette = createRulePalette({ container, items, categories: CATEGORIES });

      const itemEl = container.querySelector('[data-rule-id="required"]') as HTMLElement;
      const setData = vi.fn();
      const dragEvent = new DragEvent('dragstart', { bubbles: true });
      Object.defineProperty(dragEvent, 'dataTransfer', {
        value: { effectAllowed: 'none', setData },
      });
      itemEl.dispatchEvent(dragEvent);

      expect(setData).toHaveBeenCalledWith('application/x-rafters-rule', expect.any(String));
      expect(setData).toHaveBeenCalledWith('application/x-rafters-drag-data', expect.any(String));
      expect(setData).toHaveBeenCalledWith('text/plain', 'Required');
    });

    it('dragstart fires onDragStart callback', () => {
      const onDragStart = vi.fn();
      palette = createRulePalette({
        container,
        items,
        categories: CATEGORIES,
        onDragStart,
      });

      const itemEl = container.querySelector('[data-rule-id="email"]') as HTMLElement;
      const dragEvent = new DragEvent('dragstart', { bubbles: true });
      Object.defineProperty(dragEvent, 'dataTransfer', {
        value: { effectAllowed: 'none', setData: vi.fn() },
      });
      itemEl.dispatchEvent(dragEvent);

      expect(onDragStart).toHaveBeenCalledWith(expect.objectContaining({ id: 'email' }));
    });

    it('dragend fires onDragEnd callback', () => {
      const onDragEnd = vi.fn();
      palette = createRulePalette({
        container,
        items,
        categories: CATEGORIES,
        onDragEnd,
      });

      const itemEl = container.querySelector('[data-rule-id="url"]') as HTMLElement;
      itemEl.dispatchEvent(new DragEvent('dragend', { bubbles: true }));

      expect(onDragEnd).toHaveBeenCalledWith(expect.objectContaining({ id: 'url' }));
    });
  });

  // ---------------------------------------------------------------------------
  // Disabled state
  // ---------------------------------------------------------------------------

  describe('disabled state', () => {
    it('ignores keyboard when disabled', () => {
      const onActivate = vi.fn();
      palette = createRulePalette({
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

    it('sets aria-disabled on container', () => {
      palette = createRulePalette({
        container,
        items,
        categories: CATEGORIES,
        disabled: true,
      });
      expect(container.getAttribute('aria-disabled')).toBe('true');
    });

    it('prevents dragstart when disabled', () => {
      const onDragStart = vi.fn();
      palette = createRulePalette({
        container,
        items,
        categories: CATEGORIES,
        onDragStart,
        disabled: true,
      });

      const itemEl = container.querySelector('[data-rule-id="required"]') as HTMLElement;
      const dragEvent = new DragEvent('dragstart', { bubbles: true, cancelable: true });
      itemEl.dispatchEvent(dragEvent);

      expect(onDragStart).not.toHaveBeenCalled();
      expect(dragEvent.defaultPrevented).toBe(true);
    });

    it('setDisabled toggles at runtime', () => {
      const onActivate = vi.fn();
      palette = createRulePalette({
        container,
        items,
        categories: CATEGORIES,
        onActivate,
      });

      palette.setDisabled(true);
      keydown(container, 'ArrowDown');
      keydown(container, 'Enter');
      expect(onActivate).not.toHaveBeenCalled();

      palette.setDisabled(false);
      keydown(container, 'ArrowDown');
      keydown(container, 'Enter');
      expect(onActivate).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Destroy
  // ---------------------------------------------------------------------------

  describe('destroy', () => {
    it('removes event listeners', () => {
      const onActivate = vi.fn();
      palette = createRulePalette({
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

    it('removes the live region', () => {
      palette = createRulePalette({ container, items, categories: CATEGORIES });
      expect(container.querySelector('[data-rule-palette-live]')).not.toBeNull();
      palette.destroy();
      expect(container.querySelector('[data-rule-palette-live]')).toBeNull();
    });

    it('cleans up ARIA attributes', () => {
      palette = createRulePalette({ container, items, categories: CATEGORIES });
      palette.destroy();
      expect(container.hasAttribute('role')).toBe(false);
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

      const controls = createRulePalette({
        container: null as unknown as HTMLElement,
        items: [],
        categories: [],
      });

      expect(controls.getFilteredItems()).toEqual([]);
      expect(controls.getGroupedItems()).toBeInstanceOf(Map);

      controls.setItems([]);
      controls.setSearchQuery('test');
      controls.setDisabled(true);
      controls.destroy();

      globalThis.window = originalWindow;
    });
  });

  // ---------------------------------------------------------------------------
  // ARIA active descendant
  // ---------------------------------------------------------------------------

  describe('ARIA active descendant', () => {
    it('sets aria-selected on the active item only', () => {
      palette = createRulePalette({ container, items, categories: CATEGORIES });
      keydown(container, 'ArrowDown'); // required
      keydown(container, 'ArrowDown'); // min-length

      const minLengthEl = container.querySelector('[data-rule-id="min-length"]');
      expect(minLengthEl?.getAttribute('aria-selected')).toBe('true');

      const requiredEl = container.querySelector('[data-rule-id="required"]');
      expect(requiredEl?.getAttribute('aria-selected')).toBe('false');
    });

    it('sets aria-activedescendant on container', () => {
      palette = createRulePalette({ container, items, categories: CATEGORIES });
      keydown(container, 'ArrowDown');

      const activedescendant = container.getAttribute('aria-activedescendant');
      expect(activedescendant).toBeTruthy();
      const activeEl = activedescendant ? document.getElementById(activedescendant) : null;
      expect(activeEl?.getAttribute('data-rule-id')).toBe('required');
    });
  });
});
