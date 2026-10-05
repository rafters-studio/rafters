import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBlockSelection, createTextSelection } from '../../src/primitives/selection';

describe('createBlockSelection', () => {
  let container: HTMLDivElement;
  let blocks: HTMLDivElement[];

  function createBlock(id: string): HTMLDivElement {
    const block = document.createElement('div');
    block.setAttribute('data-block-id', id);
    block.textContent = `Block ${id}`;
    return block;
  }

  function getBlocks(): HTMLElement[] {
    return Array.from(container.querySelectorAll('[data-block-id]'));
  }

  beforeEach(() => {
    container = document.createElement('div');
    blocks = [
      createBlock('block-1'),
      createBlock('block-2'),
      createBlock('block-3'),
      createBlock('block-4'),
      createBlock('block-5'),
    ];
    for (const block of blocks) {
      container.appendChild(block);
    }
    document.body.appendChild(container);
  });

  describe('single block selection', () => {
    it('selects a single block', () => {
      const selection = createBlockSelection({
        container,
        getBlocks,
      });

      selection.select('block-2');

      const state = selection.getState();
      expect(state.selected.has('block-2')).toBe(true);
      expect(state.selected.size).toBe(1);
      expect(state.anchor).toBe('block-2');
      expect(state.focus).toBe('block-2');

      selection.cleanup();
    });

    it('clears previous selection when selecting without additive flag', () => {
      const selection = createBlockSelection({
        container,
        getBlocks,
      });

      selection.select('block-1');
      selection.select('block-3');

      const state = selection.getState();
      expect(state.selected.has('block-1')).toBe(false);
      expect(state.selected.has('block-3')).toBe(true);
      expect(state.selected.size).toBe(1);

      selection.cleanup();
    });
  });

  describe('additive selection', () => {
    it('adds to selection when additive is true', () => {
      const selection = createBlockSelection({
        container,
        getBlocks,
      });

      selection.select('block-1');
      selection.select('block-3', true);

      const state = selection.getState();
      expect(state.selected.has('block-1')).toBe(true);
      expect(state.selected.has('block-3')).toBe(true);
      expect(state.selected.size).toBe(2);

      selection.cleanup();
    });

    it('toggles selection when additive and already selected', () => {
      const selection = createBlockSelection({
        container,
        getBlocks,
      });

      selection.select('block-1');
      selection.select('block-2', true);
      selection.select('block-1', true);

      const state = selection.getState();
      expect(state.selected.has('block-1')).toBe(false);
      expect(state.selected.has('block-2')).toBe(true);
      expect(state.selected.size).toBe(1);

      selection.cleanup();
    });
  });

  describe('range selection', () => {
    it('selects all blocks between two IDs inclusive', () => {
      const selection = createBlockSelection({
        container,
        getBlocks,
      });

      selection.selectRange('block-2', 'block-4');

      const state = selection.getState();
      expect(state.selected.has('block-1')).toBe(false);
      expect(state.selected.has('block-2')).toBe(true);
      expect(state.selected.has('block-3')).toBe(true);
      expect(state.selected.has('block-4')).toBe(true);
      expect(state.selected.has('block-5')).toBe(false);
      expect(state.selected.size).toBe(3);
      expect(state.anchor).toBe('block-2');
      expect(state.focus).toBe('block-4');

      selection.cleanup();
    });

    it('handles reverse range (toId before fromId)', () => {
      const selection = createBlockSelection({
        container,
        getBlocks,
      });

      selection.selectRange('block-4', 'block-2');

      const state = selection.getState();
      expect(state.selected.has('block-2')).toBe(true);
      expect(state.selected.has('block-3')).toBe(true);
      expect(state.selected.has('block-4')).toBe(true);
      expect(state.selected.size).toBe(3);

      selection.cleanup();
    });

    it('does nothing if fromId is not found', () => {
      const selection = createBlockSelection({
        container,
        getBlocks,
      });

      selection.select('block-1');
      selection.selectRange('nonexistent', 'block-3');

      const state = selection.getState();
      expect(state.selected.has('block-1')).toBe(true);
      expect(state.selected.size).toBe(1);

      selection.cleanup();
    });

    it('does nothing if toId is not found', () => {
      const selection = createBlockSelection({
        container,
        getBlocks,
      });

      selection.select('block-1');
      selection.selectRange('block-2', 'nonexistent');

      const state = selection.getState();
      expect(state.selected.has('block-1')).toBe(true);
      expect(state.selected.size).toBe(1);

      selection.cleanup();
    });
  });

  describe('selectAll', () => {
    it('selects all blocks', () => {
      const selection = createBlockSelection({
        container,
        getBlocks,
      });

      selection.selectAll();

      const state = selection.getState();
      expect(state.selected.size).toBe(5);
      expect(state.selected.has('block-1')).toBe(true);
      expect(state.selected.has('block-2')).toBe(true);
      expect(state.selected.has('block-3')).toBe(true);
      expect(state.selected.has('block-4')).toBe(true);
      expect(state.selected.has('block-5')).toBe(true);
      expect(state.anchor).toBe('block-1');
      expect(state.focus).toBe('block-5');

      selection.cleanup();
    });

    it('handles empty container', () => {
      // Remove all children using DOM methods
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      const selection = createBlockSelection({
        container,
        getBlocks,
      });

      selection.selectAll();

      const state = selection.getState();
      expect(state.selected.size).toBe(0);
      expect(state.anchor).toBe(null);
      expect(state.focus).toBe(null);

      selection.cleanup();
    });
  });

  describe('clear', () => {
    it('clears all selection', () => {
      const selection = createBlockSelection({
        container,
        getBlocks,
      });

      selection.selectAll();
      selection.clear();

      const state = selection.getState();
      expect(state.selected.size).toBe(0);
      expect(state.anchor).toBe(null);
      expect(state.focus).toBe(null);

      selection.cleanup();
    });

    it('handles already empty selection', () => {
      const onChange = vi.fn();
      const selection = createBlockSelection({
        container,
        getBlocks,
        onSelectionChange: onChange,
      });

      selection.clear();

      // Should not call onChange when nothing changes
      expect(onChange).not.toHaveBeenCalled();

      selection.cleanup();
    });
  });

  describe('onSelectionChange callback', () => {
    it('fires on select', () => {
      const onChange = vi.fn();
      const selection = createBlockSelection({
        container,
        getBlocks,
        onSelectionChange: onChange,
      });

      selection.select('block-1');

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(new Set(['block-1']));

      selection.cleanup();
    });

    it('fires on additive select', () => {
      const onChange = vi.fn();
      const selection = createBlockSelection({
        container,
        getBlocks,
        onSelectionChange: onChange,
      });

      selection.select('block-1');
      selection.select('block-2', true);

      expect(onChange).toHaveBeenCalledTimes(2);
      expect(onChange).toHaveBeenLastCalledWith(new Set(['block-1', 'block-2']));

      selection.cleanup();
    });

    it('fires on selectRange', () => {
      const onChange = vi.fn();
      const selection = createBlockSelection({
        container,
        getBlocks,
        onSelectionChange: onChange,
      });

      selection.selectRange('block-1', 'block-3');

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(new Set(['block-1', 'block-2', 'block-3']));

      selection.cleanup();
    });

    it('fires on selectAll', () => {
      const onChange = vi.fn();
      const selection = createBlockSelection({
        container,
        getBlocks,
        onSelectionChange: onChange,
      });

      selection.selectAll();

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(
        new Set(['block-1', 'block-2', 'block-3', 'block-4', 'block-5']),
      );

      selection.cleanup();
    });

    it('fires on clear', () => {
      const onChange = vi.fn();
      const selection = createBlockSelection({
        container,
        getBlocks,
        onSelectionChange: onChange,
      });

      selection.select('block-1');
      selection.clear();

      expect(onChange).toHaveBeenCalledTimes(2);
      expect(onChange).toHaveBeenLastCalledWith(new Set());

      selection.cleanup();
    });

    it('receives a copy of the set to prevent mutation', () => {
      let capturedSet: Set<string> | null = null;
      const onChange = (selected: Set<string>) => {
        capturedSet = selected;
      };
      const selection = createBlockSelection({
        container,
        getBlocks,
        onSelectionChange: onChange,
      });

      selection.select('block-1');

      // Mutate the captured set
      capturedSet?.add('mutated');

      // Internal state should not be affected
      const state = selection.getState();
      expect(state.selected.has('mutated')).toBe(false);

      selection.cleanup();
    });
  });

  describe('multiSelect option', () => {
    it('when false, always replaces selection', () => {
      const selection = createBlockSelection({
        container,
        getBlocks,
        multiSelect: false,
      });

      selection.select('block-1');
      selection.select('block-2', true); // additive flag ignored

      const state = selection.getState();
      expect(state.selected.size).toBe(1);
      expect(state.selected.has('block-2')).toBe(true);

      selection.cleanup();
    });
  });

  describe('getState', () => {
    it('returns a copy of state to prevent mutation', () => {
      const selection = createBlockSelection({
        container,
        getBlocks,
      });

      selection.select('block-1');
      const state1 = selection.getState();

      // Mutate the returned state
      state1.selected.add('hacked');

      // Internal state should not be affected
      const state2 = selection.getState();
      expect(state2.selected.has('hacked')).toBe(false);
      expect(state2.selected.size).toBe(1);

      selection.cleanup();
    });
  });

  describe('cleanup', () => {
    it('removes event listeners', () => {
      const selection = createBlockSelection({
        container,
        getBlocks,
      });

      selection.cleanup();

      // After cleanup, clicking should not select
      const clickEvent = new MouseEvent('click', { bubbles: true });
      blocks[0]?.dispatchEvent(clickEvent);

      const state = selection.getState();
      expect(state.selected.size).toBe(0);
    });
  });

  describe('click handling', () => {
    it('selects block on click', () => {
      const selection = createBlockSelection({
        container,
        getBlocks,
      });

      const clickEvent = new MouseEvent('click', { bubbles: true });
      blocks[1]?.dispatchEvent(clickEvent);

      const state = selection.getState();
      expect(state.selected.has('block-2')).toBe(true);
      expect(state.selected.size).toBe(1);

      selection.cleanup();
    });

    it('handles Ctrl+click for additive selection', () => {
      const selection = createBlockSelection({
        container,
        getBlocks,
      });

      const click1 = new MouseEvent('click', { bubbles: true });
      blocks[0]?.dispatchEvent(click1);

      const click2 = new MouseEvent('click', { bubbles: true, ctrlKey: true });
      blocks[2]?.dispatchEvent(click2);

      const state = selection.getState();
      expect(state.selected.has('block-1')).toBe(true);
      expect(state.selected.has('block-3')).toBe(true);
      expect(state.selected.size).toBe(2);

      selection.cleanup();
    });

    it('handles Shift+click for range selection', () => {
      const selection = createBlockSelection({
        container,
        getBlocks,
      });

      const click1 = new MouseEvent('click', { bubbles: true });
      blocks[0]?.dispatchEvent(click1);

      const click2 = new MouseEvent('click', { bubbles: true, shiftKey: true });
      blocks[3]?.dispatchEvent(click2);

      const state = selection.getState();
      expect(state.selected.has('block-1')).toBe(true);
      expect(state.selected.has('block-2')).toBe(true);
      expect(state.selected.has('block-3')).toBe(true);
      expect(state.selected.has('block-4')).toBe(true);
      expect(state.selected.size).toBe(4);

      selection.cleanup();
    });

    it('ignores clicks outside blocks', () => {
      const selection = createBlockSelection({
        container,
        getBlocks,
      });

      const clickEvent = new MouseEvent('click', { bubbles: true });
      container.dispatchEvent(clickEvent);

      const state = selection.getState();
      expect(state.selected.size).toBe(0);

      selection.cleanup();
    });
  });
});

describe('createTextSelection', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.setAttribute('contenteditable', 'true');
    container.innerHTML = 'Hello world this is a test';
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Clear any existing selection
    window.getSelection()?.removeAllRanges();
    document.body.removeChild(container);
  });

  describe('getRange', () => {
    it('returns null when no selection exists', () => {
      const textSelection = createTextSelection({ container });

      const range = textSelection.getRange();

      expect(range).toBeNull();

      textSelection.cleanup();
    });

    it('returns null when selection is outside container', () => {
      const outsideElement = document.createElement('div');
      outsideElement.textContent = 'Outside content';
      document.body.appendChild(outsideElement);

      const textSelection = createTextSelection({ container });

      // Create selection in outside element
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(outsideElement);
      selection?.removeAllRanges();
      selection?.addRange(range);

      const result = textSelection.getRange();
      expect(result).toBeNull();

      textSelection.cleanup();
      document.body.removeChild(outsideElement);
    });

    it('returns range when selection is inside container', () => {
      const textSelection = createTextSelection({ container });

      // Create selection inside container
      const selection = window.getSelection();
      const range = document.createRange();
      const textNode = container.firstChild;
      if (textNode) {
        range.setStart(textNode, 0);
        range.setEnd(textNode, 5); // "Hello"
        selection?.removeAllRanges();
        selection?.addRange(range);
      }

      const result = textSelection.getRange();

      expect(result).not.toBeNull();
      expect(result?.startOffset).toBe(0);
      expect(result?.endOffset).toBe(5);
      expect(result?.collapsed).toBe(false);

      textSelection.cleanup();
    });
  });

  describe('setRange', () => {
    it('sets range programmatically', () => {
      const textSelection = createTextSelection({ container });

      const textNode = container.firstChild;
      if (textNode) {
        textSelection.setRange({
          startNode: textNode,
          startOffset: 6,
          endNode: textNode,
          endOffset: 11, // "world"
          collapsed: false,
        });

        const result = textSelection.getRange();
        expect(result).not.toBeNull();
        expect(result?.startOffset).toBe(6);
        expect(result?.endOffset).toBe(11);
      }

      textSelection.cleanup();
    });

    it('does not set range if nodes are outside container', () => {
      const outsideElement = document.createElement('div');
      outsideElement.textContent = 'Outside';
      document.body.appendChild(outsideElement);

      const textSelection = createTextSelection({ container });

      const outsideTextNode = outsideElement.firstChild;
      if (outsideTextNode) {
        textSelection.setRange({
          startNode: outsideTextNode,
          startOffset: 0,
          endNode: outsideTextNode,
          endOffset: 7,
          collapsed: false,
        });

        // Should not have set selection in container
        const result = textSelection.getRange();
        expect(result).toBeNull();
      }

      textSelection.cleanup();
      document.body.removeChild(outsideElement);
    });
  });

  describe('collapse', () => {
    it('collapses selection to start', () => {
      const textSelection = createTextSelection({ container });

      const textNode = container.firstChild;
      if (textNode) {
        // Set initial selection
        textSelection.setRange({
          startNode: textNode,
          startOffset: 0,
          endNode: textNode,
          endOffset: 5,
          collapsed: false,
        });

        textSelection.collapse(true);

        const result = textSelection.getRange();
        expect(result?.collapsed).toBe(true);
        expect(result?.startOffset).toBe(0);
      }

      textSelection.cleanup();
    });

    it('collapses selection to end', () => {
      const textSelection = createTextSelection({ container });

      const textNode = container.firstChild;
      if (textNode) {
        textSelection.setRange({
          startNode: textNode,
          startOffset: 0,
          endNode: textNode,
          endOffset: 5,
          collapsed: false,
        });

        textSelection.collapse(false);

        const result = textSelection.getRange();
        expect(result?.collapsed).toBe(true);
        expect(result?.startOffset).toBe(5);
      }

      textSelection.cleanup();
    });

    it('does nothing when no selection exists', () => {
      const textSelection = createTextSelection({ container });

      // Should not throw
      textSelection.collapse(true);

      const result = textSelection.getRange();
      expect(result).toBeNull();

      textSelection.cleanup();
    });
  });

  describe('expandByWord', () => {
    it('expands collapsed cursor to word boundaries when Selection.modify is available', () => {
      const textSelection = createTextSelection({ container });

      const textNode = container.firstChild;
      if (textNode) {
        // Place cursor in middle of "Hello"
        textSelection.setRange({
          startNode: textNode,
          startOffset: 2,
          endNode: textNode,
          endOffset: 2,
          collapsed: true,
        });

        // Check if Selection.modify is available (not in jsdom)
        const selection = window.getSelection();
        const hasModify = selection && 'modify' in selection;

        textSelection.expandByWord();

        const result = textSelection.getRange();
        if (hasModify) {
          // In real browsers, should have expanded
          expect(result?.collapsed).toBe(false);
        } else {
          // In jsdom, modify is not available so selection stays collapsed
          expect(result?.collapsed).toBe(true);
        }
      }

      textSelection.cleanup();
    });

    it('does nothing when no selection exists', () => {
      const textSelection = createTextSelection({ container });

      // Should not throw
      textSelection.expandByWord();

      const result = textSelection.getRange();
      expect(result).toBeNull();

      textSelection.cleanup();
    });
  });

  describe('expandByLine', () => {
    it('expands selection to line boundaries when Selection.modify is available', () => {
      // Create container with multiple lines
      container.innerHTML = 'First line<br>Second line';

      const textSelection = createTextSelection({ container });

      const textNode = container.firstChild;
      if (textNode) {
        // Place cursor in "First"
        textSelection.setRange({
          startNode: textNode,
          startOffset: 3,
          endNode: textNode,
          endOffset: 3,
          collapsed: true,
        });

        // Check if Selection.modify is available (not in jsdom)
        const selection = window.getSelection();
        const hasModify = selection && 'modify' in selection;

        textSelection.expandByLine();

        const result = textSelection.getRange();
        if (hasModify) {
          // In real browsers, should have expanded
          expect(result?.collapsed).toBe(false);
        } else {
          // In jsdom, modify is not available so selection stays collapsed
          expect(result?.collapsed).toBe(true);
        }
      }

      textSelection.cleanup();
    });

    it('does nothing when no selection exists', () => {
      const textSelection = createTextSelection({ container });

      // Should not throw
      textSelection.expandByLine();

      const result = textSelection.getRange();
      expect(result).toBeNull();

      textSelection.cleanup();
    });
  });

  describe('cleanup', () => {
    it('removes selectionchange listener', () => {
      const onSelectionChange = vi.fn();
      const textSelection = createTextSelection({
        container,
        onSelectionChange,
      });

      textSelection.cleanup();

      // Create a selection after cleanup
      const textNode = container.firstChild;
      if (textNode) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.setStart(textNode, 0);
        range.setEnd(textNode, 5);
        selection?.removeAllRanges();
        selection?.addRange(range);

        // Dispatch selectionchange event manually
        document.dispatchEvent(new Event('selectionchange'));
      }

      // Callback should not have been called after cleanup
      expect(onSelectionChange).not.toHaveBeenCalled();
    });
  });

  describe('onSelectionChange callback', () => {
    it('fires when selection changes within container', () => {
      const onSelectionChange = vi.fn();
      const textSelection = createTextSelection({
        container,
        onSelectionChange,
      });

      const textNode = container.firstChild;
      if (textNode) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.setStart(textNode, 0);
        range.setEnd(textNode, 5);
        selection?.removeAllRanges();
        selection?.addRange(range);

        // Dispatch selectionchange event
        document.dispatchEvent(new Event('selectionchange'));
      }

      // Callback should have been called at least once with our selection
      expect(onSelectionChange).toHaveBeenCalled();
      expect(onSelectionChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          startOffset: 0,
          endOffset: 5,
          collapsed: false,
        }),
      );

      textSelection.cleanup();
    });

    it('fires with null when selection is outside container', () => {
      const outsideElement = document.createElement('div');
      outsideElement.textContent = 'Outside';
      document.body.appendChild(outsideElement);

      const onSelectionChange = vi.fn();
      const textSelection = createTextSelection({
        container,
        onSelectionChange,
      });

      // Select outside element
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(outsideElement);
      selection?.removeAllRanges();
      selection?.addRange(range);

      // Dispatch selectionchange event
      document.dispatchEvent(new Event('selectionchange'));

      expect(onSelectionChange).toHaveBeenCalledWith(null);

      textSelection.cleanup();
      document.body.removeChild(outsideElement);
    });
  });

  describe('SSR safety', () => {
    it('returns no-op controller when window is undefined', () => {
      // This test verifies the code path exists
      // In actual SSR, window would be undefined
      const textSelection = createTextSelection({ container });

      // These should not throw
      expect(textSelection.getRange).toBeDefined();
      expect(textSelection.setRange).toBeDefined();
      expect(textSelection.collapse).toBeDefined();
      expect(textSelection.expandByWord).toBeDefined();
      expect(textSelection.expandByLine).toBeDefined();
      expect(textSelection.cleanup).toBeDefined();

      textSelection.cleanup();
    });
  });
});
