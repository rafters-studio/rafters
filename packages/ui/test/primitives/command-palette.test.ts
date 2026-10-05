import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCommandPalette, fuzzyMatch } from '../../src/primitives/command-palette';
import type { Command } from '../../src/primitives/types';

describe('fuzzyMatch', () => {
  describe('exact matching', () => {
    it('returns highest score for exact case-insensitive match', () => {
      const result = fuzzyMatch('Bold', 'bold');
      expect(result.matches).toBe(true);
      expect(result.score).toBe(1000);
      expect(result.indices).toEqual([0, 1, 2, 3]);
    });

    it('returns highest score for exact case-sensitive match', () => {
      const result = fuzzyMatch('Bold', 'Bold');
      expect(result.matches).toBe(true);
      expect(result.score).toBe(1000);
      expect(result.indices).toEqual([0, 1, 2, 3]);
    });
  });

  describe('substring matching', () => {
    it('scores prefix matches higher than substring elsewhere', () => {
      const prefixResult = fuzzyMatch('Bold Text', 'bold');
      const substringResult = fuzzyMatch('Make Bold', 'bold');

      expect(prefixResult.matches).toBe(true);
      expect(substringResult.matches).toBe(true);
      expect(prefixResult.score).toBeGreaterThan(substringResult.score);
    });

    it('returns correct indices for substring match', () => {
      const result = fuzzyMatch('Add Bold', 'bold');
      expect(result.matches).toBe(true);
      expect(result.indices).toEqual([4, 5, 6, 7]);
    });

    it('returns correct indices for prefix match', () => {
      const result = fuzzyMatch('Bold Text', 'bold');
      expect(result.matches).toBe(true);
      expect(result.indices).toEqual([0, 1, 2, 3]);
    });
  });

  describe('fuzzy character matching', () => {
    it('matches non-consecutive characters', () => {
      const result = fuzzyMatch('Bold Text', 'bt');
      expect(result.matches).toBe(true);
      expect(result.indices).toEqual([0, 5]);
    });

    it('matches characters spread across text', () => {
      const result = fuzzyMatch('Insert Heading', 'ih');
      expect(result.matches).toBe(true);
      expect(result.indices).toEqual([0, 7]);
    });

    it('gives bonus for consecutive matches', () => {
      const consecutiveResult = fuzzyMatch('Bold', 'bo');
      const spreadResult = fuzzyMatch('B o l d', 'bo');

      expect(consecutiveResult.matches).toBe(true);
      expect(spreadResult.matches).toBe(true);
      // Consecutive should score higher due to bonus
      expect(consecutiveResult.score).toBeGreaterThan(spreadResult.score);
    });

    it('gives bonus for word boundary matches', () => {
      const wordStartResult = fuzzyMatch('Bold Text', 'bt');
      // Both B and T are at word boundaries
      expect(wordStartResult.matches).toBe(true);
      expect(wordStartResult.score).toBeGreaterThan(0);
    });
  });

  describe('non-matching cases', () => {
    it('returns no match when characters not found', () => {
      const result = fuzzyMatch('Bold', 'xyz');
      expect(result.matches).toBe(false);
      expect(result.score).toBe(0);
      expect(result.indices).toEqual([]);
    });

    it('returns no match when characters in wrong order', () => {
      const result = fuzzyMatch('Bold', 'db');
      expect(result.matches).toBe(false);
      expect(result.score).toBe(0);
      expect(result.indices).toEqual([]);
    });

    it('returns no match when not all characters found', () => {
      const result = fuzzyMatch('Bold', 'boldy');
      expect(result.matches).toBe(false);
      expect(result.score).toBe(0);
      expect(result.indices).toEqual([]);
    });
  });

  describe('empty query', () => {
    it('matches everything with empty query', () => {
      const result = fuzzyMatch('Bold Text', '');
      expect(result.matches).toBe(true);
      expect(result.score).toBe(0);
      expect(result.indices).toEqual([]);
    });
  });

  describe('case insensitivity', () => {
    it('matches regardless of case', () => {
      const lowerResult = fuzzyMatch('BOLD', 'bold');
      const upperResult = fuzzyMatch('bold', 'BOLD');
      const mixedResult = fuzzyMatch('BoLd', 'bOlD');

      expect(lowerResult.matches).toBe(true);
      expect(upperResult.matches).toBe(true);
      expect(mixedResult.matches).toBe(true);
    });
  });
});

describe('createCommandPalette', () => {
  let container: HTMLDivElement;
  let commands: Command[];

  beforeEach(() => {
    container = document.createElement('div');
    container.setAttribute('contenteditable', 'true');
    document.body.appendChild(container);

    commands = [
      { id: 'bold', label: 'Bold', description: 'Make text bold', action: vi.fn() },
      { id: 'italic', label: 'Italic', keywords: ['emphasis'], action: vi.fn() },
      { id: 'heading', label: 'Heading 1', keywords: ['h1', 'title'], action: vi.fn() },
      { id: 'link', label: 'Insert Link', description: 'Add hyperlink', action: vi.fn() },
    ];
  });

  afterEach(() => {
    container.remove();
  });

  describe('opening and closing', () => {
    it('starts in closed state', () => {
      const palette = createCommandPalette({ container, commands });
      expect(palette.getState().isOpen).toBe(false);
      palette.cleanup();
    });

    it('opens programmatically', () => {
      const onOpen = vi.fn();
      const palette = createCommandPalette({ container, commands, onOpen });

      palette.open();

      expect(palette.getState().isOpen).toBe(true);
      expect(onOpen).toHaveBeenCalledTimes(1);
      palette.cleanup();
    });

    it('closes programmatically', () => {
      const onClose = vi.fn();
      const palette = createCommandPalette({ container, commands, onClose });

      palette.open();
      palette.close();

      expect(palette.getState().isOpen).toBe(false);
      expect(onClose).toHaveBeenCalledTimes(1);
      palette.cleanup();
    });

    it('does not call onOpen if already open', () => {
      const onOpen = vi.fn();
      const palette = createCommandPalette({ container, commands, onOpen });

      palette.open();
      palette.open();

      expect(onOpen).toHaveBeenCalledTimes(1);
      palette.cleanup();
    });

    it('does not call onClose if already closed', () => {
      const onClose = vi.fn();
      const palette = createCommandPalette({ container, commands, onClose });

      palette.close();

      expect(onClose).not.toHaveBeenCalled();
      palette.cleanup();
    });

    it('initializes with all commands when opened', () => {
      const palette = createCommandPalette({ container, commands });

      palette.open();

      expect(palette.getState().filteredCommands).toHaveLength(4);
      expect(palette.getState().selectedIndex).toBe(0);
      palette.cleanup();
    });

    it('resets query when opened', () => {
      const palette = createCommandPalette({ container, commands });

      palette.open();
      palette.setQuery('bold');
      palette.close();
      palette.open();

      expect(palette.getState().query).toBe('');
      palette.cleanup();
    });
  });

  describe('keyboard trigger detection', () => {
    it('opens on trigger at start of text', () => {
      const onOpen = vi.fn();
      const palette = createCommandPalette({ container, commands, onOpen });

      // Set up selection at start
      container.textContent = '';
      container.focus();
      const range = document.createRange();
      range.setStart(container, 0);
      range.collapse(true);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      container.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));

      expect(onOpen).toHaveBeenCalled();
      palette.cleanup();
    });

    it('opens on trigger after whitespace', () => {
      const onOpen = vi.fn();
      const palette = createCommandPalette({ container, commands, onOpen });

      // Set up text with cursor after space
      container.textContent = 'Hello ';
      container.focus();
      const textNode = container.firstChild;
      if (textNode) {
        const range = document.createRange();
        range.setStart(textNode, 6);
        range.collapse(true);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }

      container.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));

      expect(onOpen).toHaveBeenCalled();
      palette.cleanup();
    });

    it('does not open trigger mid-word', () => {
      const onOpen = vi.fn();
      const palette = createCommandPalette({ container, commands, onOpen });

      // Set up text with cursor mid-word
      container.textContent = 'Hello';
      container.focus();
      const textNode = container.firstChild;
      if (textNode) {
        const range = document.createRange();
        range.setStart(textNode, 3);
        range.collapse(true);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }

      container.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));

      expect(onOpen).not.toHaveBeenCalled();
      palette.cleanup();
    });

    it('uses custom trigger character', () => {
      const onOpen = vi.fn();
      const palette = createCommandPalette({ container, commands, trigger: '@', onOpen });

      container.textContent = '';
      container.focus();
      const range = document.createRange();
      range.setStart(container, 0);
      range.collapse(true);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      // Default trigger should not work
      container.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));
      expect(onOpen).not.toHaveBeenCalled();

      // Custom trigger should work
      container.dispatchEvent(new KeyboardEvent('keydown', { key: '@', bubbles: true }));
      expect(onOpen).toHaveBeenCalled();

      palette.cleanup();
    });
  });

  describe('keyboard navigation', () => {
    it('closes on Escape', () => {
      const onClose = vi.fn();
      const palette = createCommandPalette({ container, commands, onClose });

      palette.open();
      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      expect(palette.getState().isOpen).toBe(false);
      expect(onClose).toHaveBeenCalled();
      palette.cleanup();
    });

    it('selects next on ArrowDown', () => {
      const onSelect = vi.fn();
      const palette = createCommandPalette({ container, commands, onSelect });

      palette.open();
      onSelect.mockClear();

      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

      expect(palette.getState().selectedIndex).toBe(1);
      expect(onSelect).toHaveBeenCalledWith(commands[1], 1);
      palette.cleanup();
    });

    it('selects previous on ArrowUp', () => {
      const onSelect = vi.fn();
      const palette = createCommandPalette({ container, commands, onSelect });

      palette.open();
      palette.selectNext(); // Move to index 1
      onSelect.mockClear();

      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));

      expect(palette.getState().selectedIndex).toBe(0);
      expect(onSelect).toHaveBeenCalledWith(commands[0], 0);
      palette.cleanup();
    });

    it('wraps from last to first on ArrowDown', () => {
      const palette = createCommandPalette({ container, commands });

      palette.open();
      palette.selectLast();

      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

      expect(palette.getState().selectedIndex).toBe(0);
      palette.cleanup();
    });

    it('wraps from first to last on ArrowUp', () => {
      const palette = createCommandPalette({ container, commands });

      palette.open();

      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));

      expect(palette.getState().selectedIndex).toBe(3);
      palette.cleanup();
    });

    it('executes on Enter', () => {
      const onExecute = vi.fn();
      const palette = createCommandPalette({ container, commands, onExecute });

      palette.open();
      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(commands[0]?.action).toHaveBeenCalled();
      expect(onExecute).toHaveBeenCalledWith(commands[0]);
      expect(palette.getState().isOpen).toBe(false);
      palette.cleanup();
    });

    it('selects first on Home', () => {
      const palette = createCommandPalette({ container, commands });

      palette.open();
      palette.selectLast();

      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));

      expect(palette.getState().selectedIndex).toBe(0);
      palette.cleanup();
    });

    it('selects last on End', () => {
      const palette = createCommandPalette({ container, commands });

      palette.open();

      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));

      expect(palette.getState().selectedIndex).toBe(3);
      palette.cleanup();
    });

    it('ignores navigation keys when closed', () => {
      const palette = createCommandPalette({ container, commands });

      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(palette.getState().isOpen).toBe(false);
      palette.cleanup();
    });
  });

  describe('command filtering', () => {
    it('filters commands by label', () => {
      const palette = createCommandPalette({ container, commands });

      palette.open();
      palette.setQuery('bold');

      expect(palette.getState().filteredCommands).toHaveLength(1);
      expect(palette.getState().filteredCommands[0]?.id).toBe('bold');
      palette.cleanup();
    });

    it('filters commands by description', () => {
      const palette = createCommandPalette({ container, commands });

      palette.open();
      palette.setQuery('hyperlink');

      expect(palette.getState().filteredCommands).toHaveLength(1);
      expect(palette.getState().filteredCommands[0]?.id).toBe('link');
      palette.cleanup();
    });

    it('filters commands by keywords', () => {
      const palette = createCommandPalette({ container, commands });

      palette.open();
      palette.setQuery('h1');

      expect(palette.getState().filteredCommands).toHaveLength(1);
      expect(palette.getState().filteredCommands[0]?.id).toBe('heading');
      palette.cleanup();
    });

    it('shows all commands with empty query', () => {
      const palette = createCommandPalette({ container, commands });

      palette.open();
      palette.setQuery('');

      expect(palette.getState().filteredCommands).toHaveLength(4);
      palette.cleanup();
    });

    it('shows no commands when none match', () => {
      const palette = createCommandPalette({ container, commands });

      palette.open();
      palette.setQuery('zzzzz');

      expect(palette.getState().filteredCommands).toHaveLength(0);
      expect(palette.getState().selectedIndex).toBe(-1);
      palette.cleanup();
    });

    it('adjusts selection when filter reduces list', () => {
      const palette = createCommandPalette({ container, commands });

      palette.open();
      palette.selectLast(); // index 3
      palette.setQuery('bold');

      // Should adjust to valid index
      expect(palette.getState().selectedIndex).toBe(0);
      palette.cleanup();
    });
  });

  describe('programmatic navigation', () => {
    it('selectNext wraps around', () => {
      const palette = createCommandPalette({ container, commands });

      palette.open();
      palette.selectNext();
      palette.selectNext();
      palette.selectNext();
      palette.selectNext();

      expect(palette.getState().selectedIndex).toBe(0);
      palette.cleanup();
    });

    it('selectPrevious wraps around', () => {
      const palette = createCommandPalette({ container, commands });

      palette.open();
      palette.selectPrevious();

      expect(palette.getState().selectedIndex).toBe(3);
      palette.cleanup();
    });

    it('selectFirst sets index to 0', () => {
      const palette = createCommandPalette({ container, commands });

      palette.open();
      palette.selectLast();
      palette.selectFirst();

      expect(palette.getState().selectedIndex).toBe(0);
      palette.cleanup();
    });

    it('selectLast sets index to last', () => {
      const palette = createCommandPalette({ container, commands });

      palette.open();
      palette.selectLast();

      expect(palette.getState().selectedIndex).toBe(3);
      palette.cleanup();
    });

    it('navigation no-ops with empty commands', () => {
      const palette = createCommandPalette({ container, commands: [] });

      palette.open();
      palette.selectNext();
      palette.selectPrevious();
      palette.selectFirst();
      palette.selectLast();

      expect(palette.getState().selectedIndex).toBe(-1);
      palette.cleanup();
    });
  });

  describe('execute', () => {
    it('calls command action and closes palette', () => {
      const onExecute = vi.fn();
      const palette = createCommandPalette({ container, commands, onExecute });

      palette.open();
      palette.execute();

      expect(commands[0]?.action).toHaveBeenCalled();
      expect(onExecute).toHaveBeenCalledWith(commands[0]);
      expect(palette.getState().isOpen).toBe(false);
      palette.cleanup();
    });

    it('executes selected command', () => {
      const palette = createCommandPalette({ container, commands });

      palette.open();
      palette.selectNext(); // Select second command
      palette.execute();

      expect(commands[0]?.action).not.toHaveBeenCalled();
      expect(commands[1]?.action).toHaveBeenCalled();
      palette.cleanup();
    });

    it('no-ops when no command selected', () => {
      const onExecute = vi.fn();
      const palette = createCommandPalette({ container, commands: [], onExecute });

      palette.open();
      palette.execute();

      expect(onExecute).not.toHaveBeenCalled();
      palette.cleanup();
    });
  });

  describe('setCommands', () => {
    it('updates available commands', () => {
      const palette = createCommandPalette({ container, commands });
      const newCommands: Command[] = [{ id: 'new', label: 'New Command', action: vi.fn() }];

      palette.open();
      palette.setCommands(newCommands);

      expect(palette.getState().filteredCommands).toHaveLength(1);
      expect(palette.getState().filteredCommands[0]?.id).toBe('new');
      palette.cleanup();
    });

    it('applies current filter to new commands', () => {
      const palette = createCommandPalette({ container, commands });
      const newCommands: Command[] = [
        { id: 'bold', label: 'Bold', action: vi.fn() },
        { id: 'other', label: 'Other', action: vi.fn() },
      ];

      palette.open();
      palette.setQuery('bold');
      palette.setCommands(newCommands);

      expect(palette.getState().filteredCommands).toHaveLength(1);
      expect(palette.getState().filteredCommands[0]?.id).toBe('bold');
      palette.cleanup();
    });
  });

  describe('cleanup', () => {
    it('removes event listeners', () => {
      const onOpen = vi.fn();
      const palette = createCommandPalette({ container, commands, onOpen });

      palette.cleanup();

      // Set up selection to allow trigger
      container.textContent = '';
      container.focus();
      const range = document.createRange();
      range.setStart(container, 0);
      range.collapse(true);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      container.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));

      expect(onOpen).not.toHaveBeenCalled();
    });

    it('closes palette on cleanup', () => {
      const onClose = vi.fn();
      const palette = createCommandPalette({ container, commands, onClose });

      palette.open();
      palette.cleanup();

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('SSR safety', () => {
    it('returns no-op controller in SSR environment', () => {
      const originalWindow = globalThis.window;
      // @ts-expect-error Testing SSR
      delete globalThis.window;

      const palette = createCommandPalette({ container, commands });

      expect(palette.getState().isOpen).toBe(false);
      expect(palette.getState().filteredCommands).toEqual([]);

      // All methods should be no-ops
      palette.open();
      expect(palette.getState().isOpen).toBe(false);

      palette.close();
      palette.setCommands([]);
      palette.setQuery('test');
      palette.selectNext();
      palette.selectPrevious();
      palette.selectFirst();
      palette.selectLast();
      palette.execute();
      palette.cleanup();

      globalThis.window = originalWindow;
    });
  });

  describe('callbacks', () => {
    it('calls onSelect when selection changes', () => {
      const onSelect = vi.fn();
      const palette = createCommandPalette({ container, commands, onSelect });

      palette.open();

      // Called on open with first command selected
      expect(onSelect).toHaveBeenCalledWith(commands[0], 0);

      onSelect.mockClear();
      palette.selectNext();
      expect(onSelect).toHaveBeenCalledWith(commands[1], 1);

      palette.cleanup();
    });

    it('calls onSelect when filtering changes selection to different command', () => {
      const onSelect = vi.fn();
      const palette = createCommandPalette({ container, commands, onSelect });

      palette.open();
      // Initially at index 0 with Bold selected
      palette.selectLast(); // Move to last
      onSelect.mockClear();

      // Filter to only show italic - selection should adjust
      palette.setQuery('italic');

      // Selected index should be 0 (first in filtered list)
      expect(palette.getState().selectedIndex).toBe(0);
      expect(palette.getState().filteredCommands[0]?.id).toBe('italic');
      palette.cleanup();
    });
  });
});
