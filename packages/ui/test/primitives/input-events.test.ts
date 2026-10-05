import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInputHandler, type InputData } from '../../src/primitives/input-events';

describe('createInputHandler', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.setAttribute('contenteditable', 'true');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  /**
   * Create a mock InputEvent with the specified inputType
   */
  function createInputEvent(
    type: 'beforeinput' | 'input',
    inputType: string,
    options: Partial<{
      data: string | null;
      isComposing: boolean;
      targetRanges: StaticRange[];
    }> = {},
  ): InputEvent {
    const { data = null, isComposing = false, targetRanges = [] } = options;

    // Create a proper InputEvent
    const event = new InputEvent(type, {
      inputType,
      data,
      isComposing,
      bubbles: true,
      cancelable: type === 'beforeinput',
    });

    // Define getTargetRanges since jsdom does not support it
    Object.defineProperty(event, 'getTargetRanges', {
      value: () => targetRanges,
      writable: true,
    });

    return event;
  }

  /**
   * Create a CompositionEvent
   */
  function createCompositionEvent(
    type: 'compositionstart' | 'compositionupdate' | 'compositionend',
    data = '',
  ): CompositionEvent {
    return new CompositionEvent(type, {
      data,
      bubbles: true,
    });
  }

  describe('basic text input handling', () => {
    it('calls onInput with correct InputData for insertText', () => {
      const onInput = vi.fn<[InputData], void>();

      const { cleanup } = createInputHandler({
        element: container,
        onInput,
      });

      const event = createInputEvent('input', 'insertText', {
        data: 'a',
      });
      container.dispatchEvent(event);

      expect(onInput).toHaveBeenCalledTimes(1);
      expect(onInput).toHaveBeenCalledWith({
        inputType: 'insertText',
        data: 'a',
        isComposing: false,
        targetRanges: [],
      });

      cleanup();
    });

    it('calls onBeforeInput before the input is processed', () => {
      const onBeforeInput = vi.fn<[InputData], void>();
      const onInput = vi.fn<[InputData], void>();

      const { cleanup } = createInputHandler({
        element: container,
        onBeforeInput,
        onInput,
      });

      const beforeEvent = createInputEvent('beforeinput', 'insertText', {
        data: 'b',
      });
      container.dispatchEvent(beforeEvent);

      expect(onBeforeInput).toHaveBeenCalledTimes(1);
      expect(onInput).not.toHaveBeenCalled();

      const inputEvent = createInputEvent('input', 'insertText', {
        data: 'b',
      });
      container.dispatchEvent(inputEvent);

      expect(onInput).toHaveBeenCalledTimes(1);

      cleanup();
    });

    it('handles deleteContentBackward input type', () => {
      const onInput = vi.fn<[InputData], void>();

      const { cleanup } = createInputHandler({
        element: container,
        onInput,
      });

      const event = createInputEvent('input', 'deleteContentBackward');
      container.dispatchEvent(event);

      expect(onInput).toHaveBeenCalledWith(
        expect.objectContaining({
          inputType: 'deleteContentBackward',
        }),
      );

      cleanup();
    });

    it('handles insertParagraph input type', () => {
      const onInput = vi.fn<[InputData], void>();

      const { cleanup } = createInputHandler({
        element: container,
        onInput,
      });

      const event = createInputEvent('input', 'insertParagraph');
      container.dispatchEvent(event);

      expect(onInput).toHaveBeenCalledWith(
        expect.objectContaining({
          inputType: 'insertParagraph',
        }),
      );

      cleanup();
    });

    it('ignores unknown input types', () => {
      const onInput = vi.fn<[InputData], void>();

      const { cleanup } = createInputHandler({
        element: container,
        onInput,
      });

      const event = createInputEvent('input', 'unknownInputType');
      container.dispatchEvent(event);

      expect(onInput).not.toHaveBeenCalled();

      cleanup();
    });
  });

  describe('composition events (IME)', () => {
    it('tracks composition state with isComposing getter', () => {
      const handler = createInputHandler({
        element: container,
      });

      expect(handler.isComposing).toBe(false);

      container.dispatchEvent(createCompositionEvent('compositionstart'));
      expect(handler.isComposing).toBe(true);

      container.dispatchEvent(createCompositionEvent('compositionend'));
      expect(handler.isComposing).toBe(false);

      handler.cleanup();
    });

    it('calls onCompositionStart when composition begins', () => {
      const onCompositionStart = vi.fn<[CompositionEvent], void>();

      const { cleanup } = createInputHandler({
        element: container,
        onCompositionStart,
      });

      const event = createCompositionEvent('compositionstart');
      container.dispatchEvent(event);

      expect(onCompositionStart).toHaveBeenCalledTimes(1);
      expect(onCompositionStart).toHaveBeenCalledWith(event);

      cleanup();
    });

    it('calls onCompositionUpdate during composition', () => {
      const onCompositionUpdate = vi.fn<[CompositionEvent], void>();

      const { cleanup } = createInputHandler({
        element: container,
        onCompositionUpdate,
      });

      container.dispatchEvent(createCompositionEvent('compositionstart'));

      const updateEvent = createCompositionEvent('compositionupdate', 'hello');
      container.dispatchEvent(updateEvent);

      expect(onCompositionUpdate).toHaveBeenCalledTimes(1);
      expect(onCompositionUpdate).toHaveBeenCalledWith(updateEvent);

      cleanup();
    });

    it('calls onCompositionEnd when composition finishes', () => {
      const onCompositionEnd = vi.fn<[CompositionEvent], void>();

      const { cleanup } = createInputHandler({
        element: container,
        onCompositionEnd,
      });

      container.dispatchEvent(createCompositionEvent('compositionstart'));

      const endEvent = createCompositionEvent('compositionend', 'hello');
      container.dispatchEvent(endEvent);

      expect(onCompositionEnd).toHaveBeenCalledTimes(1);
      expect(onCompositionEnd).toHaveBeenCalledWith(endEvent);

      cleanup();
    });

    it('prevents duplicate characters by skipping insertText during composition', () => {
      const onInput = vi.fn<[InputData], void>();
      const onBeforeInput = vi.fn<[InputData], void>();

      const { cleanup } = createInputHandler({
        element: container,
        onInput,
        onBeforeInput,
      });

      // Start composition
      container.dispatchEvent(createCompositionEvent('compositionstart'));

      // Input events during composition should be skipped for insertText
      const composingEvent = createInputEvent('input', 'insertText', {
        data: 'he',
        isComposing: true,
      });
      container.dispatchEvent(composingEvent);

      expect(onInput).not.toHaveBeenCalled();

      // beforeinput during composition should also be skipped for insertText
      const beforeComposingEvent = createInputEvent('beforeinput', 'insertText', {
        data: 'hel',
        isComposing: true,
      });
      container.dispatchEvent(beforeComposingEvent);

      expect(onBeforeInput).not.toHaveBeenCalled();

      // End composition
      container.dispatchEvent(createCompositionEvent('compositionend', 'hello'));

      // After composition ends, normal input should work
      const normalEvent = createInputEvent('input', 'insertText', {
        data: ' world',
        isComposing: false,
      });
      container.dispatchEvent(normalEvent);

      expect(onInput).toHaveBeenCalledTimes(1);
      expect(onInput).toHaveBeenCalledWith(
        expect.objectContaining({
          inputType: 'insertText',
          data: ' world',
        }),
      );

      cleanup();
    });

    it('allows non-insertText events during composition', () => {
      const onInput = vi.fn<[InputData], void>();

      const { cleanup } = createInputHandler({
        element: container,
        onInput,
      });

      // Start composition
      container.dispatchEvent(createCompositionEvent('compositionstart'));

      // Delete events should still be processed during composition
      const deleteEvent = createInputEvent('input', 'deleteContentBackward', {
        isComposing: true,
      });
      container.dispatchEvent(deleteEvent);

      expect(onInput).toHaveBeenCalledTimes(1);
      expect(onInput).toHaveBeenCalledWith(
        expect.objectContaining({
          inputType: 'deleteContentBackward',
          isComposing: true,
        }),
      );

      cleanup();
    });
  });

  describe('preventDefault for configured types', () => {
    it('prevents default for specified input types', () => {
      const { cleanup } = createInputHandler({
        element: container,
        preventDefault: ['formatBold', 'formatItalic'],
      });

      const boldEvent = createInputEvent('beforeinput', 'formatBold');
      const preventDefaultSpy = vi.spyOn(boldEvent, 'preventDefault');

      container.dispatchEvent(boldEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();

      cleanup();
    });

    it('does not prevent default for non-specified input types', () => {
      const { cleanup } = createInputHandler({
        element: container,
        preventDefault: ['formatBold'],
      });

      const insertEvent = createInputEvent('beforeinput', 'insertText', {
        data: 'x',
      });
      const preventDefaultSpy = vi.spyOn(insertEvent, 'preventDefault');

      container.dispatchEvent(insertEvent);

      expect(preventDefaultSpy).not.toHaveBeenCalled();

      cleanup();
    });

    it('prevents default for multiple configured types', () => {
      const { cleanup } = createInputHandler({
        element: container,
        preventDefault: ['historyUndo', 'historyRedo', 'formatUnderline'],
      });

      const undoEvent = createInputEvent('beforeinput', 'historyUndo');
      const undoPreventSpy = vi.spyOn(undoEvent, 'preventDefault');
      container.dispatchEvent(undoEvent);
      expect(undoPreventSpy).toHaveBeenCalled();

      const redoEvent = createInputEvent('beforeinput', 'historyRedo');
      const redoPreventSpy = vi.spyOn(redoEvent, 'preventDefault');
      container.dispatchEvent(redoEvent);
      expect(redoPreventSpy).toHaveBeenCalled();

      const underlineEvent = createInputEvent('beforeinput', 'formatUnderline');
      const underlinePreventSpy = vi.spyOn(underlineEvent, 'preventDefault');
      container.dispatchEvent(underlineEvent);
      expect(underlinePreventSpy).toHaveBeenCalled();

      cleanup();
    });
  });

  describe('cleanup removes listeners', () => {
    it('removes all event listeners on cleanup', () => {
      const onInput = vi.fn<[InputData], void>();
      const onBeforeInput = vi.fn<[InputData], void>();
      const onCompositionStart = vi.fn<[CompositionEvent], void>();
      const onCompositionUpdate = vi.fn<[CompositionEvent], void>();
      const onCompositionEnd = vi.fn<[CompositionEvent], void>();

      const { cleanup } = createInputHandler({
        element: container,
        onInput,
        onBeforeInput,
        onCompositionStart,
        onCompositionUpdate,
        onCompositionEnd,
      });

      // Cleanup
      cleanup();

      // Events should no longer trigger handlers
      container.dispatchEvent(createInputEvent('input', 'insertText', { data: 'x' }));
      container.dispatchEvent(createInputEvent('beforeinput', 'insertText', { data: 'x' }));
      container.dispatchEvent(createCompositionEvent('compositionstart'));
      container.dispatchEvent(createCompositionEvent('compositionupdate', 'test'));
      container.dispatchEvent(createCompositionEvent('compositionend', 'test'));

      expect(onInput).not.toHaveBeenCalled();
      expect(onBeforeInput).not.toHaveBeenCalled();
      expect(onCompositionStart).not.toHaveBeenCalled();
      expect(onCompositionUpdate).not.toHaveBeenCalled();
      expect(onCompositionEnd).not.toHaveBeenCalled();
    });

    it('can be called multiple times without error', () => {
      const { cleanup } = createInputHandler({
        element: container,
      });

      expect(() => {
        cleanup();
        cleanup();
        cleanup();
      }).not.toThrow();
    });
  });

  describe('SSR safety', () => {
    it('returns no-op handler when window is undefined', () => {
      // Save original window
      const originalWindow = globalThis.window;

      // Mock SSR environment
      // @ts-expect-error - intentionally removing window for SSR test
      delete globalThis.window;

      const handler = createInputHandler({
        element: container,
        onInput: vi.fn(),
      });

      expect(handler.isComposing).toBe(false);
      expect(() => handler.cleanup()).not.toThrow();

      // Restore window
      globalThis.window = originalWindow;
    });
  });

  describe('edge cases', () => {
    it('handles events without callbacks', () => {
      const { cleanup } = createInputHandler({
        element: container,
      });

      // Should not throw when no callbacks are provided
      expect(() => {
        container.dispatchEvent(createInputEvent('input', 'insertText', { data: 'x' }));
        container.dispatchEvent(createInputEvent('beforeinput', 'insertText', { data: 'x' }));
        container.dispatchEvent(createCompositionEvent('compositionstart'));
        container.dispatchEvent(createCompositionEvent('compositionupdate', 'test'));
        container.dispatchEvent(createCompositionEvent('compositionend', 'test'));
      }).not.toThrow();

      cleanup();
    });

    it('handles empty preventDefault array', () => {
      const { cleanup } = createInputHandler({
        element: container,
        preventDefault: [],
      });

      const event = createInputEvent('beforeinput', 'formatBold');
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      container.dispatchEvent(event);

      expect(preventDefaultSpy).not.toHaveBeenCalled();

      cleanup();
    });

    it('tracks composition state from event.isComposing even without compositionstart', () => {
      const onInput = vi.fn<[InputData], void>();

      const { cleanup } = createInputHandler({
        element: container,
        onInput,
      });

      // Event with isComposing=true but no compositionstart
      // Should still be skipped for insertText
      const composingEvent = createInputEvent('input', 'insertText', {
        data: 'test',
        isComposing: true,
      });
      container.dispatchEvent(composingEvent);

      expect(onInput).not.toHaveBeenCalled();

      cleanup();
    });

    it('handles all supported input types', () => {
      const onInput = vi.fn<[InputData], void>();

      const { cleanup } = createInputHandler({
        element: container,
        onInput,
      });

      const inputTypes = [
        'insertText',
        'insertParagraph',
        'insertLineBreak',
        'deleteContentBackward',
        'deleteContentForward',
        'deleteByCut',
        'insertFromPaste',
        'formatBold',
        'formatItalic',
        'formatUnderline',
        'formatStrikeThrough',
        'historyUndo',
        'historyRedo',
      ];

      for (const inputType of inputTypes) {
        onInput.mockClear();
        const event = createInputEvent('input', inputType, {
          data: inputType === 'insertText' ? 'x' : null,
        });
        container.dispatchEvent(event);

        expect(onInput).toHaveBeenCalledWith(
          expect.objectContaining({
            inputType,
          }),
        );
      }

      cleanup();
    });
  });
});
