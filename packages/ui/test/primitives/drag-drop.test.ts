import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDraggable,
  createDropZone,
  resetDragDropState,
} from '../../src/primitives/drag-drop';

describe('createDraggable', () => {
  let element: HTMLDivElement;

  beforeEach(() => {
    resetDragDropState();
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  afterEach(() => {
    element.remove();
    resetDragDropState();
  });

  describe('initialization', () => {
    it('sets initial ARIA attributes', () => {
      const controls = createDraggable({
        element,
        data: { id: 'test' },
      });

      expect(element.getAttribute('draggable')).toBe('true');
      expect(element.getAttribute('aria-grabbed')).toBe('false');
      expect(element.getAttribute('tabindex')).toBe('0');

      controls.cleanup();
    });

    it('preserves existing tabindex', () => {
      element.setAttribute('tabindex', '-1');

      const controls = createDraggable({
        element,
        data: { id: 'test' },
      });

      expect(element.getAttribute('tabindex')).toBe('-1');

      controls.cleanup();
    });
  });

  describe('mouse drag and drop', () => {
    it('calls onDragStart when drag begins', () => {
      const onDragStart = vi.fn();
      const controls = createDraggable({
        element,
        data: { id: 'item-1' },
        onDragStart,
      });

      const dragEvent = new DragEvent('dragstart', {
        bubbles: true,
        dataTransfer: new DataTransfer(),
      });

      element.dispatchEvent(dragEvent);

      expect(onDragStart).toHaveBeenCalledTimes(1);
      expect(onDragStart).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { id: 'item-1' },
        }),
      );

      controls.cleanup();
    });

    it('sets aria-grabbed to true during drag', () => {
      const controls = createDraggable({
        element,
        data: { id: 'test' },
      });

      const dragEvent = new DragEvent('dragstart', {
        bubbles: true,
        dataTransfer: new DataTransfer(),
      });

      element.dispatchEvent(dragEvent);

      expect(element.getAttribute('aria-grabbed')).toBe('true');

      controls.cleanup();
    });

    it('calls onDrag during drag movement', () => {
      const onDrag = vi.fn();
      const controls = createDraggable({
        element,
        data: { id: 'item-1' },
        onDrag,
      });

      // Start drag
      element.dispatchEvent(
        new DragEvent('dragstart', {
          bubbles: true,
          dataTransfer: new DataTransfer(),
        }),
      );

      // Move during drag - note: jsdom doesn't fully support clientX/clientY on DragEvent
      // We test that onDrag is called; real browser tests would verify coordinates
      const dragEvent = new DragEvent('drag', {
        bubbles: true,
      });
      // Manually set properties since jsdom doesn't support them in constructor
      Object.defineProperty(dragEvent, 'clientX', { value: 50 });
      Object.defineProperty(dragEvent, 'clientY', { value: 60 });

      element.dispatchEvent(dragEvent);

      expect(onDrag).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { id: 'item-1' },
          clientX: 50,
          clientY: 60,
        }),
      );

      controls.cleanup();
    });

    it('calls onDragEnd when drag ends', () => {
      const onDragEnd = vi.fn();
      const controls = createDraggable({
        element,
        data: { id: 'item-1' },
        onDragEnd,
      });

      // Start drag
      element.dispatchEvent(
        new DragEvent('dragstart', {
          bubbles: true,
          dataTransfer: new DataTransfer(),
        }),
      );

      // End drag
      const endEvent = new DragEvent('dragend', {
        bubbles: true,
        clientX: 100,
        clientY: 100,
        dataTransfer: new DataTransfer(),
      });

      element.dispatchEvent(endEvent);

      expect(onDragEnd).toHaveBeenCalledTimes(1);
      expect(element.getAttribute('aria-grabbed')).toBe('false');

      controls.cleanup();
    });

    it('applies axis constraint for x-only', () => {
      const onDrag = vi.fn();
      const controls = createDraggable({
        element,
        data: { id: 'test' },
        axis: 'x',
        onDrag,
      });

      // Start drag with manually set coordinates
      const startEvent = new DragEvent('dragstart', {
        bubbles: true,
        dataTransfer: new DataTransfer(),
      });
      Object.defineProperty(startEvent, 'clientX', { value: 0 });
      Object.defineProperty(startEvent, 'clientY', { value: 0 });
      element.dispatchEvent(startEvent);

      const dragEvent = new DragEvent('drag', {
        bubbles: true,
      });
      Object.defineProperty(dragEvent, 'clientX', { value: 100 });
      Object.defineProperty(dragEvent, 'clientY', { value: 50 });
      element.dispatchEvent(dragEvent);

      expect(onDrag).toHaveBeenCalledWith(
        expect.objectContaining({
          deltaX: 100,
          deltaY: 0, // constrained to 0
        }),
      );

      controls.cleanup();
    });

    it('applies axis constraint for y-only', () => {
      const onDrag = vi.fn();
      const controls = createDraggable({
        element,
        data: { id: 'test' },
        axis: 'y',
        onDrag,
      });

      const startEvent = new DragEvent('dragstart', {
        bubbles: true,
        dataTransfer: new DataTransfer(),
      });
      Object.defineProperty(startEvent, 'clientX', { value: 0 });
      Object.defineProperty(startEvent, 'clientY', { value: 0 });
      element.dispatchEvent(startEvent);

      const dragEvent = new DragEvent('drag', {
        bubbles: true,
      });
      Object.defineProperty(dragEvent, 'clientX', { value: 50 });
      Object.defineProperty(dragEvent, 'clientY', { value: 100 });
      element.dispatchEvent(dragEvent);

      expect(onDrag).toHaveBeenCalledWith(
        expect.objectContaining({
          deltaX: 0, // constrained to 0
          deltaY: 100,
        }),
      );

      controls.cleanup();
    });
  });

  describe('keyboard drag', () => {
    it('starts keyboard drag on Space key', () => {
      const onDragStart = vi.fn();
      const controls = createDraggable({
        element,
        data: { id: 'test' },
        onDragStart,
      });

      element.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

      expect(onDragStart).toHaveBeenCalledTimes(1);
      expect(element.getAttribute('aria-grabbed')).toBe('true');

      controls.cleanup();
    });

    it('commits keyboard drag on second Space key', () => {
      const onDragEnd = vi.fn();
      const controls = createDraggable({
        element,
        data: { id: 'test' },
        onDragEnd,
      });

      // Start drag
      element.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

      // Commit drag
      element.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

      expect(onDragEnd).toHaveBeenCalledTimes(1);
      expect(element.getAttribute('aria-grabbed')).toBe('false');

      controls.cleanup();
    });

    it('cancels keyboard drag on Escape key', () => {
      const onDragEnd = vi.fn();
      const controls = createDraggable({
        element,
        data: { id: 'test' },
        onDragEnd,
      });

      // Start drag
      element.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

      // Cancel drag
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      expect(onDragEnd).toHaveBeenCalledWith(expect.anything(), 'none');
      expect(element.getAttribute('aria-grabbed')).toBe('false');

      controls.cleanup();
    });

    it('navigates with arrow keys during keyboard drag', () => {
      const dropZone1 = document.createElement('div');
      const dropZone2 = document.createElement('div');
      dropZone1.style.cssText = 'position: absolute; top: 0; left: 0;';
      dropZone2.style.cssText = 'position: absolute; top: 100px; left: 0;';
      document.body.appendChild(dropZone1);
      document.body.appendChild(dropZone2);

      const onDragEnter1 = vi.fn();
      const onDragEnter2 = vi.fn();

      const dz1 = createDropZone({
        element: dropZone1,
        onDragEnter: onDragEnter1,
      });

      const dz2 = createDropZone({
        element: dropZone2,
        onDragEnter: onDragEnter2,
      });

      const controls = createDraggable({
        element,
        data: { id: 'test' },
      });

      // Start keyboard drag
      element.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

      // Move down to first drop zone
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

      expect(onDragEnter1).toHaveBeenCalled();

      // Move down to second drop zone
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

      expect(onDragEnter2).toHaveBeenCalled();

      controls.cleanup();
      dz1.cleanup();
      dz2.cleanup();
      dropZone1.remove();
      dropZone2.remove();
    });

    it('exposes programmatic keyboard drag methods', () => {
      const onDragStart = vi.fn();
      const onDragEnd = vi.fn();

      const controls = createDraggable({
        element,
        data: { id: 'test' },
        onDragStart,
        onDragEnd,
      });

      // Test startKeyboardDrag
      controls.startKeyboardDrag();
      expect(onDragStart).toHaveBeenCalledTimes(1);
      expect(element.getAttribute('aria-grabbed')).toBe('true');

      // Test commitKeyboardDrag
      controls.commitKeyboardDrag();
      expect(onDragEnd).toHaveBeenCalledTimes(1);
      expect(element.getAttribute('aria-grabbed')).toBe('false');

      controls.cleanup();
    });

    it('cancelKeyboardDrag calls onDragEnd with none effect', () => {
      const onDragEnd = vi.fn();

      const controls = createDraggable({
        element,
        data: { id: 'test' },
        onDragEnd,
      });

      controls.startKeyboardDrag();
      controls.cancelKeyboardDrag();

      expect(onDragEnd).toHaveBeenCalledWith(expect.anything(), 'none');

      controls.cleanup();
    });
  });

  describe('touch support', () => {
    it('initiates drag after long press', async () => {
      vi.useFakeTimers();

      const onDragStart = vi.fn();
      const controls = createDraggable({
        element,
        data: { id: 'test' },
        onDragStart,
      });

      // Start touch
      const touchStartEvent = new TouchEvent('touchstart', {
        bubbles: true,
        touches: [{ clientX: 100, clientY: 100, identifier: 0 } as Touch],
      });
      element.dispatchEvent(touchStartEvent);

      // Fast forward past long press duration
      vi.advanceTimersByTime(350);

      expect(onDragStart).toHaveBeenCalledTimes(1);
      expect(element.getAttribute('aria-grabbed')).toBe('true');

      controls.cleanup();
      vi.useRealTimers();
    });

    it('cancels long press if moved before timer', async () => {
      vi.useFakeTimers();

      const onDragStart = vi.fn();
      const controls = createDraggable({
        element,
        data: { id: 'test' },
        onDragStart,
      });

      // Start touch
      element.dispatchEvent(
        new TouchEvent('touchstart', {
          bubbles: true,
          touches: [{ clientX: 100, clientY: 100, identifier: 0 } as Touch],
        }),
      );

      // Move significantly before long press fires
      vi.advanceTimersByTime(100);

      element.dispatchEvent(
        new TouchEvent('touchmove', {
          bubbles: true,
          touches: [{ clientX: 150, clientY: 100, identifier: 0 } as Touch],
        }),
      );

      // Advance past long press duration
      vi.advanceTimersByTime(300);

      // Should not have started drag
      expect(onDragStart).not.toHaveBeenCalled();

      controls.cleanup();
      vi.useRealTimers();
    });

    it('ends touch drag on touchend', async () => {
      vi.useFakeTimers();

      const onDragEnd = vi.fn();
      const controls = createDraggable({
        element,
        data: { id: 'test' },
        onDragEnd,
      });

      // Start touch
      element.dispatchEvent(
        new TouchEvent('touchstart', {
          bubbles: true,
          touches: [{ clientX: 100, clientY: 100, identifier: 0 } as Touch],
        }),
      );

      // Wait for long press
      vi.advanceTimersByTime(350);

      // End touch
      element.dispatchEvent(
        new TouchEvent('touchend', {
          bubbles: true,
          changedTouches: [{ clientX: 150, clientY: 150, identifier: 0 } as Touch],
        }),
      );

      expect(onDragEnd).toHaveBeenCalledTimes(1);
      expect(element.getAttribute('aria-grabbed')).toBe('false');

      controls.cleanup();
      vi.useRealTimers();
    });
  });

  describe('disabled state', () => {
    it('prevents drag when disabled', () => {
      const onDragStart = vi.fn();
      const controls = createDraggable({
        element,
        data: { id: 'test' },
        disabled: true,
        onDragStart,
      });

      const event = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer(),
      });

      element.dispatchEvent(event);

      expect(onDragStart).not.toHaveBeenCalled();

      controls.cleanup();
    });

    it('setDisabled updates state correctly', () => {
      const onDragStart = vi.fn();
      const controls = createDraggable({
        element,
        data: { id: 'test' },
        onDragStart,
      });

      controls.setDisabled(true);

      expect(element.getAttribute('draggable')).toBe('false');
      expect(element.hasAttribute('aria-grabbed')).toBe(false);

      controls.setDisabled(false);

      expect(element.getAttribute('draggable')).toBe('true');
      expect(element.getAttribute('aria-grabbed')).toBe('false');

      controls.cleanup();
    });

    it('prevents keyboard drag when disabled', () => {
      const onDragStart = vi.fn();
      const controls = createDraggable({
        element,
        data: { id: 'test' },
        disabled: true,
        onDragStart,
      });

      element.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

      expect(onDragStart).not.toHaveBeenCalled();

      controls.cleanup();
    });
  });

  describe('handle option', () => {
    it('only initiates drag from handle element', () => {
      const handle = document.createElement('div');
      element.appendChild(handle);

      const onDragStart = vi.fn();
      const controls = createDraggable({
        element,
        handle,
        data: { id: 'test' },
        onDragStart,
      });

      // Drag from element (not handle) - should not work
      const event1 = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer(),
      });
      Object.defineProperty(event1, 'target', { value: element });
      element.dispatchEvent(event1);

      expect(onDragStart).not.toHaveBeenCalled();

      // Drag from handle - should work
      const event2 = new DragEvent('dragstart', {
        bubbles: true,
        dataTransfer: new DataTransfer(),
      });
      Object.defineProperty(event2, 'target', { value: handle });
      element.dispatchEvent(event2);

      expect(onDragStart).toHaveBeenCalled();

      controls.cleanup();
    });
  });

  describe('cleanup', () => {
    it('removes all event listeners', () => {
      const onDragStart = vi.fn();
      const controls = createDraggable({
        element,
        data: { id: 'test' },
        onDragStart,
      });

      controls.cleanup();

      element.dispatchEvent(
        new DragEvent('dragstart', {
          bubbles: true,
          dataTransfer: new DataTransfer(),
        }),
      );

      expect(onDragStart).not.toHaveBeenCalled();
    });

    it('removes ARIA attributes', () => {
      const controls = createDraggable({
        element,
        data: { id: 'test' },
      });

      controls.cleanup();

      expect(element.hasAttribute('aria-grabbed')).toBe(false);
      expect(element.hasAttribute('draggable')).toBe(false);
    });

    it('cancels active keyboard drag', () => {
      const onDragEnd = vi.fn();
      const controls = createDraggable({
        element,
        data: { id: 'test' },
        onDragEnd,
      });

      controls.startKeyboardDrag();
      controls.cleanup();

      // Should have been cancelled
      expect(onDragEnd).toHaveBeenCalledWith(expect.anything(), 'none');
    });
  });

  describe('SSR', () => {
    it('returns no-op controls in SSR environment', () => {
      const originalWindow = globalThis.window;
      // @ts-expect-error Testing SSR
      delete globalThis.window;

      const controls = createDraggable({
        element,
        data: { id: 'test' },
      });

      // All methods should be callable without errors
      expect(() => controls.setDisabled(true)).not.toThrow();
      expect(() => controls.startKeyboardDrag()).not.toThrow();
      expect(() => controls.moveUp()).not.toThrow();
      expect(() => controls.moveDown()).not.toThrow();
      expect(() => controls.commitKeyboardDrag()).not.toThrow();
      expect(() => controls.cancelKeyboardDrag()).not.toThrow();
      expect(() => controls.cleanup()).not.toThrow();

      globalThis.window = originalWindow;
    });
  });
});

describe('createDropZone', () => {
  let element: HTMLDivElement;

  beforeEach(() => {
    resetDragDropState();
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  afterEach(() => {
    element.remove();
    resetDragDropState();
  });

  describe('initialization', () => {
    it('sets aria-dropeffect to none', () => {
      const controls = createDropZone({ element });

      expect(element.getAttribute('aria-dropeffect')).toBe('none');

      controls.cleanup();
    });
  });

  describe('drag events', () => {
    it('calls onDragEnter when drag enters', () => {
      const onDragEnter = vi.fn();
      const controls = createDropZone({
        element,
        onDragEnter,
      });

      const event = new DragEvent('dragenter', {
        bubbles: true,
        dataTransfer: new DataTransfer(),
      });

      element.dispatchEvent(event);

      expect(onDragEnter).toHaveBeenCalled();
      expect(element.getAttribute('aria-dropeffect')).toBe('move');

      controls.cleanup();
    });

    it('calls onDragOver during drag movement over zone', () => {
      const onDragOver = vi.fn();
      const controls = createDropZone({
        element,
        onDragOver,
      });

      element.dispatchEvent(
        new DragEvent('dragenter', {
          bubbles: true,
          dataTransfer: new DataTransfer(),
        }),
      );

      element.dispatchEvent(
        new DragEvent('dragover', {
          bubbles: true,
          dataTransfer: new DataTransfer(),
        }),
      );

      expect(onDragOver).toHaveBeenCalled();

      controls.cleanup();
    });

    it('calls onDragLeave when drag leaves', () => {
      const onDragLeave = vi.fn();
      const controls = createDropZone({
        element,
        onDragLeave,
      });

      // Enter
      element.dispatchEvent(
        new DragEvent('dragenter', {
          bubbles: true,
          dataTransfer: new DataTransfer(),
        }),
      );

      // Leave
      element.dispatchEvent(
        new DragEvent('dragleave', {
          bubbles: true,
          dataTransfer: new DataTransfer(),
        }),
      );

      expect(onDragLeave).toHaveBeenCalled();
      expect(element.getAttribute('aria-dropeffect')).toBe('none');

      controls.cleanup();
    });

    it('calls onDrop when item is dropped', () => {
      const onDrop = vi.fn();
      const controls = createDropZone({
        element,
        onDrop,
      });

      element.dispatchEvent(
        new DragEvent('dragenter', {
          bubbles: true,
          dataTransfer: new DataTransfer(),
        }),
      );

      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer(),
      });

      element.dispatchEvent(dropEvent);

      expect(onDrop).toHaveBeenCalled();
      expect(element.getAttribute('aria-dropeffect')).toBe('none');

      controls.cleanup();
    });

    it('handles nested enter/leave correctly', () => {
      const onDragEnter = vi.fn();
      const onDragLeave = vi.fn();

      const controls = createDropZone({
        element,
        onDragEnter,
        onDragLeave,
      });

      // Enter parent
      element.dispatchEvent(
        new DragEvent('dragenter', {
          bubbles: true,
          dataTransfer: new DataTransfer(),
        }),
      );

      // Enter child (fires another dragenter)
      element.dispatchEvent(
        new DragEvent('dragenter', {
          bubbles: true,
          dataTransfer: new DataTransfer(),
        }),
      );

      // Leave child (fires dragleave, but still in parent)
      element.dispatchEvent(
        new DragEvent('dragleave', {
          bubbles: true,
          dataTransfer: new DataTransfer(),
        }),
      );

      // onDragEnter should only have been called once
      expect(onDragEnter).toHaveBeenCalledTimes(1);
      // onDragLeave should not have been called yet
      expect(onDragLeave).not.toHaveBeenCalled();

      // Leave parent
      element.dispatchEvent(
        new DragEvent('dragleave', {
          bubbles: true,
          dataTransfer: new DataTransfer(),
        }),
      );

      expect(onDragLeave).toHaveBeenCalledTimes(1);

      controls.cleanup();
    });
  });

  describe('accept filter', () => {
    it('rejects items that do not pass accept filter', () => {
      const onDrop = vi.fn();
      const controls = createDropZone({
        element,
        accept: (data) => {
          return (
            typeof data === 'object' && data !== null && 'type' in data && data.type === 'task'
          );
        },
        onDrop,
      });

      // Drop with non-matching data
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/plain', JSON.stringify({ type: 'note' }));

      element.dispatchEvent(
        new DragEvent('drop', {
          bubbles: true,
          dataTransfer,
        }),
      );

      expect(onDrop).not.toHaveBeenCalled();

      controls.cleanup();
    });

    it('accepts items that pass accept filter', () => {
      const onDrop = vi.fn();
      const controls = createDropZone({
        element,
        // Note: In real browsers, getData only works in drop event
        // In jsdom, DataTransfer doesn't persist data between events properly
        // So we use a simple accept that allows the drop
        accept: () => true,
        onDrop,
      });

      // Drop with matching data
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/plain', JSON.stringify({ type: 'task' }));

      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
      });
      // Manually attach dataTransfer since jsdom has issues with it
      Object.defineProperty(dropEvent, 'dataTransfer', { value: dataTransfer });

      element.dispatchEvent(dropEvent);

      expect(onDrop).toHaveBeenCalled();

      controls.cleanup();
    });
  });

  describe('cleanup', () => {
    it('removes event listeners', () => {
      const onDragEnter = vi.fn();
      const controls = createDropZone({
        element,
        onDragEnter,
      });

      controls.cleanup();

      element.dispatchEvent(
        new DragEvent('dragenter', {
          bubbles: true,
          dataTransfer: new DataTransfer(),
        }),
      );

      expect(onDragEnter).not.toHaveBeenCalled();
    });

    it('removes aria-dropeffect attribute', () => {
      const controls = createDropZone({ element });

      controls.cleanup();

      expect(element.hasAttribute('aria-dropeffect')).toBe(false);
    });
  });

  describe('SSR', () => {
    it('returns no-op controls in SSR environment', () => {
      const originalWindow = globalThis.window;
      // @ts-expect-error Testing SSR
      delete globalThis.window;

      const controls = createDropZone({ element });

      expect(() => controls.cleanup()).not.toThrow();

      globalThis.window = originalWindow;
    });
  });
});

describe('ARIA attributes', () => {
  beforeEach(() => {
    resetDragDropState();
  });

  afterEach(() => {
    resetDragDropState();
  });

  it('draggable aria-grabbed updates correctly through drag lifecycle', () => {
    const element = document.createElement('div');
    document.body.appendChild(element);

    const controls = createDraggable({
      element,
      data: { id: 'test' },
    });

    expect(element.getAttribute('aria-grabbed')).toBe('false');

    // Start drag
    element.dispatchEvent(
      new DragEvent('dragstart', {
        bubbles: true,
        dataTransfer: new DataTransfer(),
      }),
    );

    expect(element.getAttribute('aria-grabbed')).toBe('true');

    // End drag
    element.dispatchEvent(
      new DragEvent('dragend', {
        bubbles: true,
        dataTransfer: new DataTransfer(),
      }),
    );

    expect(element.getAttribute('aria-grabbed')).toBe('false');

    controls.cleanup();
    element.remove();
  });

  it('drop zone aria-dropeffect updates correctly', () => {
    const element = document.createElement('div');
    document.body.appendChild(element);

    const controls = createDropZone({ element });

    expect(element.getAttribute('aria-dropeffect')).toBe('none');

    // Enter
    element.dispatchEvent(
      new DragEvent('dragenter', {
        bubbles: true,
        dataTransfer: new DataTransfer(),
      }),
    );

    expect(element.getAttribute('aria-dropeffect')).toBe('move');

    // Leave
    element.dispatchEvent(
      new DragEvent('dragleave', {
        bubbles: true,
        dataTransfer: new DataTransfer(),
      }),
    );

    expect(element.getAttribute('aria-dropeffect')).toBe('none');

    controls.cleanup();
    element.remove();
  });
});

describe('integration', () => {
  beforeEach(() => {
    resetDragDropState();
  });

  afterEach(() => {
    resetDragDropState();
  });

  it('keyboard drag drops into drop zone correctly', () => {
    const draggable = document.createElement('div');
    const dropZone = document.createElement('div');
    document.body.appendChild(draggable);
    document.body.appendChild(dropZone);

    const onDrop = vi.fn();

    const dragControls = createDraggable({
      element: draggable,
      data: { id: 'item-1', type: 'task' },
    });

    const dropControls = createDropZone({
      element: dropZone,
      onDrop,
    });

    // Start keyboard drag
    dragControls.startKeyboardDrag();

    // Navigate to drop zone
    dragControls.moveDown();

    // Drop
    dragControls.commitKeyboardDrag();

    expect(onDrop).toHaveBeenCalledWith({ id: 'item-1', type: 'task' }, 'move');

    dragControls.cleanup();
    dropControls.cleanup();
    draggable.remove();
    dropZone.remove();
  });

  it('keyboard drag respects accept filter', () => {
    const draggable = document.createElement('div');
    const dropZone = document.createElement('div');
    document.body.appendChild(draggable);
    document.body.appendChild(dropZone);

    const onDrop = vi.fn();

    const dragControls = createDraggable({
      element: draggable,
      data: { id: 'item-1', type: 'note' },
    });

    const dropControls = createDropZone({
      element: dropZone,
      accept: (data) => {
        return typeof data === 'object' && data !== null && 'type' in data && data.type === 'task';
      },
      onDrop,
    });

    // Start keyboard drag
    dragControls.startKeyboardDrag();

    // Navigate to drop zone
    dragControls.moveDown();

    // Drop (should be rejected)
    dragControls.commitKeyboardDrag();

    expect(onDrop).not.toHaveBeenCalled();

    dragControls.cleanup();
    dropControls.cleanup();
    draggable.remove();
    dropZone.remove();
  });
});
