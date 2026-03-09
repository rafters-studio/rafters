import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRuleDropZone } from '../../src/primitives/rule-drop-zone';

// =============================================================================
// Helpers
// =============================================================================

/** Build a canvas with block children at specified bounding rects */
function buildCanvas(
  blocks: Array<{
    id: string;
    type: string;
    left: number;
    top: number;
    width: number;
    height: number;
  }>,
): { canvas: HTMLDivElement; blockMap: Map<string, HTMLElement> } {
  const canvas = document.createElement('div');
  const blockMap = new Map<string, HTMLElement>();

  for (const { id, type, left, top, width, height } of blocks) {
    const block = document.createElement('div');
    block.setAttribute('data-block-id', id);
    block.setAttribute('data-block-type', type);
    vi.spyOn(block, 'getBoundingClientRect').mockReturnValue(new DOMRect(left, top, width, height));
    canvas.appendChild(block);
    blockMap.set(id, block);
  }

  return { canvas, blockMap };
}

/**
 * Create a DragEvent with a working DataTransfer.
 * jsdom does not support DataTransfer in constructors reliably,
 * so we attach it manually.
 */
function createDragEvent(
  type: string,
  opts: {
    clientX?: number;
    clientY?: number;
    data?: Record<string, string>;
    types?: string[];
  } = {},
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
  Object.defineProperty(event, 'clientX', { value: opts.clientX ?? 0 });
  Object.defineProperty(event, 'clientY', { value: opts.clientY ?? 0 });

  return event;
}

/** Rule drag data in the format produced by rule-palette */
function ruleData(ruleId: string): Record<string, string> {
  const json = JSON.stringify({ id: ruleId, label: `Rule ${ruleId}`, category: 'Test' });
  return {
    'application/x-rafters-rule': json,
    'application/x-rafters-drag-data': json,
    'text/plain': `Rule ${ruleId}`,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('createRuleDropZone', () => {
  let canvas: HTMLDivElement;
  let blockMap: Map<string, HTMLElement>;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    canvas?.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // Drop on compatible block
  // ===========================================================================

  describe('drop on compatible block', () => {
    it('calls onRuleDrop with blockId and ruleId', () => {
      const result = buildCanvas([
        { id: 'block-1', type: 'text', left: 0, top: 0, width: 400, height: 100 },
        { id: 'block-2', type: 'heading', left: 0, top: 120, width: 400, height: 60 },
      ]);
      canvas = result.canvas;
      blockMap = result.blockMap;
      document.body.appendChild(canvas);

      const onRuleDrop = vi.fn();
      const onRuleReject = vi.fn();

      const controls = createRuleDropZone({
        canvasElement: canvas,
        getBlockElements: () => blockMap,
        onRuleDrop,
        onRuleReject,
        isCompatible: () => true,
      });

      canvas.dispatchEvent(createDragEvent('dragenter', { data: ruleData('required') }));
      canvas.dispatchEvent(
        createDragEvent('drop', {
          clientX: 200,
          clientY: 50,
          data: ruleData('required'),
        }),
      );

      expect(onRuleDrop).toHaveBeenCalledWith('block-1', 'required');
      expect(onRuleReject).not.toHaveBeenCalled();

      controls.destroy();
    });

    it('targets the correct block based on cursor position', () => {
      const result = buildCanvas([
        { id: 'block-1', type: 'text', left: 0, top: 0, width: 400, height: 100 },
        { id: 'block-2', type: 'heading', left: 0, top: 120, width: 400, height: 60 },
      ]);
      canvas = result.canvas;
      blockMap = result.blockMap;
      document.body.appendChild(canvas);

      const onRuleDrop = vi.fn();

      const controls = createRuleDropZone({
        canvasElement: canvas,
        getBlockElements: () => blockMap,
        onRuleDrop,
        onRuleReject: vi.fn(),
        isCompatible: () => true,
      });

      canvas.dispatchEvent(createDragEvent('dragenter', { data: ruleData('min-length') }));
      canvas.dispatchEvent(
        createDragEvent('drop', {
          clientX: 200,
          clientY: 140, // inside block-2 (top=120, height=60)
          data: ruleData('min-length'),
        }),
      );

      expect(onRuleDrop).toHaveBeenCalledWith('block-2', 'min-length');

      controls.destroy();
    });
  });

  // ===========================================================================
  // Drop on incompatible block
  // ===========================================================================

  describe('drop on incompatible block', () => {
    it('calls onRuleReject and does not call onRuleDrop', () => {
      const result = buildCanvas([
        { id: 'block-1', type: 'image', left: 0, top: 0, width: 400, height: 200 },
      ]);
      canvas = result.canvas;
      blockMap = result.blockMap;
      document.body.appendChild(canvas);

      const onRuleDrop = vi.fn();
      const onRuleReject = vi.fn();

      const controls = createRuleDropZone({
        canvasElement: canvas,
        getBlockElements: () => blockMap,
        onRuleDrop,
        onRuleReject,
        isCompatible: (blockType, _ruleId) => blockType !== 'image',
      });

      canvas.dispatchEvent(createDragEvent('dragenter', { data: ruleData('email') }));
      canvas.dispatchEvent(
        createDragEvent('drop', {
          clientX: 200,
          clientY: 100,
          data: ruleData('email'),
        }),
      );

      expect(onRuleReject).toHaveBeenCalledWith('email');
      expect(onRuleDrop).not.toHaveBeenCalled();

      controls.destroy();
    });

    it('passes blockType and ruleId to isCompatible', () => {
      const result = buildCanvas([
        { id: 'block-1', type: 'input', left: 0, top: 0, width: 400, height: 50 },
      ]);
      canvas = result.canvas;
      blockMap = result.blockMap;
      document.body.appendChild(canvas);

      const isCompatible = vi.fn().mockReturnValue(true);

      const controls = createRuleDropZone({
        canvasElement: canvas,
        getBlockElements: () => blockMap,
        onRuleDrop: vi.fn(),
        onRuleReject: vi.fn(),
        isCompatible,
      });

      canvas.dispatchEvent(createDragEvent('dragenter', { data: ruleData('max-length') }));
      canvas.dispatchEvent(
        createDragEvent('drop', {
          clientX: 200,
          clientY: 25,
          data: ruleData('max-length'),
        }),
      );

      expect(isCompatible).toHaveBeenCalledWith('input', 'max-length');

      controls.destroy();
    });
  });

  // ===========================================================================
  // Drop on empty canvas
  // ===========================================================================

  describe('drop on empty canvas area', () => {
    it('is a no-op when cursor is not over any block', () => {
      const result = buildCanvas([
        { id: 'block-1', type: 'text', left: 0, top: 0, width: 400, height: 100 },
      ]);
      canvas = result.canvas;
      blockMap = result.blockMap;
      document.body.appendChild(canvas);

      const onRuleDrop = vi.fn();
      const onRuleReject = vi.fn();

      const controls = createRuleDropZone({
        canvasElement: canvas,
        getBlockElements: () => blockMap,
        onRuleDrop,
        onRuleReject,
        isCompatible: () => true,
      });

      canvas.dispatchEvent(createDragEvent('dragenter', { data: ruleData('required') }));
      canvas.dispatchEvent(
        createDragEvent('drop', {
          clientX: 200,
          clientY: 500, // well below block-1 (top=0, height=100)
          data: ruleData('required'),
        }),
      );

      expect(onRuleDrop).not.toHaveBeenCalled();
      expect(onRuleReject).not.toHaveBeenCalled();

      controls.destroy();
    });

    it('is a no-op when canvas has no blocks', () => {
      const result = buildCanvas([]);
      canvas = result.canvas;
      blockMap = result.blockMap;
      document.body.appendChild(canvas);

      const onRuleDrop = vi.fn();
      const onRuleReject = vi.fn();

      const controls = createRuleDropZone({
        canvasElement: canvas,
        getBlockElements: () => blockMap,
        onRuleDrop,
        onRuleReject,
        isCompatible: () => true,
      });

      canvas.dispatchEvent(createDragEvent('dragenter', { data: ruleData('required') }));
      canvas.dispatchEvent(
        createDragEvent('drop', {
          clientX: 200,
          clientY: 100,
          data: ruleData('required'),
        }),
      );

      expect(onRuleDrop).not.toHaveBeenCalled();
      expect(onRuleReject).not.toHaveBeenCalled();

      controls.destroy();
    });
  });

  // ===========================================================================
  // Block highlight (data attribute)
  // ===========================================================================

  describe('block highlight', () => {
    it('adds data-rule-drop-target on dragover when cursor is over a block', () => {
      const result = buildCanvas([
        { id: 'block-1', type: 'text', left: 0, top: 0, width: 400, height: 100 },
      ]);
      canvas = result.canvas;
      blockMap = result.blockMap;
      document.body.appendChild(canvas);

      const controls = createRuleDropZone({
        canvasElement: canvas,
        getBlockElements: () => blockMap,
        onRuleDrop: vi.fn(),
        onRuleReject: vi.fn(),
        isCompatible: () => true,
      });

      const block = blockMap.get('block-1');

      canvas.dispatchEvent(createDragEvent('dragenter', { data: ruleData('required') }));
      canvas.dispatchEvent(
        createDragEvent('dragover', {
          clientX: 200,
          clientY: 50,
          data: ruleData('required'),
        }),
      );

      expect(block?.hasAttribute('data-rule-drop-target')).toBe(true);

      controls.destroy();
    });

    it('removes data-rule-drop-target when cursor leaves block area', () => {
      const result = buildCanvas([
        { id: 'block-1', type: 'text', left: 0, top: 0, width: 400, height: 100 },
      ]);
      canvas = result.canvas;
      blockMap = result.blockMap;
      document.body.appendChild(canvas);

      const controls = createRuleDropZone({
        canvasElement: canvas,
        getBlockElements: () => blockMap,
        onRuleDrop: vi.fn(),
        onRuleReject: vi.fn(),
        isCompatible: () => true,
      });

      const block = blockMap.get('block-1');

      // Hover over block
      canvas.dispatchEvent(createDragEvent('dragenter', { data: ruleData('required') }));
      canvas.dispatchEvent(
        createDragEvent('dragover', {
          clientX: 200,
          clientY: 50,
          data: ruleData('required'),
        }),
      );

      expect(block?.hasAttribute('data-rule-drop-target')).toBe(true);

      // Move cursor to empty area (no block hit)
      canvas.dispatchEvent(
        createDragEvent('dragover', {
          clientX: 200,
          clientY: 500,
          data: ruleData('required'),
        }),
      );

      expect(block?.hasAttribute('data-rule-drop-target')).toBe(false);

      controls.destroy();
    });

    it('moves highlight from one block to another', () => {
      const result = buildCanvas([
        { id: 'block-1', type: 'text', left: 0, top: 0, width: 400, height: 100 },
        { id: 'block-2', type: 'heading', left: 0, top: 120, width: 400, height: 60 },
      ]);
      canvas = result.canvas;
      blockMap = result.blockMap;
      document.body.appendChild(canvas);

      const controls = createRuleDropZone({
        canvasElement: canvas,
        getBlockElements: () => blockMap,
        onRuleDrop: vi.fn(),
        onRuleReject: vi.fn(),
        isCompatible: () => true,
      });

      const block1 = blockMap.get('block-1');
      const block2 = blockMap.get('block-2');

      canvas.dispatchEvent(createDragEvent('dragenter', { data: ruleData('required') }));

      // Hover over block-1
      canvas.dispatchEvent(
        createDragEvent('dragover', {
          clientX: 200,
          clientY: 50,
          data: ruleData('required'),
        }),
      );

      expect(block1?.hasAttribute('data-rule-drop-target')).toBe(true);
      expect(block2?.hasAttribute('data-rule-drop-target')).toBe(false);

      // Move to block-2
      canvas.dispatchEvent(
        createDragEvent('dragover', {
          clientX: 200,
          clientY: 140,
          data: ruleData('required'),
        }),
      );

      expect(block1?.hasAttribute('data-rule-drop-target')).toBe(false);
      expect(block2?.hasAttribute('data-rule-drop-target')).toBe(true);

      controls.destroy();
    });

    it('clears highlight on drag leave', () => {
      const result = buildCanvas([
        { id: 'block-1', type: 'text', left: 0, top: 0, width: 400, height: 100 },
      ]);
      canvas = result.canvas;
      blockMap = result.blockMap;
      document.body.appendChild(canvas);

      const controls = createRuleDropZone({
        canvasElement: canvas,
        getBlockElements: () => blockMap,
        onRuleDrop: vi.fn(),
        onRuleReject: vi.fn(),
        isCompatible: () => true,
      });

      const block = blockMap.get('block-1');

      canvas.dispatchEvent(createDragEvent('dragenter', { data: ruleData('required') }));
      canvas.dispatchEvent(
        createDragEvent('dragover', {
          clientX: 200,
          clientY: 50,
          data: ruleData('required'),
        }),
      );

      expect(block?.hasAttribute('data-rule-drop-target')).toBe(true);

      canvas.dispatchEvent(createDragEvent('dragleave'));

      expect(block?.hasAttribute('data-rule-drop-target')).toBe(false);

      controls.destroy();
    });

    it('clears highlight after drop', () => {
      const result = buildCanvas([
        { id: 'block-1', type: 'text', left: 0, top: 0, width: 400, height: 100 },
      ]);
      canvas = result.canvas;
      blockMap = result.blockMap;
      document.body.appendChild(canvas);

      const controls = createRuleDropZone({
        canvasElement: canvas,
        getBlockElements: () => blockMap,
        onRuleDrop: vi.fn(),
        onRuleReject: vi.fn(),
        isCompatible: () => true,
      });

      const block = blockMap.get('block-1');

      canvas.dispatchEvent(createDragEvent('dragenter', { data: ruleData('required') }));
      canvas.dispatchEvent(
        createDragEvent('dragover', {
          clientX: 200,
          clientY: 50,
          data: ruleData('required'),
        }),
      );

      expect(block?.hasAttribute('data-rule-drop-target')).toBe(true);

      canvas.dispatchEvent(
        createDragEvent('drop', {
          clientX: 200,
          clientY: 50,
          data: ruleData('required'),
        }),
      );

      expect(block?.hasAttribute('data-rule-drop-target')).toBe(false);

      controls.destroy();
    });
  });

  // ===========================================================================
  // Cleanup / destroy
  // ===========================================================================

  describe('destroy', () => {
    it('removes all event listeners', () => {
      const result = buildCanvas([
        { id: 'block-1', type: 'text', left: 0, top: 0, width: 400, height: 100 },
      ]);
      canvas = result.canvas;
      blockMap = result.blockMap;
      document.body.appendChild(canvas);

      const onRuleDrop = vi.fn();
      const onRuleReject = vi.fn();

      const controls = createRuleDropZone({
        canvasElement: canvas,
        getBlockElements: () => blockMap,
        onRuleDrop,
        onRuleReject,
        isCompatible: () => true,
      });

      controls.destroy();

      // Events after destroy should not trigger callbacks
      canvas.dispatchEvent(createDragEvent('dragenter', { data: ruleData('required') }));
      canvas.dispatchEvent(
        createDragEvent('drop', {
          clientX: 200,
          clientY: 50,
          data: ruleData('required'),
        }),
      );

      expect(onRuleDrop).not.toHaveBeenCalled();
      expect(onRuleReject).not.toHaveBeenCalled();
    });

    it('clears any active highlight', () => {
      const result = buildCanvas([
        { id: 'block-1', type: 'text', left: 0, top: 0, width: 400, height: 100 },
      ]);
      canvas = result.canvas;
      blockMap = result.blockMap;
      document.body.appendChild(canvas);

      const controls = createRuleDropZone({
        canvasElement: canvas,
        getBlockElements: () => blockMap,
        onRuleDrop: vi.fn(),
        onRuleReject: vi.fn(),
        isCompatible: () => true,
      });

      const block = blockMap.get('block-1');

      // Set up a highlight
      canvas.dispatchEvent(createDragEvent('dragenter', { data: ruleData('required') }));
      canvas.dispatchEvent(
        createDragEvent('dragover', {
          clientX: 200,
          clientY: 50,
          data: ruleData('required'),
        }),
      );

      expect(block?.hasAttribute('data-rule-drop-target')).toBe(true);

      controls.destroy();

      expect(block?.hasAttribute('data-rule-drop-target')).toBe(false);
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

      canvas = document.createElement('div');

      const controls = createRuleDropZone({
        canvasElement: canvas,
        getBlockElements: () => new Map(),
        onRuleDrop: vi.fn(),
        onRuleReject: vi.fn(),
        isCompatible: () => true,
      });

      expect(() => controls.destroy()).not.toThrow();

      globalThis.window = originalWindow;
    });
  });

  // ===========================================================================
  // Nested element handling
  // ===========================================================================

  describe('nested element handling', () => {
    it('does not clear highlight while still inside nested elements', () => {
      const result = buildCanvas([
        { id: 'block-1', type: 'text', left: 0, top: 0, width: 400, height: 100 },
      ]);
      canvas = result.canvas;
      blockMap = result.blockMap;
      document.body.appendChild(canvas);

      const controls = createRuleDropZone({
        canvasElement: canvas,
        getBlockElements: () => blockMap,
        onRuleDrop: vi.fn(),
        onRuleReject: vi.fn(),
        isCompatible: () => true,
      });

      const block = blockMap.get('block-1');

      // Enter canvas
      canvas.dispatchEvent(createDragEvent('dragenter', { data: ruleData('required') }));
      canvas.dispatchEvent(
        createDragEvent('dragover', {
          clientX: 200,
          clientY: 50,
          data: ruleData('required'),
        }),
      );

      expect(block?.hasAttribute('data-rule-drop-target')).toBe(true);

      // Enter child element (fires another dragenter)
      canvas.dispatchEvent(createDragEvent('dragenter', { data: ruleData('required') }));

      // Leave child (fires dragleave, but still in canvas)
      canvas.dispatchEvent(createDragEvent('dragleave'));

      // Should NOT have cleared highlight
      expect(block?.hasAttribute('data-rule-drop-target')).toBe(true);

      // Leave canvas (final leave)
      canvas.dispatchEvent(createDragEvent('dragleave'));

      expect(block?.hasAttribute('data-rule-drop-target')).toBe(false);

      controls.destroy();
    });
  });
});
