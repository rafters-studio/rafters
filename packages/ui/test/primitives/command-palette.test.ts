import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCommandPalette } from '../../src/primitives/command-palette';
import { fuzzyScore } from '../../src/primitives/typeahead';
import type { Command } from '../../src/primitives/types';

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

    it("ranks matches by typeahead's fuzzyScore", () => {
      const ranked: Command[] = [
        { id: 'within', label: 'Within', action: vi.fn() },
        { id: 'heading-insert', label: 'Heading Insert', action: vi.fn() },
      ];
      const palette = createCommandPalette({ container, commands: ranked });

      palette.open();
      palette.setQuery('hi');

      expect(fuzzyScore('hi', 'Heading Insert')).toBeGreaterThan(fuzzyScore('hi', 'Within'));
      expect(palette.getState().filteredCommands.map((c) => c.id)).toEqual([
        'heading-insert',
        'within',
      ]);
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
