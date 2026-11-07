/**
 * Command Palette primitive
 * Slash-triggered command palette with fuzzy search and keyboard navigation
 *
 * WCAG Compliance:
 * - 2.1.1 Keyboard (Level A): Full keyboard navigation available
 * - 2.1.2 No Keyboard Trap (Level A): Escape dismisses palette
 * - 2.4.3 Focus Order (Level A): Logical focus order with arrow keys
 *
 * @example
 * ```typescript
 * const palette = createCommandPalette({
 *   container: document.getElementById('editor'),
 *   commands: [
 *     { id: 'bold', label: 'Bold', action: () => toggleBold() },
 *     { id: 'italic', label: 'Italic', action: () => toggleItalic() },
 *   ],
 *   onOpen: () => console.log('Palette opened'),
 *   onClose: () => console.log('Palette closed'),
 * });
 * ```
 *
 * @primitives typeahead types
 */

import { fuzzyScore } from './typeahead';
import type { CleanupFunction, Command } from './types';

/**
 * Options for creating a command palette
 */
export interface CommandPaletteOptions {
  /** Container element to attach keyboard listener to */
  container: HTMLElement;
  /** Trigger character (default '/') */
  trigger?: string;
  /** Available commands */
  commands: Command[];
  /** Callback when palette opens */
  onOpen?: () => void;
  /** Callback when palette closes */
  onClose?: () => void;
  /** Callback when selection changes */
  onSelect?: (command: Command, index: number) => void;
  /** Callback when command is executed */
  onExecute?: (command: Command) => void;
}

/**
 * Current state of the command palette
 */
export interface CommandPaletteState {
  /** Whether the palette is open */
  isOpen: boolean;
  /** Current search query */
  query: string;
  /** Commands filtered by current query */
  filteredCommands: Command[];
  /** Index of currently selected command */
  selectedIndex: number;
}

/**
 * Command palette controller interface
 */
export interface CommandPaletteController {
  /** Get current state */
  getState: () => CommandPaletteState;
  /** Open the palette */
  open: () => void;
  /** Close the palette */
  close: () => void;
  /** Update available commands */
  setCommands: (commands: Command[]) => void;
  /** Update search query and filter commands */
  setQuery: (query: string) => void;
  /** Select next command */
  selectNext: () => void;
  /** Select previous command */
  selectPrevious: () => void;
  /** Select first command */
  selectFirst: () => void;
  /** Select last command */
  selectLast: () => void;
  /** Execute currently selected command */
  execute: () => void;
  /** Cleanup event listeners */
  cleanup: CleanupFunction;
}

/**
 * Score and filter commands based on query
 */
function filterCommands(commands: Command[], query: string): Command[] {
  if (!query) {
    return commands;
  }

  const scored: Array<{ command: Command; score: number }> = [];

  for (const command of commands) {
    const texts = [command.label, command.description ?? '', ...(command.keywords ?? [])];
    const score = Math.max(...texts.map((text) => fuzzyScore(query, text)));
    if (score > 0) {
      scored.push({ command, score });
    }
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return scored.map((item) => item.command);
}

/**
 * Check if trigger character should activate palette
 * Only activates at start of line or after whitespace
 */
function shouldTrigger(container: HTMLElement, trigger: string, key: string): boolean {
  if (key !== trigger) {
    return false;
  }

  // Check selection position in contenteditable or input
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return false;
  }

  const range = selection.getRangeAt(0);
  if (!range.collapsed) {
    return false;
  }

  const node = range.startContainer;
  const offset = range.startOffset;

  // At start of text node
  if (offset === 0) {
    // Check if this is start of container or previous is a block/whitespace
    if (node === container || node.parentNode === container) {
      return true;
    }

    // Check previous sibling or parent context
    const parentElement = node.parentElement;
    if (parentElement) {
      const previousSibling = node.previousSibling;
      if (!previousSibling) {
        return true;
      }
      // Previous sibling is a block element (br, p, div, etc.)
      if (
        previousSibling.nodeType === Node.ELEMENT_NODE &&
        (previousSibling as HTMLElement).tagName.match(/^(BR|P|DIV|LI|H[1-6])$/i)
      ) {
        return true;
      }
    }

    return true;
  }

  // Check character before cursor
  if (node.nodeType === Node.TEXT_NODE) {
    const textContent = node.textContent || '';
    const charBefore = textContent[offset - 1];
    // Trigger after whitespace or at start
    if (charBefore === ' ' || charBefore === '\t' || charBefore === '\n') {
      return true;
    }
  }

  return false;
}

/**
 * Create a command palette with fuzzy search and keyboard navigation
 *
 * @example
 * ```typescript
 * const palette = createCommandPalette({
 *   container: editorElement,
 *   trigger: '/',
 *   commands: [
 *     { id: 'heading', label: 'Heading', keywords: ['h1', 'title'], action: insertHeading },
 *     { id: 'bold', label: 'Bold', shortcut: 'Cmd+B', action: toggleBold },
 *   ],
 *   onOpen: () => showPaletteUI(),
 *   onClose: () => hidePaletteUI(),
 *   onSelect: (cmd, idx) => highlightItem(idx),
 *   onExecute: (cmd) => console.log('Executed:', cmd.id),
 * });
 *
 * // Programmatic control
 * palette.open();
 * palette.setQuery('head');
 * palette.selectNext();
 * palette.execute();
 *
 * // Cleanup
 * palette.cleanup();
 * ```
 */
export function createCommandPalette(options: CommandPaletteOptions): CommandPaletteController {
  // SSR guard
  if (typeof window === 'undefined') {
    const noopState: CommandPaletteState = {
      isOpen: false,
      query: '',
      filteredCommands: [],
      selectedIndex: -1,
    };
    return {
      getState: () => noopState,
      open: () => {},
      close: () => {},
      setCommands: () => {},
      setQuery: () => {},
      selectNext: () => {},
      selectPrevious: () => {},
      selectFirst: () => {},
      selectLast: () => {},
      execute: () => {},
      cleanup: () => {},
    };
  }

  const { container, trigger = '/', onOpen, onClose, onSelect, onExecute } = options;

  // Internal state
  let commands = [...options.commands];
  let isOpen = false;
  let query = '';
  let filteredCommands: Command[] = [];
  let selectedIndex = -1;

  /**
   * Get current state
   */
  const getState = (): CommandPaletteState => ({
    isOpen,
    query,
    filteredCommands,
    selectedIndex,
  });

  /**
   * Update filtered commands and selection
   */
  const updateFiltered = () => {
    filteredCommands = filterCommands(commands, query);
    if (filteredCommands.length > 0 && selectedIndex === -1) {
      selectedIndex = 0;
      const selected = filteredCommands[selectedIndex];
      if (selected) {
        onSelect?.(selected, selectedIndex);
      }
    } else if (filteredCommands.length === 0) {
      selectedIndex = -1;
    } else if (selectedIndex >= filteredCommands.length) {
      selectedIndex = filteredCommands.length - 1;
      const selected = filteredCommands[selectedIndex];
      if (selected) {
        onSelect?.(selected, selectedIndex);
      }
    }
  };

  /**
   * Open the palette
   */
  const open = () => {
    if (isOpen) return;
    isOpen = true;
    query = '';
    filteredCommands = [...commands];
    selectedIndex = filteredCommands.length > 0 ? 0 : -1;
    onOpen?.();
    if (selectedIndex >= 0) {
      const selected = filteredCommands[selectedIndex];
      if (selected) {
        onSelect?.(selected, selectedIndex);
      }
    }
  };

  /**
   * Close the palette
   */
  const close = () => {
    if (!isOpen) return;
    isOpen = false;
    query = '';
    filteredCommands = [];
    selectedIndex = -1;
    onClose?.();
  };

  /**
   * Update available commands
   */
  const setCommands = (newCommands: Command[]) => {
    commands = [...newCommands];
    if (isOpen) {
      updateFiltered();
    }
  };

  /**
   * Update search query
   */
  const setQuery = (newQuery: string) => {
    query = newQuery;
    updateFiltered();
  };

  /**
   * Select next command
   */
  const selectNext = () => {
    if (filteredCommands.length === 0) return;
    selectedIndex = (selectedIndex + 1) % filteredCommands.length;
    const selected = filteredCommands[selectedIndex];
    if (selected) {
      onSelect?.(selected, selectedIndex);
    }
  };

  /**
   * Select previous command
   */
  const selectPrevious = () => {
    if (filteredCommands.length === 0) return;
    selectedIndex = selectedIndex <= 0 ? filteredCommands.length - 1 : selectedIndex - 1;
    const selected = filteredCommands[selectedIndex];
    if (selected) {
      onSelect?.(selected, selectedIndex);
    }
  };

  /**
   * Select first command
   */
  const selectFirst = () => {
    if (filteredCommands.length === 0) return;
    selectedIndex = 0;
    const selected = filteredCommands[selectedIndex];
    if (selected) {
      onSelect?.(selected, selectedIndex);
    }
  };

  /**
   * Select last command
   */
  const selectLast = () => {
    if (filteredCommands.length === 0) return;
    selectedIndex = filteredCommands.length - 1;
    const selected = filteredCommands[selectedIndex];
    if (selected) {
      onSelect?.(selected, selectedIndex);
    }
  };

  /**
   * Execute currently selected command
   */
  const execute = () => {
    if (selectedIndex < 0 || selectedIndex >= filteredCommands.length) return;
    const command = filteredCommands[selectedIndex];
    if (command) {
      close();
      command.action();
      onExecute?.(command);
    }
  };

  /**
   * Handle keydown events
   */
  const handleKeyDown = (event: KeyboardEvent) => {
    const { key } = event;

    // Check for trigger when palette is closed
    if (!isOpen) {
      if (shouldTrigger(container, trigger, key)) {
        event.preventDefault();
        open();
      }
      return;
    }

    // Handle palette navigation
    switch (key) {
      case 'Escape':
        event.preventDefault();
        close();
        break;

      case 'ArrowDown':
        event.preventDefault();
        selectNext();
        break;

      case 'ArrowUp':
        event.preventDefault();
        selectPrevious();
        break;

      case 'Enter':
        event.preventDefault();
        execute();
        break;

      case 'Home':
        event.preventDefault();
        selectFirst();
        break;

      case 'End':
        event.preventDefault();
        selectLast();
        break;
    }
  };

  // Attach event listener
  container.addEventListener('keydown', handleKeyDown);

  /**
   * Cleanup function
   */
  const cleanup: CleanupFunction = () => {
    container.removeEventListener('keydown', handleKeyDown);
    close();
  };

  return {
    getState,
    open,
    close,
    setCommands,
    setQuery,
    selectNext,
    selectPrevious,
    selectFirst,
    selectLast,
    execute,
    cleanup,
  };
}
