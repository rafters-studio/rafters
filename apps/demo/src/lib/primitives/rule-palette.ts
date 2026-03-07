/**
 * Rule Palette primitive
 * Categorized list of draggable rules for applying I/O contracts to blocks.
 * Mirrors block-palette pattern with rule-specific drag data and compatibility checks.
 *
 * Zero npm dependencies. Leaf primitive: imports only from sibling modules.
 *
 * WCAG Compliance:
 * - 2.1.1 Keyboard (Level A): Full keyboard navigation with arrow keys
 * - 2.4.3 Focus Order (Level A): Logical focus across categories
 * - 4.1.2 Name, Role, Value (Level A): listbox/option/searchbox ARIA roles
 * - 4.1.3 Status Messages (Level AA): Live region announces filtered count
 *
 * @registry-type primitive
 *
 * @example
 * ```typescript
 * const palette = createRulePalette({
 *   container: document.getElementById('rules')!,
 *   items: [
 *     { id: 'required', label: 'Required', category: 'Validation', keywords: ['mandatory'] },
 *     { id: 'min-length', label: 'Min Length', category: 'Validation', requiresConfig: true },
 *     { id: 'email', label: 'Email', category: 'Type Constraints' },
 *   ],
 *   categories: ['Validation', 'Type Constraints'],
 *   onActivate: (item) => applyRule(item.id),
 * });
 * ```
 */

import { fuzzyScore } from './typeahead';

// =============================================================================
// Types
// =============================================================================

export interface RulePaletteItem {
  id: string;
  label: string;
  category: string;
  keywords?: string[];
  /** Whether this rule needs configuration before applying (opens dialog on drop) */
  requiresConfig?: boolean;
  /** Block types this rule is compatible with (empty = all) */
  compatibleBlockTypes?: string[];
}

export interface RulePaletteOptions {
  container: HTMLElement;
  items: RulePaletteItem[];
  /** Display order for category groups */
  categories: string[];
  /** Optional external search input */
  searchInput?: HTMLInputElement;
  /** Called when an item is activated via Enter, Space, or click */
  onActivate?: (item: RulePaletteItem) => void;
  /** Called when a native drag starts on an item */
  onDragStart?: (item: RulePaletteItem) => void;
  /** Called when a native drag ends on an item */
  onDragEnd?: (item: RulePaletteItem) => void;
  /** Whether the palette is disabled */
  disabled?: boolean;
}

export interface RulePaletteControls {
  setItems: (items: RulePaletteItem[]) => void;
  setSearchQuery: (query: string) => void;
  getFilteredItems: () => RulePaletteItem[];
  getGroupedItems: () => Map<string, RulePaletteItem[]>;
  setDisabled: (disabled: boolean) => void;
  destroy: () => void;
}

// =============================================================================
// Helpers
// =============================================================================

const ANNOUNCE_DELAY_MS = 150;

function getItemId(target: EventTarget | null, container: HTMLElement): string | null {
  let el = target as HTMLElement | null;
  while (el && el !== container) {
    if (el.hasAttribute('data-rule-item') && el.hasAttribute('data-rule-id')) {
      return el.getAttribute('data-rule-id');
    }
    el = el.parentElement;
  }
  return null;
}

function getItemElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('[data-rule-item][data-rule-id]'));
}

function filterItems(items: RulePaletteItem[], query: string): RulePaletteItem[] {
  if (!query) return items;

  const scored: Array<{ item: RulePaletteItem; score: number }> = [];

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

function groupByCategory(
  items: RulePaletteItem[],
  categories: string[],
): Map<string, RulePaletteItem[]> {
  const map = new Map<string, RulePaletteItem[]>();

  for (const cat of categories) {
    map.set(cat, []);
  }

  for (const item of items) {
    const existing = map.get(item.category);
    if (existing) {
      existing.push(item);
    } else {
      map.set(item.category, [item]);
    }
  }

  for (const [cat, arr] of map) {
    if (arr.length === 0) {
      map.delete(cat);
    }
  }

  return map;
}

// =============================================================================
// createRulePalette
// =============================================================================

/**
 * Create a categorized rule palette with search and keyboard navigation.
 *
 * DOM contract:
 * - Item elements carry `[data-rule-item]` and `data-rule-id`.
 * - Category headers carry `role="presentation"`.
 * - Container receives `role="listbox"`.
 * - Items receive `role="option"` and `aria-selected`.
 * - Drag data uses MIME type `application/x-rafters-rule`.
 */
export function createRulePalette(options: RulePaletteOptions): RulePaletteControls {
  // SSR guard
  if (typeof window === 'undefined') {
    const emptyMap = new Map<string, RulePaletteItem[]>();
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
  let filtered: RulePaletteItem[] = items;
  let activeItemId: string | null = null;
  let announceTimer: ReturnType<typeof setTimeout> | null = null;

  // =========================================================================
  // Live region
  // =========================================================================

  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.setAttribute('role', 'status');
  liveRegion.setAttribute('data-rule-palette-live', 'true');
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
      requestAnimationFrame(() => {
        liveRegion.textContent = message;
      });
      announceTimer = null;
    }, ANNOUNCE_DELAY_MS);
  }

  function announceFilteredCount(): void {
    const count = filtered.length;
    const noun = count === 1 ? 'rule' : 'rules';
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

  function findItemById(id: string): RulePaletteItem | undefined {
    return items.find((item) => item.id === id);
  }

  function resolveItem(target: EventTarget | null): RulePaletteItem | undefined {
    const id = getItemId(target, container);
    return id ? findItemById(id) : undefined;
  }

  function syncActiveAria(): void {
    const elements = getItemElements(container);
    for (const el of elements) {
      const id = el.getAttribute('data-rule-id');
      el.setAttribute('aria-selected', id === activeItemId ? 'true' : 'false');
    }

    if (activeItemId) {
      const activeEl = elements.find((el) => el.getAttribute('data-rule-id') === activeItemId);
      if (activeEl) {
        if (!activeEl.id) {
          activeEl.id = `rule-palette-item-${activeItemId}`;
        }
        container.setAttribute('aria-activedescendant', activeEl.id);
      }
    } else {
      container.removeAttribute('aria-activedescendant');
    }
  }

  function activateId(id: string | null): void {
    activeItemId = id;
    syncActiveAria();

    if (id) {
      const elements = getItemElements(container);
      const el = elements.find((e) => e.getAttribute('data-rule-id') === id);
      el?.scrollIntoView?.({ block: 'nearest' });
    }
  }

  function applyFilterAndActivateFirst(): void {
    updateFiltered();
    const ids = getVisibleItemIds();
    activateId(ids[0] ?? null);
    announceFilteredCount();
  }

  // =========================================================================
  // Navigation helpers
  // =========================================================================

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

  function nextCategoryFirstId(direction: 1 | -1): string | null {
    const grouped = groupByCategory(filtered, categories);
    const catKeys = Array.from(grouped.keys());
    if (catKeys.length === 0) return null;

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
  // Event handlers
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
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'copyMove';
        const json = JSON.stringify(item);
        event.dataTransfer.setData('application/x-rafters-rule', json);
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

  function setItems(newItems: RulePaletteItem[]): void {
    items = [...newItems];
    updateFiltered();

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

  function getFilteredItems(): RulePaletteItem[] {
    return [...filtered];
  }

  function getGroupedItems(): Map<string, RulePaletteItem[]> {
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
