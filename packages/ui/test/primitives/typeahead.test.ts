import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createControlledTypeahead,
  createTypeahead,
  fuzzyScore,
  highlightMatch,
} from '../../src/primitives/typeahead';

describe('createTypeahead', () => {
  let container: HTMLDivElement;
  let items: HTMLDivElement[];

  beforeEach(() => {
    container = document.createElement('div');
    items = [];

    // Create items
    const labels = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry'];
    for (const label of labels) {
      const item = document.createElement('div');
      item.textContent = label;
      item.setAttribute('role', 'option');
      container.appendChild(item);
      items.push(item);
    }

    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    vi.useRealTimers();
  });

  it('focuses matching item on keypress', () => {
    const onMatch = vi.fn();
    const cleanup = createTypeahead(container, {
      getItems: () => items,
      onMatch,
    });

    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', bubbles: true }));

    expect(onMatch).toHaveBeenCalledWith(items[1], 1); // Banana

    cleanup();
  });

  it('matches from start by default', () => {
    const onMatch = vi.fn();
    const cleanup = createTypeahead(container, {
      getItems: () => items,
      onMatch,
    });

    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));

    expect(onMatch).toHaveBeenCalledWith(items[0], 0); // Apple, not Banana

    cleanup();
  });

  it('accumulates search string', () => {
    const onMatch = vi.fn();
    const cleanup = createTypeahead(container, {
      getItems: () => items,
      onMatch,
    });

    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }));
    expect(onMatch).toHaveBeenCalledWith(items[2], 2); // Cherry

    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', bubbles: true }));
    // Still matches Cherry with "ch"
    expect(onMatch).toHaveBeenLastCalledWith(items[2], 2);

    cleanup();
  });

  it('resets search string after timeout', () => {
    vi.useFakeTimers();

    const onMatch = vi.fn();
    const cleanup = createTypeahead(container, {
      getItems: () => items,
      onMatch,
      timeout: 500,
    });

    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    expect(onMatch).toHaveBeenCalledWith(items[0], 0); // Apple

    vi.advanceTimersByTime(600);

    // After timeout, 'b' should match Banana, not "ab" which wouldn't match
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', bubbles: true }));
    expect(onMatch).toHaveBeenCalledWith(items[1], 1); // Banana

    cleanup();
  });

  it('calls onNoMatch when no item matches', () => {
    const onMatch = vi.fn();
    const onNoMatch = vi.fn();
    const cleanup = createTypeahead(container, {
      getItems: () => items,
      onMatch,
      onNoMatch,
    });

    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', bubbles: true }));

    expect(onMatch).not.toHaveBeenCalled();
    expect(onNoMatch).toHaveBeenCalledWith('z');

    cleanup();
  });

  it('is case insensitive by default', () => {
    const onMatch = vi.fn();
    const cleanup = createTypeahead(container, {
      getItems: () => items,
      onMatch,
    });

    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'A', bubbles: true }));

    expect(onMatch).toHaveBeenCalledWith(items[0], 0); // Apple

    cleanup();
  });

  it('can be case sensitive', () => {
    const onMatch = vi.fn();
    const onNoMatch = vi.fn();
    const cleanup = createTypeahead(container, {
      getItems: () => items,
      onMatch,
      onNoMatch,
      caseSensitive: true,
    });

    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));

    // 'a' should not match 'Apple' when case sensitive
    expect(onNoMatch).toHaveBeenCalled();

    cleanup();
  });

  it('can match anywhere in text', () => {
    const onMatch = vi.fn();
    const cleanup = createTypeahead(container, {
      getItems: () => items,
      onMatch,
      matchFromStart: false,
    });

    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', bubbles: true }));

    // 'n' matches 'Banana' (contains n)
    expect(onMatch).toHaveBeenCalledWith(items[1], 1);

    cleanup();
  });

  it('uses custom getItemText function', () => {
    // Add data-label attributes
    items.forEach((item, i) => {
      item.setAttribute('data-label', ['One', 'Two', 'Three', 'Four', 'Five'][i] || '');
    });

    const onMatch = vi.fn();
    const cleanup = createTypeahead(container, {
      getItems: () => items,
      getItemText: (item) => item.getAttribute('data-label') || '',
      onMatch,
    });

    container.dispatchEvent(new KeyboardEvent('keydown', { key: 't', bubbles: true }));

    expect(onMatch).toHaveBeenCalledWith(items[1], 1); // "Two"

    cleanup();
  });

  it('skips disabled items', () => {
    items[0]?.setAttribute('disabled', '');

    const onMatch = vi.fn();
    const cleanup = createTypeahead(container, {
      getItems: () => items,
      onMatch,
    });

    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));

    // Should not match Apple (disabled)
    expect(onMatch).not.toHaveBeenCalledWith(items[0], 0);

    cleanup();
  });

  it('skips aria-disabled items', () => {
    items[0]?.setAttribute('aria-disabled', 'true');

    const onMatch = vi.fn();
    const cleanup = createTypeahead(container, {
      getItems: () => items,
      onMatch,
    });

    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));

    expect(onMatch).not.toHaveBeenCalledWith(items[0], 0);

    cleanup();
  });

  it('ignores modifier keys', () => {
    const onMatch = vi.fn();
    const cleanup = createTypeahead(container, {
      getItems: () => items,
      onMatch,
    });

    container.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }),
    );
    container.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', altKey: true, bubbles: true }),
    );
    container.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', metaKey: true, bubbles: true }),
    );

    expect(onMatch).not.toHaveBeenCalled();

    cleanup();
  });

  it('ignores special keys', () => {
    const onMatch = vi.fn();
    const cleanup = createTypeahead(container, {
      getItems: () => items,
      onMatch,
    });

    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

    expect(onMatch).not.toHaveBeenCalled();

    cleanup();
  });

  it('ignores space at start of search', () => {
    const onMatch = vi.fn();
    const cleanup = createTypeahead(container, {
      getItems: () => items,
      onMatch,
    });

    container.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

    expect(onMatch).not.toHaveBeenCalled();

    cleanup();
  });

  it('removes listener on cleanup', () => {
    const onMatch = vi.fn();
    const cleanup = createTypeahead(container, {
      getItems: () => items,
      onMatch,
    });

    cleanup();

    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));

    expect(onMatch).not.toHaveBeenCalled();
  });

  it('returns no-op cleanup when disabled', () => {
    const onMatch = vi.fn();
    const cleanup = createTypeahead(container, {
      getItems: () => items,
      onMatch,
      enabled: false,
    });

    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));

    expect(onMatch).not.toHaveBeenCalled();

    cleanup();
  });

  it('returns no-op cleanup in SSR environment', () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error Testing SSR
    delete globalThis.window;

    const cleanup = createTypeahead(container, {
      getItems: () => items,
      onMatch: vi.fn(),
    });
    expect(cleanup).toBeInstanceOf(Function);

    globalThis.window = originalWindow;
  });
});

describe('createControlledTypeahead', () => {
  let items: HTMLDivElement[];

  beforeEach(() => {
    items = [];
    const labels = ['Apple', 'Banana', 'Cherry'];
    for (const label of labels) {
      const item = document.createElement('div');
      item.textContent = label;
      items.push(item);
    }
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns handler and state functions', () => {
    const typeahead = createControlledTypeahead({
      getItems: () => items,
    });

    expect(typeahead.handleKeyDown).toBeInstanceOf(Function);
    expect(typeahead.reset).toBeInstanceOf(Function);
    expect(typeahead.getState).toBeInstanceOf(Function);
  });

  it('tracks search state', () => {
    const typeahead = createControlledTypeahead({
      getItems: () => items,
    });

    expect(typeahead.getState().searchString).toBe('');
    expect(typeahead.getState().isActive).toBe(false);

    typeahead.handleKeyDown(new KeyboardEvent('keydown', { key: 'a' }));

    expect(typeahead.getState().searchString).toBe('a');
    expect(typeahead.getState().isActive).toBe(true);
  });

  it('resets state', () => {
    vi.useFakeTimers();

    const typeahead = createControlledTypeahead({
      getItems: () => items,
    });

    typeahead.handleKeyDown(new KeyboardEvent('keydown', { key: 'a' }));
    expect(typeahead.getState().searchString).toBe('a');

    typeahead.reset();

    expect(typeahead.getState().searchString).toBe('');
    expect(typeahead.getState().isActive).toBe(false);
  });

  it('calls onMatch callback', () => {
    const onMatch = vi.fn();
    const typeahead = createControlledTypeahead({
      getItems: () => items,
      onMatch,
    });

    typeahead.handleKeyDown(new KeyboardEvent('keydown', { key: 'b' }));

    expect(onMatch).toHaveBeenCalledWith(items[1], 1);
  });
});

describe('highlightMatch', () => {
  let element: HTMLDivElement;

  beforeEach(() => {
    element = document.createElement('div');
    element.textContent = 'Hello World';
    document.body.appendChild(element);
  });

  afterEach(() => {
    element.remove();
  });

  it('wraps matching text in mark element', () => {
    const cleanup = highlightMatch(element, 'World');

    expect(element.innerHTML).toContain('<mark');
    expect(element.innerHTML).toContain('World');
    expect(element.innerHTML).toContain('</mark>');

    cleanup();
  });

  it('applies custom highlight class', () => {
    const cleanup = highlightMatch(element, 'Hello', {
      highlightClass: 'custom-highlight',
    });

    expect(element.innerHTML).toContain('class="custom-highlight"');

    cleanup();
  });

  it('restores original HTML on cleanup', () => {
    const originalHTML = element.innerHTML;
    const cleanup = highlightMatch(element, 'World');

    expect(element.innerHTML).not.toBe(originalHTML);

    cleanup();

    expect(element.innerHTML).toBe(originalHTML);
  });

  it('returns no-op when no match found', () => {
    const originalHTML = element.innerHTML;
    const cleanup = highlightMatch(element, 'xyz');

    expect(element.innerHTML).toBe(originalHTML);

    cleanup();
  });

  it('is case insensitive by default', () => {
    const cleanup = highlightMatch(element, 'hello');

    expect(element.innerHTML).toContain('<mark');

    cleanup();
  });

  it('can be case sensitive', () => {
    const cleanup = highlightMatch(element, 'hello', { caseSensitive: true });

    // 'hello' should not match 'Hello'
    expect(element.innerHTML).not.toContain('<mark');

    cleanup();
  });

  it('returns no-op in SSR environment', () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error Testing SSR
    delete globalThis.window;

    const cleanup = highlightMatch(element, 'World');
    expect(cleanup).toBeInstanceOf(Function);

    globalThis.window = originalWindow;
  });
});

describe('fuzzyScore', () => {
  it('returns 1 for empty query', () => {
    expect(fuzzyScore('', 'anything')).toBe(1);
  });

  it('returns 0 when query is longer than target', () => {
    expect(fuzzyScore('longquery', 'short')).toBe(0);
  });

  it('returns 0 when query characters are not found in order', () => {
    expect(fuzzyScore('zxy', 'abc')).toBe(0);
  });

  it('scores exact match at start higher than match in middle', () => {
    const startScore = fuzzyScore('app', 'Apple');
    const middleScore = fuzzyScore('app', 'Snapper');
    expect(startScore).toBeGreaterThan(middleScore);
  });

  it('is case insensitive', () => {
    expect(fuzzyScore('APP', 'apple')).toBe(fuzzyScore('app', 'Apple'));
  });

  it('awards consecutive character bonus', () => {
    // "ab" in "abc" (consecutive) should score higher than "ab" in "axb" (non-consecutive)
    const consecutive = fuzzyScore('ab', 'abc');
    const nonConsecutive = fuzzyScore('ab', 'axb');
    expect(consecutive).toBeGreaterThan(nonConsecutive);
  });

  it('awards start-of-word bonus', () => {
    // "b" at start of word "bar" should score higher than "b" in middle of "abc"
    const wordStart = fuzzyScore('b', 'foo bar');
    const wordMiddle = fuzzyScore('b', 'abc');
    expect(wordStart).toBeGreaterThan(wordMiddle);
  });

  it('handles hyphenated words', () => {
    // "b" after hyphen should get start-of-word bonus
    const score = fuzzyScore('b', 'foo-bar');
    expect(score).toBeGreaterThan(0);
  });

  it('returns positive score for valid partial match', () => {
    expect(fuzzyScore('btn', 'button')).toBeGreaterThan(0);
  });

  it('returns 0 when not all query characters found', () => {
    expect(fuzzyScore('xyz', 'hello')).toBe(0);
  });
});
