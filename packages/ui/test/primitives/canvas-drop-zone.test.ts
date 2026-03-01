import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCanvasDropZone } from '../../src/primitives/canvas-drop-zone';

// =============================================================================
// Helpers
// =============================================================================

/** Build a container with child blocks at specified Y positions */
function buildContainer(
  blockRects: Array<{ id: string; top: number; height: number }>,
): HTMLDivElement {
  const container = document.createElement('div');

  // Mock container getBoundingClientRect
  vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 400, 800));

  for (const { id, top, height } of blockRects) {
    const block = document.createElement('div');
    block.setAttribute('data-block-id', id);
    vi.spyOn(block, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, top, 400, height));
    container.appendChild(block);
  }

  return container;
}

/**
 * Create a DragEvent with a working DataTransfer.
 * jsdom does not support DataTransfer in constructors reliably,
 * so we attach it manually.
 */
function createDragEvent(
  type: string,
  opts: { clientY?: number; data?: Record<string, string> } = {},
): DragEvent {
  const event = new DragEvent(type, {
    bubbles: true,
    cancelable: true,
  });

  const dataTransfer = new DataTransfer();

  if (opts.data) {
    for (const [mime, value] of Object.entries(opts.data)) {
      dataTransfer.setData(mime, value);
    }
  }

  Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
  Object.defineProperty(event, 'clientY', { value: opts.clientY ?? 0 });

  return event;
}

/** Flush a single requestAnimationFrame by calling pending callbacks */
function flushRAF(): void {
  vi.advanceTimersByTime(16);
}

// =============================================================================
// Tests
// =============================================================================

describe('createCanvasDropZone', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();

    // Stub requestAnimationFrame so rAF callbacks execute synchronously
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      return setTimeout(() => cb(performance.now()), 0);
    });
  });

  afterEach(() => {
    container?.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // Initialization
  // ===========================================================================

  describe('initialization', () => {
    it('sets aria-dropeffect to none on the container', () => {
      container = buildContainer([]);
      document.body.appendChild(container);

      const controls = createCanvasDropZone({ container });

      expect(container.getAttribute('aria-dropeffect')).toBe('none');

      controls.destroy();
    });
  });

  // ===========================================================================
  // Empty canvas
  // ===========================================================================

  describe('empty canvas', () => {
    it('drops at index 0 when container has no blocks', () => {
      container = buildContainer([]);
      document.body.appendChild(container);

      const onDrop = vi.fn();
      const controls = createCanvasDropZone({ container, onDrop });

      // Enter
      container.dispatchEvent(createDragEvent('dragenter'));

      // Drop with data
      container.dispatchEvent(
        createDragEvent('drop', {
          clientY: 100,
          data: { 'application/x-rafters-drag-data': JSON.stringify({ type: 'block', id: 'new' }) },
        }),
      );

      expect(onDrop).toHaveBeenCalledWith({ type: 'block', id: 'new' }, 0);

      controls.destroy();
    });
  });

  // ===========================================================================
  // Position-aware insertion index
  // ===========================================================================

  describe('insertion index calculation', () => {
    it('inserts at index 0 when cursor is above the first block', () => {
      container = buildContainer([
        { id: 'a', top: 100, height: 50 },
        { id: 'b', top: 200, height: 50 },
      ]);
      document.body.appendChild(container);

      const onDrop = vi.fn();
      const controls = createCanvasDropZone({ container, onDrop });

      container.dispatchEvent(createDragEvent('dragenter'));
      container.dispatchEvent(
        createDragEvent('drop', {
          clientY: 80, // above block a (top=100)
          data: { 'text/plain': JSON.stringify({ id: 'new' }) },
        }),
      );

      expect(onDrop).toHaveBeenCalledWith({ id: 'new' }, 0);

      controls.destroy();
    });

    it('inserts between blocks when cursor is at the midpoint gap', () => {
      container = buildContainer([
        { id: 'a', top: 100, height: 50 }, // midpoint = 125
        { id: 'b', top: 200, height: 50 }, // midpoint = 225
      ]);
      document.body.appendChild(container);

      const onDrop = vi.fn();
      const controls = createCanvasDropZone({ container, onDrop });

      container.dispatchEvent(createDragEvent('dragenter'));
      container.dispatchEvent(
        createDragEvent('drop', {
          clientY: 160, // above midpoint of b (225), below midpoint of a (125) -> index 1
          data: { 'text/plain': JSON.stringify({ id: 'new' }) },
        }),
      );

      expect(onDrop).toHaveBeenCalledWith({ id: 'new' }, 1);

      controls.destroy();
    });

    it('inserts after last block when cursor is below all blocks', () => {
      container = buildContainer([
        { id: 'a', top: 100, height: 50 },
        { id: 'b', top: 200, height: 50 },
      ]);
      document.body.appendChild(container);

      const onDrop = vi.fn();
      const controls = createCanvasDropZone({ container, onDrop });

      container.dispatchEvent(createDragEvent('dragenter'));
      container.dispatchEvent(
        createDragEvent('drop', {
          clientY: 400, // well below all blocks
          data: { 'text/plain': JSON.stringify({ id: 'new' }) },
        }),
      );

      expect(onDrop).toHaveBeenCalledWith({ id: 'new' }, 2);

      controls.destroy();
    });

    it('inserts at correct index among three blocks', () => {
      container = buildContainer([
        { id: 'a', top: 100, height: 40 }, // midpoint = 120
        { id: 'b', top: 160, height: 40 }, // midpoint = 180
        { id: 'c', top: 220, height: 40 }, // midpoint = 240
      ]);
      document.body.appendChild(container);

      const onDrop = vi.fn();
      const controls = createCanvasDropZone({ container, onDrop });

      // Drop between b and c (clientY = 200, above c midpoint 240, below b midpoint 180)
      container.dispatchEvent(createDragEvent('dragenter'));
      container.dispatchEvent(
        createDragEvent('drop', {
          clientY: 200,
          data: { 'text/plain': JSON.stringify({ id: 'new' }) },
        }),
      );

      expect(onDrop).toHaveBeenCalledWith({ id: 'new' }, 2);

      controls.destroy();
    });
  });

  // ===========================================================================
  // Insertion indicator callbacks
  // ===========================================================================

  describe('insertion indicator', () => {
    it('calls onInsertIndicatorChange during dragover', () => {
      container = buildContainer([
        { id: 'a', top: 100, height: 50 },
        { id: 'b', top: 200, height: 50 },
      ]);
      document.body.appendChild(container);

      const onInsertIndicatorChange = vi.fn();
      const controls = createCanvasDropZone({ container, onInsertIndicatorChange });

      container.dispatchEvent(createDragEvent('dragenter'));
      container.dispatchEvent(createDragEvent('dragover', { clientY: 80 }));
      flushRAF();

      expect(onInsertIndicatorChange).toHaveBeenCalledWith(0, expect.any(DOMRect));

      controls.destroy();
    });

    it('updates indicator when cursor moves to a different gap', () => {
      container = buildContainer([
        { id: 'a', top: 100, height: 50 }, // midpoint = 125
        { id: 'b', top: 200, height: 50 }, // midpoint = 225
      ]);
      document.body.appendChild(container);

      const onInsertIndicatorChange = vi.fn();
      const controls = createCanvasDropZone({ container, onInsertIndicatorChange });

      container.dispatchEvent(createDragEvent('dragenter'));

      // First: above first block
      container.dispatchEvent(createDragEvent('dragover', { clientY: 80 }));
      flushRAF();

      expect(onInsertIndicatorChange).toHaveBeenLastCalledWith(0, expect.any(DOMRect));

      // Move: between blocks
      container.dispatchEvent(createDragEvent('dragover', { clientY: 160 }));
      flushRAF();

      expect(onInsertIndicatorChange).toHaveBeenLastCalledWith(1, expect.any(DOMRect));

      // Move: after last block
      container.dispatchEvent(createDragEvent('dragover', { clientY: 400 }));
      flushRAF();

      expect(onInsertIndicatorChange).toHaveBeenLastCalledWith(2, expect.any(DOMRect));

      controls.destroy();
    });

    it('does not re-fire callback when insert index has not changed', () => {
      container = buildContainer([{ id: 'a', top: 100, height: 50 }]);
      document.body.appendChild(container);

      const onInsertIndicatorChange = vi.fn();
      const controls = createCanvasDropZone({ container, onInsertIndicatorChange });

      container.dispatchEvent(createDragEvent('dragenter'));

      // Two dragover events at the same logical position
      container.dispatchEvent(createDragEvent('dragover', { clientY: 80 }));
      flushRAF();

      container.dispatchEvent(createDragEvent('dragover', { clientY: 85 }));
      flushRAF();

      // Both are above block a (midpoint 125), so index 0 both times
      // Should only fire once since index didn't change
      expect(onInsertIndicatorChange).toHaveBeenCalledTimes(1);

      controls.destroy();
    });

    it('clears indicator with (null, null) on drag leave', () => {
      container = buildContainer([{ id: 'a', top: 100, height: 50 }]);
      document.body.appendChild(container);

      const onInsertIndicatorChange = vi.fn();
      const controls = createCanvasDropZone({ container, onInsertIndicatorChange });

      container.dispatchEvent(createDragEvent('dragenter'));
      container.dispatchEvent(createDragEvent('dragover', { clientY: 80 }));
      flushRAF();

      container.dispatchEvent(createDragEvent('dragleave'));

      expect(onInsertIndicatorChange).toHaveBeenLastCalledWith(null, null);

      controls.destroy();
    });

    it('clears indicator after drop', () => {
      container = buildContainer([{ id: 'a', top: 100, height: 50 }]);
      document.body.appendChild(container);

      const onInsertIndicatorChange = vi.fn();
      const controls = createCanvasDropZone({
        container,
        onInsertIndicatorChange,
        onDrop: () => {},
      });

      container.dispatchEvent(createDragEvent('dragenter'));
      container.dispatchEvent(createDragEvent('dragover', { clientY: 80 }));
      flushRAF();

      container.dispatchEvent(
        createDragEvent('drop', {
          clientY: 80,
          data: { 'text/plain': JSON.stringify({ id: 'x' }) },
        }),
      );

      expect(onInsertIndicatorChange).toHaveBeenLastCalledWith(null, null);

      controls.destroy();
    });
  });

  // ===========================================================================
  // Accept predicate
  // ===========================================================================

  describe('accept predicate', () => {
    it('does not call onDrop when accept returns false', () => {
      container = buildContainer([]);
      document.body.appendChild(container);

      const onDrop = vi.fn();
      const controls = createCanvasDropZone({
        container,
        accept: (data) =>
          typeof data === 'object' &&
          data !== null &&
          'type' in data &&
          (data as Record<string, unknown>).type === 'block',
        onDrop,
      });

      container.dispatchEvent(createDragEvent('dragenter'));
      container.dispatchEvent(
        createDragEvent('drop', {
          clientY: 0,
          data: { 'text/plain': JSON.stringify({ type: 'image' }) },
        }),
      );

      expect(onDrop).not.toHaveBeenCalled();

      controls.destroy();
    });

    it('calls onDrop when accept returns true', () => {
      container = buildContainer([]);
      document.body.appendChild(container);

      const onDrop = vi.fn();
      const controls = createCanvasDropZone({
        container,
        accept: () => true,
        onDrop,
      });

      container.dispatchEvent(createDragEvent('dragenter'));
      container.dispatchEvent(
        createDragEvent('drop', {
          clientY: 0,
          data: { 'text/plain': JSON.stringify({ type: 'block' }) },
        }),
      );

      expect(onDrop).toHaveBeenCalled();

      controls.destroy();
    });
  });

  // ===========================================================================
  // ARIA attributes
  // ===========================================================================

  describe('ARIA', () => {
    it('sets aria-dropeffect to copy during active drag', () => {
      container = buildContainer([]);
      document.body.appendChild(container);

      const controls = createCanvasDropZone({ container });

      expect(container.getAttribute('aria-dropeffect')).toBe('none');

      container.dispatchEvent(createDragEvent('dragenter'));

      expect(container.getAttribute('aria-dropeffect')).toBe('copy');

      controls.destroy();
    });

    it('resets aria-dropeffect to none on drag leave', () => {
      container = buildContainer([]);
      document.body.appendChild(container);

      const controls = createCanvasDropZone({ container });

      container.dispatchEvent(createDragEvent('dragenter'));
      expect(container.getAttribute('aria-dropeffect')).toBe('copy');

      container.dispatchEvent(createDragEvent('dragleave'));
      expect(container.getAttribute('aria-dropeffect')).toBe('none');

      controls.destroy();
    });

    it('resets aria-dropeffect to none after drop', () => {
      container = buildContainer([]);
      document.body.appendChild(container);

      const controls = createCanvasDropZone({ container });

      container.dispatchEvent(createDragEvent('dragenter'));
      container.dispatchEvent(
        createDragEvent('drop', {
          data: { 'text/plain': JSON.stringify({}) },
        }),
      );

      expect(container.getAttribute('aria-dropeffect')).toBe('none');

      controls.destroy();
    });
  });

  // ===========================================================================
  // onDragActiveChange
  // ===========================================================================

  describe('onDragActiveChange', () => {
    it('fires true on drag enter and false on drag leave', () => {
      container = buildContainer([]);
      document.body.appendChild(container);

      const onDragActiveChange = vi.fn();
      const controls = createCanvasDropZone({ container, onDragActiveChange });

      container.dispatchEvent(createDragEvent('dragenter'));
      expect(onDragActiveChange).toHaveBeenCalledWith(true);

      container.dispatchEvent(createDragEvent('dragleave'));
      expect(onDragActiveChange).toHaveBeenCalledWith(false);

      controls.destroy();
    });

    it('fires false after drop', () => {
      container = buildContainer([]);
      document.body.appendChild(container);

      const onDragActiveChange = vi.fn();
      const controls = createCanvasDropZone({ container, onDragActiveChange });

      container.dispatchEvent(createDragEvent('dragenter'));
      container.dispatchEvent(
        createDragEvent('drop', {
          data: { 'text/plain': JSON.stringify({}) },
        }),
      );

      expect(onDragActiveChange).toHaveBeenLastCalledWith(false);

      controls.destroy();
    });
  });

  // ===========================================================================
  // Nested element enter/leave counting
  // ===========================================================================

  describe('nested element handling', () => {
    it('does not fire leave while still inside nested elements', () => {
      container = buildContainer([{ id: 'a', top: 100, height: 50 }]);
      document.body.appendChild(container);

      const onDragActiveChange = vi.fn();
      const controls = createCanvasDropZone({ container, onDragActiveChange });

      // Enter container
      container.dispatchEvent(createDragEvent('dragenter'));
      expect(onDragActiveChange).toHaveBeenCalledTimes(1);
      expect(onDragActiveChange).toHaveBeenCalledWith(true);

      // Enter child (fires another dragenter)
      container.dispatchEvent(createDragEvent('dragenter'));

      // Leave child (fires dragleave, but still in container)
      container.dispatchEvent(createDragEvent('dragleave'));

      // Should NOT have fired false yet
      expect(onDragActiveChange).toHaveBeenCalledTimes(1);

      // Leave container (final leave)
      container.dispatchEvent(createDragEvent('dragleave'));

      expect(onDragActiveChange).toHaveBeenCalledTimes(2);
      expect(onDragActiveChange).toHaveBeenLastCalledWith(false);

      controls.destroy();
    });
  });

  // ===========================================================================
  // recalculate()
  // ===========================================================================

  describe('recalculate', () => {
    it('refreshes cached block positions after DOM mutation', () => {
      container = buildContainer([
        { id: 'a', top: 100, height: 50 }, // midpoint = 125
      ]);
      document.body.appendChild(container);

      const onDrop = vi.fn();
      const controls = createCanvasDropZone({ container, onDrop });

      // Enter to cache initial positions
      container.dispatchEvent(createDragEvent('dragenter'));

      // Simulate DOM mutation: add a new block above the existing one
      const newBlock = document.createElement('div');
      newBlock.setAttribute('data-block-id', 'z');
      vi.spyOn(newBlock, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 50, 400, 40));
      container.insertBefore(newBlock, container.firstChild);

      // Recalculate
      controls.recalculate();

      // Leave and re-enter to ensure we use fresh positions
      container.dispatchEvent(createDragEvent('dragleave'));
      container.dispatchEvent(createDragEvent('dragenter'));

      // Drop above block z (which is now at top=50, midpoint=70)
      container.dispatchEvent(
        createDragEvent('drop', {
          clientY: 40, // above z midpoint
          data: { 'text/plain': JSON.stringify({ id: 'new' }) },
        }),
      );

      expect(onDrop).toHaveBeenCalledWith({ id: 'new' }, 0);

      controls.destroy();
    });
  });

  // ===========================================================================
  // Data parsing
  // ===========================================================================

  describe('data parsing', () => {
    it('reads from application/x-rafters-drag-data MIME type', () => {
      container = buildContainer([]);
      document.body.appendChild(container);

      const onDrop = vi.fn();
      const controls = createCanvasDropZone({ container, onDrop });

      container.dispatchEvent(createDragEvent('dragenter'));
      container.dispatchEvent(
        createDragEvent('drop', {
          data: {
            'application/x-rafters-drag-data': JSON.stringify({ source: 'rafters' }),
          },
        }),
      );

      expect(onDrop).toHaveBeenCalledWith({ source: 'rafters' }, 0);

      controls.destroy();
    });

    it('falls back to text/plain when custom MIME is absent', () => {
      container = buildContainer([]);
      document.body.appendChild(container);

      const onDrop = vi.fn();
      const controls = createCanvasDropZone({ container, onDrop });

      container.dispatchEvent(createDragEvent('dragenter'));
      container.dispatchEvent(
        createDragEvent('drop', {
          data: { 'text/plain': JSON.stringify({ source: 'external' }) },
        }),
      );

      expect(onDrop).toHaveBeenCalledWith({ source: 'external' }, 0);

      controls.destroy();
    });

    it('passes raw string if JSON parsing fails', () => {
      container = buildContainer([]);
      document.body.appendChild(container);

      const onDrop = vi.fn();
      const controls = createCanvasDropZone({ container, onDrop });

      container.dispatchEvent(createDragEvent('dragenter'));
      container.dispatchEvent(
        createDragEvent('drop', {
          data: { 'text/plain': 'not-json' },
        }),
      );

      expect(onDrop).toHaveBeenCalledWith('not-json', 0);

      controls.destroy();
    });

    it('passes null when no data is available', () => {
      container = buildContainer([]);
      document.body.appendChild(container);

      const onDrop = vi.fn();
      const controls = createCanvasDropZone({ container, onDrop });

      container.dispatchEvent(createDragEvent('dragenter'));
      container.dispatchEvent(createDragEvent('drop'));

      expect(onDrop).toHaveBeenCalledWith(null, 0);

      controls.destroy();
    });
  });

  // ===========================================================================
  // rAF throttling
  // ===========================================================================

  describe('rAF throttling', () => {
    it('coalesces multiple dragover events into one calculation', () => {
      container = buildContainer([
        { id: 'a', top: 100, height: 50 }, // midpoint = 125
        { id: 'b', top: 200, height: 50 }, // midpoint = 225
      ]);
      document.body.appendChild(container);

      const onInsertIndicatorChange = vi.fn();
      const controls = createCanvasDropZone({ container, onInsertIndicatorChange });

      container.dispatchEvent(createDragEvent('dragenter'));

      // Fire multiple dragover events before rAF fires
      container.dispatchEvent(createDragEvent('dragover', { clientY: 80 }));
      container.dispatchEvent(createDragEvent('dragover', { clientY: 160 }));
      container.dispatchEvent(createDragEvent('dragover', { clientY: 300 }));

      // No callbacks yet (rAF hasn't fired)
      expect(onInsertIndicatorChange).not.toHaveBeenCalled();

      // Flush rAF
      flushRAF();

      // Only one callback, using the latest clientY (300 -> after last block -> index 2)
      expect(onInsertIndicatorChange).toHaveBeenCalledTimes(1);
      expect(onInsertIndicatorChange).toHaveBeenCalledWith(2, expect.any(DOMRect));

      controls.destroy();
    });
  });

  // ===========================================================================
  // Cleanup / destroy
  // ===========================================================================

  describe('destroy', () => {
    it('removes all event listeners', () => {
      container = buildContainer([]);
      document.body.appendChild(container);

      const onDrop = vi.fn();
      const onDragActiveChange = vi.fn();
      const controls = createCanvasDropZone({
        container,
        onDrop,
        onDragActiveChange,
      });

      controls.destroy();

      container.dispatchEvent(createDragEvent('dragenter'));
      container.dispatchEvent(
        createDragEvent('drop', {
          data: { 'text/plain': JSON.stringify({ id: 'x' }) },
        }),
      );

      expect(onDrop).not.toHaveBeenCalled();
      expect(onDragActiveChange).not.toHaveBeenCalled();
    });

    it('removes aria-dropeffect attribute', () => {
      container = buildContainer([]);
      document.body.appendChild(container);

      const controls = createCanvasDropZone({ container });

      controls.destroy();

      expect(container.hasAttribute('aria-dropeffect')).toBe(false);
    });
  });

  // ===========================================================================
  // SSR
  // ===========================================================================

  describe('SSR', () => {
    it('returns no-op controls in SSR environment', () => {
      const originalWindow = globalThis.window;
      // @ts-expect-error Testing SSR
      delete globalThis.window;

      container = document.createElement('div');

      const controls = createCanvasDropZone({ container });

      expect(() => controls.recalculate()).not.toThrow();
      expect(() => controls.destroy()).not.toThrow();

      globalThis.window = originalWindow;
    });
  });

  // ===========================================================================
  // Indicator rect values
  // ===========================================================================

  describe('indicator rect', () => {
    it('provides a rect at the top of the first block for index 0', () => {
      container = buildContainer([
        { id: 'a', top: 100, height: 50 },
        { id: 'b', top: 200, height: 50 },
      ]);
      document.body.appendChild(container);

      const onInsertIndicatorChange = vi.fn();
      const controls = createCanvasDropZone({ container, onInsertIndicatorChange });

      container.dispatchEvent(createDragEvent('dragenter'));
      container.dispatchEvent(createDragEvent('dragover', { clientY: 80 }));
      flushRAF();

      const rect = onInsertIndicatorChange.mock.calls[0]?.[1] as DOMRect;
      expect(rect).toBeDefined();
      // Should be at top of first block
      expect(rect.y).toBe(100);
      // Full container width
      expect(rect.width).toBe(400);

      controls.destroy();
    });

    it('provides a rect at the bottom of the last block for final index', () => {
      container = buildContainer([
        { id: 'a', top: 100, height: 50 },
        { id: 'b', top: 200, height: 50 },
      ]);
      document.body.appendChild(container);

      const onInsertIndicatorChange = vi.fn();
      const controls = createCanvasDropZone({ container, onInsertIndicatorChange });

      container.dispatchEvent(createDragEvent('dragenter'));
      container.dispatchEvent(createDragEvent('dragover', { clientY: 400 }));
      flushRAF();

      const rect = onInsertIndicatorChange.mock.calls[0]?.[1] as DOMRect;
      expect(rect).toBeDefined();
      // Should be at bottom of last block (200 + 50 = 250)
      expect(rect.y).toBe(250);

      controls.destroy();
    });

    it('provides a rect between two blocks for middle index', () => {
      container = buildContainer([
        { id: 'a', top: 100, height: 50 }, // bottom = 150
        { id: 'b', top: 200, height: 50 }, // top = 200
      ]);
      document.body.appendChild(container);

      const onInsertIndicatorChange = vi.fn();
      const controls = createCanvasDropZone({ container, onInsertIndicatorChange });

      container.dispatchEvent(createDragEvent('dragenter'));
      container.dispatchEvent(createDragEvent('dragover', { clientY: 160 }));
      flushRAF();

      const rect = onInsertIndicatorChange.mock.calls[0]?.[1] as DOMRect;
      expect(rect).toBeDefined();
      // Should be midpoint between blocks: (150 + 200) / 2 = 175
      expect(rect.y).toBe(175);

      controls.destroy();
    });
  });
});
