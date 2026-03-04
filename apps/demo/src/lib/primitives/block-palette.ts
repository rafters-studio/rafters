/**
 * Block Palette primitive
 * Categorized grid of draggable composite block templates with typeahead search
 * and keyboard navigation.
 *
 * Zero npm dependencies. Leaf primitive: imports only from sibling modules.
 *
 * WCAG Compliance:
 * - 2.1.1 Keyboard (Level A): Full keyboard navigation with arrow keys
 * - 2.4.3 Focus Order (Level A): Logical focus across categories
 * - 4.1.2 Name, Role, Value (Level A): listbox/option/searchbox ARIA roles
 * - 4.1.3 Status Messages (Level AA): Live region announces filtered count
 *
 * @example
 * ```typescript
 * const palette = createBlockPalette({
 *   container: document.getElementById('palette')!,
 *   items: [
 *     { id: 'heading', label: 'Heading', category: 'Text', keywords: ['h1', 'title'] },
 *     { id: 'paragraph', label: 'Paragraph', category: 'Text' },
 *     { id: 'image', label: 'Image', category: 'Media', keywords: ['photo', 'picture'] },
 *   ],
 *   categories: ['Text', 'Media'],
 *   onActivate: (item) => insertBlock(item.id),
 *   onDragStart: (item) => console.log('Dragging:', item.label),
 * });
 * ```
 */

import { fuzzyScore } from '@/lib/primitives/typeahead';

// =============================================================================
// Types
// =============================================================================

export interface BlockPaletteItem {
  id: string;
  label: string;
  category: string;
  keywords?: string[];
}

export interface BlockPaletteOptions {
  container: HTMLElement;
  items: BlockPaletteItem[];
  /** Display order for category groups */
  categories: string[];
  /** Optional external search input; receives role="searchbox" */
  searchInput?: HTMLInputElement;
  /** Called when an item is activated via Enter, Space, or click */
  onActivate?: (item: BlockPaletteItem) => void;
  /** Called when a native drag starts on an item */
  onDragStart?: (item: BlockPaletteItem) => void;
  /** Called when a native drag ends on an item */
  onDragEnd?: (item: BlockPaletteItem) => void;
  /** Whether the palette is disabled */
  disabled?: boolean;
}

export interface BlockPaletteControls {
  setItems: (items: BlockPaletteItem[]) => void;
  setSearchQuery: (query: string) => void;
  getFilteredItems: () => BlockPaletteItem[];
  getGroupedItems: () => Map<string, BlockPaletteItem[]>;
  setDisabled: (disabled: boolean) => void;
  destroy: () => void;
}

// =============================================================================
// Helpers
// =============================================================================

/** Debounce timer id for live region announcements */
const ANNOUNCE_DELAY_MS = 150;

/**
 * Get the palette item id from a DOM element, walking up if needed.
 */
function getItemId(target: EventTarget | null, container: HTMLElement): string | null {
  let el = target as HTMLElement | null;
  while (el && el !== container) {
    if (el.hasAttribute('data-palette-item') && el.hasAttribute('data-palette-id')) {
      return el.getAttribute('data-palette-id');
    }
    el = el.parentElement;
  }
  return null;
}

/**
 * Collect all visible item elements from the container.
 */
function getItemElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>('[data-palette-item][data-palette-id]'),
  );
}

/**
 * Filter items by query using fuzzyScore against label and keywords.
 * Returns items sorted by best score descending.
 */
function filterItems(items: BlockPaletteItem[], query: string): BlockPaletteItem[] {
  if (!query) return items;

  const scored: Array<{ item: BlockPaletteItem; score: number }> = [];

  for (const item of items) {
    let best = fuzzyScore(query, item.label);

    if (item.keywords) {
      for (const kw of item.keywords) {
        const kwScore = fuzzyScore(query, kw);
        if (kwScore > best) best = kwScore;
      }
    }

    if (best > 0) {
      scored.push({ item, score: best });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.item);
}

/**
 * Group items by category in the order specified by categories array.
 */
function groupByCategory(
  items: BlockPaletteItem[],
  categories: string[],
): Map<string, BlockPaletteItem[]> {
  const map = new Map<string, BlockPaletteItem[]>();

  // Initialize in display order
  for (const cat of categories) {
    map.set(cat, []);
  }

  for (const item of items) {
    const existing = map.get(item.category);
    if (existing) {
      existing.push(item);
    } else {
      // Category not in the ordered list -- append at end
      map.set(item.category, [item]);
    }
  }

  // Remove empty categories
  for (const [cat, arr] of map) {
    if (arr.length === 0) {
      map.delete(cat);
    }
  }

  return map;
}

// =============================================================================
// createBlockPalette
// =============================================================================

/**
 * Create a categorized block palette with search and keyboard navigation.
 *
 * DOM contract:
 * - Item elements inside container carry `[data-palette-item]` and `data-palette-id`.
 * - Category headers carry `role="presentation"`.
 * - Container receives `role="listbox"`.
 * - Items receive `role="option"` and `aria-selected`.
 *
 * The primitive manages ARIA state and event delegation but does NOT render DOM.
 * The caller is responsible for rendering items and updating DOM when
 * `getFilteredItems()` / `getGroupedItems()` changes.
 */
export function createBlockPalette(options: BlockPaletteOptions): BlockPaletteControls {
  // SSR guard
  if (typeof window === 'undefined') {
    const emptyMap = new Map<string, BlockPaletteItem[]>();
    return {
      setItems: () => {},
      setSearchQuery: () => {},
      getFilteredItems: () => [],
      getGroupedItems: () => emptyMap,
      setDisabled: () => {},
      destroy: () => {},
    };
  }

  const { container, searchInput, onActivate, onDragStart, onDragEnd } = options;

  let items = [...options.items];
  const categories = [...options.categories];
  let disabled = options.disabled ?? false;
  let query = '';
  let filtered: BlockPaletteItem[] = items;
  let activeItemId: string | null = null;
  let announceTimer: ReturnType<typeof setTimeout> | null = null;

  // =========================================================================
  // Live region for screen reader announcements
  // =========================================================================

  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.setAttribute('role', 'status');
  liveRegion.setAttribute('data-palette-live', 'true');
  Object.assign(liveRegion.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: '0',
  });
  container.appendChild(liveRegion);

  function announce(message: string): void {
    if (announceTimer !== null) {
      clearTimeout(announceTimer);
    }
    announceTimer = setTimeout(() => {
      liveRegion.textContent = '';
      // Double-rAF ensures the clear is processed before the new text
      requestAnimationFrame(() => {
        liveRegion.textContent = message;
      });
      announceTimer = null;
    }, ANNOUNCE_DELAY_MS);
  }

  /** Announce the current filtered item count to screen readers */
  function announceFilteredCount(): void {
    const count = filtered.length;
    const noun = count === 1 ? 'block' : 'blocks';
    announce(`${count} ${noun} found`);
  }

  // =========================================================================
  // ARIA setup
  // =========================================================================

  container.setAttribute('role', 'listbox');

  if (searchInput) {
    searchInput.setAttribute('role', 'searchbox');
  }

  // =========================================================================
  // State management
  // =========================================================================

  function updateFiltered(): void {
    filtered = filterItems(items, query);
  }

  function findItemById(id: string): BlockPaletteItem | undefined {
    return items.find((item) => item.id === id);
  }

  /** Resolve the palette item from an event target, walking up the DOM */
  function resolveItem(target: EventTarget | null): BlockPaletteItem | undefined {
    const id = getItemId(target, container);
    return id ? findItemById(id) : undefined;
  }

  /**
   * Set aria-selected on the matching DOM element and clear previous selection.
   */
  function syncActiveAria(): void {
    const elements = getItemElements(container);
    for (const el of elements) {
      const id = el.getAttribute('data-palette-id');
      el.setAttribute('aria-selected', id === activeItemId ? 'true' : 'false');
    }

    // Keep activedescendant in sync
    if (activeItemId) {
      const activeEl = elements.find((el) => el.getAttribute('data-palette-id') === activeItemId);
      if (activeEl) {
        if (!activeEl.id) {
          activeEl.id = `palette-item-${activeItemId}`;
        }
        container.setAttribute('aria-activedescendant', activeEl.id);
      }
    } else {
      container.removeAttribute('aria-activedescendant');
    }
  }

  /**
   * Focus-activate a specific item id (sets aria, scrolls into view).
   */
  function activateId(id: string | null): void {
    activeItemId = id;
    syncActiveAria();

    if (id) {
      const elements = getItemElements(container);
      const el = elements.find((e) => e.getAttribute('data-palette-id') === id);
      el?.scrollIntoView?.({ block: 'nearest' });
    }
  }

  /** Update filter, activate first visible item, and announce count */
  function applyFilterAndActivateFirst(): void {
    updateFiltered();
    const ids = getVisibleItemIds();
    activateId(ids[0] ?? null);
    announceFilteredCount();
  }

  // =========================================================================
  // Navigation helpers
  // =========================================================================

  /**
   * Get an ordered flat list of visible item ids (respects current filter and category order).
   */
  function getVisibleItemIds(): string[] {
    const grouped = groupByCategory(filtered, categories);
    const ids: string[] = [];
    for (const [, catItems] of grouped) {
      for (const item of catItems) {
        ids.push(item.id);
      }
    }
    return ids;
  }

  function moveToIndex(ids: string[], newIndex: number): void {
    if (ids.length === 0) return;
    const clamped = Math.max(0, Math.min(ids.length - 1, newIndex));
    const id = ids[clamped];
    if (id !== undefined) {
      activateId(id);
    }
  }

  function currentIndex(ids: string[]): number {
    if (!activeItemId) return -1;
    return ids.indexOf(activeItemId);
  }

  /**
   * Get the first item id of the next category relative to current item.
   */
  function nextCategoryFirstId(direction: 1 | -1): string | null {
    const grouped = groupByCategory(filtered, categories);
    const catKeys = Array.from(grouped.keys());
    if (catKeys.length === 0) return null;

    // Find current category
    let currentCatIndex = -1;
    if (activeItemId) {
      const activeItem = findItemById(activeItemId);
      if (activeItem) {
        currentCatIndex = catKeys.indexOf(activeItem.category);
      }
    }

    let targetCatIndex = currentCatIndex + direction;
    if (targetCatIndex < 0) targetCatIndex = catKeys.length - 1;
    if (targetCatIndex >= catKeys.length) targetCatIndex = 0;

    const targetCat = catKeys[targetCatIndex];
    if (targetCat === undefined) return null;
    const catItems = grouped.get(targetCat);
    return catItems?.[0]?.id ?? null;
  }

  // =========================================================================
  // Event handlers (delegated on container)
  // =========================================================================

  function handleKeyDown(event: KeyboardEvent): void {
    if (disabled) return;

    const { key } = event;
    const ids = getVisibleItemIds();

    switch (key) {
      case 'ArrowDown': {
        event.preventDefault();
        const idx = currentIndex(ids);
        moveToIndex(ids, idx === -1 ? 0 : idx + 1);
        break;
      }

      case 'ArrowUp': {
        event.preventDefault();
        const idx = currentIndex(ids);
        moveToIndex(ids, idx === -1 ? ids.length - 1 : idx - 1);
        break;
      }

      case 'ArrowRight': {
        event.preventDefault();
        const id = nextCategoryFirstId(1);
        if (id) activateId(id);
        break;
      }

      case 'ArrowLeft': {
        event.preventDefault();
        const id = nextCategoryFirstId(-1);
        if (id) activateId(id);
        break;
      }

      case 'Home': {
        event.preventDefault();
        moveToIndex(ids, 0);
        break;
      }

      case 'End': {
        event.preventDefault();
        moveToIndex(ids, ids.length - 1);
        break;
      }

      case 'Enter':
      case ' ': {
        event.preventDefault();
        if (activeItemId) {
          const item = findItemById(activeItemId);
          if (item) onActivate?.(item);
        }
        break;
      }

      // No default -- let other keys pass through
    }
  }

  function handleClick(event: MouseEvent): void {
    if (disabled) return;
    const item = resolveItem(event.target);
    if (item) {
      activateId(item.id);
      onActivate?.(item);
    }
  }

  function handleDragStartEvent(event: DragEvent): void {
    if (disabled) {
      event.preventDefault();
      return;
    }
    const item = resolveItem(event.target);
    if (item) {
      // Set drag data so drop zones can identify the payload.
      // canvas-drop-zone reads 'application/x-rafters-drag-data', so set both
      // MIME types to ensure the JSON payload is available regardless of which
      // drop zone receives the item.
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'copyMove';
        const json = JSON.stringify(item);
        event.dataTransfer.setData('application/x-rafters-block', json);
        event.dataTransfer.setData('application/x-rafters-drag-data', json);
        event.dataTransfer.setData('text/plain', item.label);
      }
      onDragStart?.(item);
    }
  }

  function handleDragEndEvent(event: DragEvent): void {
    if (disabled) return;
    const item = resolveItem(event.target);
    if (item) onDragEnd?.(item);
  }

  // =========================================================================
  // Search input handling
  // =========================================================================

  function handleSearchInput(): void {
    if (!searchInput) return;
    query = searchInput.value;
    applyFilterAndActivateFirst();
  }

  // =========================================================================
  // Bind events
  // =========================================================================

  container.addEventListener('keydown', handleKeyDown);
  container.addEventListener('click', handleClick);
  container.addEventListener('dragstart', handleDragStartEvent);
  container.addEventListener('dragend', handleDragEndEvent);

  if (searchInput) {
    searchInput.addEventListener('input', handleSearchInput);
  }

  // =========================================================================
  // Public controls
  // =========================================================================

  function setItems(newItems: BlockPaletteItem[]): void {
    items = [...newItems];
    updateFiltered();

    // If active item no longer exists, reset
    if (activeItemId && !filtered.some((i) => i.id === activeItemId)) {
      const ids = getVisibleItemIds();
      activateId(ids[0] ?? null);
    }
  }

  function setSearchQuery(newQuery: string): void {
    query = newQuery;
    if (searchInput) {
      searchInput.value = newQuery;
    }
    applyFilterAndActivateFirst();
  }

  function getFilteredItems(): BlockPaletteItem[] {
    return [...filtered];
  }

  function getGroupedItems(): Map<string, BlockPaletteItem[]> {
    return groupByCategory(filtered, categories);
  }

  function setDisabled(newDisabled: boolean): void {
    disabled = newDisabled;
    if (disabled) {
      container.setAttribute('aria-disabled', 'true');
    } else {
      container.removeAttribute('aria-disabled');
    }
  }

  function destroy(): void {
    container.removeEventListener('keydown', handleKeyDown);
    container.removeEventListener('click', handleClick);
    container.removeEventListener('dragstart', handleDragStartEvent);
    container.removeEventListener('dragend', handleDragEndEvent);

    if (searchInput) {
      searchInput.removeEventListener('input', handleSearchInput);
    }

    if (announceTimer !== null) {
      clearTimeout(announceTimer);
      announceTimer = null;
    }

    liveRegion.remove();

    container.removeAttribute('role');
    container.removeAttribute('aria-activedescendant');
    container.removeAttribute('aria-disabled');
  }

  // Apply initial disabled state
  if (disabled) {
    container.setAttribute('aria-disabled', 'true');
  }

  return {
    setItems,
    setSearchQuery,
    getFilteredItems,
    getGroupedItems,
    setDisabled,
    destroy,
  };
}
