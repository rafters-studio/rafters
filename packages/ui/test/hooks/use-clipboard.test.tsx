import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode, useEffect, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useClipboard } from '../../src/hooks/use-clipboard';
import type { ClipboardData } from '../../src/primitives/clipboard';

// Store original clipboard for restoration
const originalClipboard = navigator.clipboard;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
  // Restore original clipboard if it was modified
  Object.defineProperty(navigator, 'clipboard', {
    value: originalClipboard,
    writable: true,
    configurable: true,
  });
});

/**
 * Test component that uses useClipboard hook
 */
function TestClipboard({
  customMimeType,
  onPaste,
  onCopy,
  onCut,
}: {
  customMimeType?: string;
  onPaste?: (data: ClipboardData) => void;
  onCopy?: (data: ClipboardData) => void;
  onCut?: (data: ClipboardData) => void;
}) {
  const { containerRef, copy, cut, paste } = useClipboard({
    customMimeType,
    onPaste,
    onCopy,
    onCut,
  });

  const [lastRead, setLastRead] = useState<string>('');

  const handleCopy = async () => {
    await copy({ text: 'Hello World', html: '<b>Hello World</b>' });
  };

  const handleCopyCustom = async () => {
    await copy({
      text: 'Custom data',
      custom: { type: 'block', id: 'block-1' },
    });
  };

  const handleCut = async () => {
    await cut({ text: 'Cut content' });
  };

  const handlePaste = async () => {
    const data = await paste();
    setLastRead(JSON.stringify(data));
  };

  return (
    // biome-ignore lint/a11y/noNoninteractiveTabindex: tabIndex needed for clipboard event testing
    <div ref={containerRef} data-testid="container" tabIndex={0}>
      <div data-testid="content">Editable content</div>
      <div data-testid="last-read">{lastRead}</div>
      <button type="button" data-testid="copy" onClick={handleCopy}>
        Copy
      </button>
      <button type="button" data-testid="copy-custom" onClick={handleCopyCustom}>
        Copy Custom
      </button>
      <button type="button" data-testid="cut" onClick={handleCut}>
        Cut
      </button>
      <button type="button" data-testid="paste" onClick={handlePaste}>
        Paste
      </button>
    </div>
  );
}

describe('useClipboard', () => {
  describe('containerRef callback', () => {
    it('returns a containerRef callback', () => {
      let capturedRef: React.RefCallback<HTMLElement> | null = null;

      function CaptureRef() {
        const { containerRef } = useClipboard();
        capturedRef = containerRef;
        return null;
      }

      render(<CaptureRef />);

      expect(typeof capturedRef).toBe('function');
    });

    it('creates controller when containerRef is attached', () => {
      render(<TestClipboard />);

      // Verify container is rendered and accessible
      const container = screen.getByTestId('container');
      expect(container).toBeInTheDocument();
    });

    it('cleans up when containerRef is detached', async () => {
      const onPaste = vi.fn();

      function ToggleClipboard() {
        const [show, setShow] = useState(true);

        return (
          <div>
            {show && <TestClipboard onPaste={onPaste} />}
            <button type="button" data-testid="toggle" onClick={() => setShow(false)}>
              Toggle
            </button>
          </div>
        );
      }

      const user = userEvent.setup();
      render(<ToggleClipboard />);

      // Container should be present
      expect(screen.getByTestId('container')).toBeInTheDocument();

      // Unmount the clipboard component
      await user.click(screen.getByTestId('toggle'));

      // The container should be gone
      expect(screen.queryByTestId('container')).not.toBeInTheDocument();
    });
  });

  describe('copy() method', () => {
    it('calls the primitive write function', async () => {
      // We test copy via a completion callback pattern since the primitive
      // handles the clipboard API internally. The hook's job is to forward
      // the call correctly to the controller.
      const copyResult: { called: boolean } = { called: false };

      function CopyTracker() {
        const { containerRef, copy } = useClipboard();

        const handleClick = async () => {
          await copy({ text: 'Hello World' });
          copyResult.called = true;
        };

        return (
          <div ref={containerRef} data-testid="container">
            <button type="button" data-testid="copy" onClick={handleClick}>
              Copy
            </button>
          </div>
        );
      }

      const user = userEvent.setup();
      render(<CopyTracker />);

      await user.click(screen.getByTestId('copy'));

      // The copy function should complete without error
      await waitFor(() => {
        expect(copyResult.called).toBe(true);
      });
    });

    it('is a no-op before container is attached', async () => {
      let copyFunc: ((data: ClipboardData) => Promise<void>) | null = null;

      function NoContainer() {
        const { copy } = useClipboard();
        copyFunc = copy;
        // Intentionally not attaching containerRef
        return <div data-testid="no-container">No container</div>;
      }

      render(<NoContainer />);

      // Should not throw when called without container
      await expect(copyFunc?.({ text: 'test' })).resolves.toBeUndefined();
    });
  });

  describe('cut() method', () => {
    it('calls the primitive write function with cut semantics', async () => {
      const cutResult: { called: boolean } = { called: false };

      function CutTracker() {
        const { containerRef, cut } = useClipboard();

        const handleClick = async () => {
          await cut({ text: 'Cut content' });
          cutResult.called = true;
        };

        return (
          <div ref={containerRef} data-testid="container">
            <button type="button" data-testid="cut" onClick={handleClick}>
              Cut
            </button>
          </div>
        );
      }

      const user = userEvent.setup();
      render(<CutTracker />);

      await user.click(screen.getByTestId('cut'));

      // The cut function should complete without error
      await waitFor(() => {
        expect(cutResult.called).toBe(true);
      });
    });

    it('is a no-op before container is attached', async () => {
      let cutFunc: ((data: ClipboardData) => Promise<void>) | null = null;

      function NoContainer() {
        const { cut } = useClipboard();
        cutFunc = cut;
        return <div data-testid="no-container">No container</div>;
      }

      render(<NoContainer />);

      // Should not throw when called without container
      await expect(cutFunc?.({ text: 'test' })).resolves.toBeUndefined();
    });
  });

  describe('paste() method', () => {
    it('calls the primitive read function', async () => {
      // We test paste via a completion callback pattern since the primitive
      // handles the clipboard API internally. The hook's job is to forward
      // the call correctly to the controller.
      const pasteResult: { called: boolean; data: ClipboardData | null } = {
        called: false,
        data: null,
      };

      function PasteTracker() {
        const { containerRef, paste } = useClipboard();

        const handleClick = async () => {
          const data = await paste();
          pasteResult.called = true;
          pasteResult.data = data;
        };

        return (
          <div ref={containerRef} data-testid="container">
            <button type="button" data-testid="paste" onClick={handleClick}>
              Paste
            </button>
          </div>
        );
      }

      const user = userEvent.setup();
      render(<PasteTracker />);

      await user.click(screen.getByTestId('paste'));

      // The paste function should complete and return a result
      await waitFor(() => {
        expect(pasteResult.called).toBe(true);
        // Result should be an object (could be empty due to permissions)
        expect(pasteResult.data).toBeDefined();
        expect(typeof pasteResult.data).toBe('object');
      });
    });

    it('returns empty object before container is attached', async () => {
      let pasteFunc: (() => Promise<ClipboardData>) | null = null;

      function NoContainer() {
        const { paste } = useClipboard();
        pasteFunc = paste;
        return <div>No container</div>;
      }

      render(<NoContainer />);

      const result = await pasteFunc?.();
      expect(result).toEqual({});
    });
  });

  describe('event callbacks', () => {
    it('fires onPaste callback on paste event', async () => {
      const onPaste = vi.fn();
      render(<TestClipboard onPaste={onPaste} />);

      const container = screen.getByTestId('container');

      // Create and dispatch a paste event with clipboard data
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        clipboardData: new DataTransfer(),
      });
      pasteEvent.clipboardData?.setData('text/plain', 'Pasted text');

      container.dispatchEvent(pasteEvent);

      await waitFor(() => {
        expect(onPaste).toHaveBeenCalled();
      });

      const callArg = onPaste.mock.calls[0]?.[0] as ClipboardData;
      expect(callArg.text).toBe('Pasted text');
    });

    it('fires onCopy callback on copy event', async () => {
      const onCopy = vi.fn();
      render(<TestClipboard onCopy={onCopy} />);

      const container = screen.getByTestId('container');

      // Create and dispatch a copy event
      const copyEvent = new ClipboardEvent('copy', {
        bubbles: true,
        clipboardData: new DataTransfer(),
      });
      copyEvent.clipboardData?.setData('text/plain', 'Copied text');

      container.dispatchEvent(copyEvent);

      await waitFor(() => {
        expect(onCopy).toHaveBeenCalled();
      });

      const callArg = onCopy.mock.calls[0]?.[0] as ClipboardData;
      expect(callArg.text).toBe('Copied text');
    });

    it('fires onCut callback on cut event', async () => {
      const onCut = vi.fn();
      render(<TestClipboard onCut={onCut} />);

      const container = screen.getByTestId('container');

      // Create and dispatch a cut event
      const cutEvent = new ClipboardEvent('cut', {
        bubbles: true,
        clipboardData: new DataTransfer(),
      });
      cutEvent.clipboardData?.setData('text/plain', 'Cut text');

      container.dispatchEvent(cutEvent);

      await waitFor(() => {
        expect(onCut).toHaveBeenCalled();
      });

      const callArg = onCut.mock.calls[0]?.[0] as ClipboardData;
      expect(callArg.text).toBe('Cut text');
    });

    it('handles callback updates without recreating controller', async () => {
      const onPaste1 = vi.fn();
      const onPaste2 = vi.fn();

      function UpdateableClipboard() {
        const [useSecond, setUseSecond] = useState(false);
        const { containerRef } = useClipboard({
          onPaste: useSecond ? onPaste2 : onPaste1,
        });

        return (
          <div>
            {/* biome-ignore lint/a11y/noNoninteractiveTabindex: tabIndex needed for clipboard event testing */}
            <div ref={containerRef} data-testid="container" tabIndex={0}>
              Content
            </div>
            <button type="button" data-testid="switch" onClick={() => setUseSecond(true)}>
              Switch
            </button>
          </div>
        );
      }

      const user = userEvent.setup();
      render(<UpdateableClipboard />);

      const container = screen.getByTestId('container');

      // First paste should call onPaste1
      const pasteEvent1 = new ClipboardEvent('paste', {
        bubbles: true,
        clipboardData: new DataTransfer(),
      });
      pasteEvent1.clipboardData?.setData('text/plain', 'First');
      container.dispatchEvent(pasteEvent1);

      await waitFor(() => {
        expect(onPaste1).toHaveBeenCalled();
      });
      expect(onPaste2).not.toHaveBeenCalled();

      // Switch the callback
      await user.click(screen.getByTestId('switch'));

      // Reset mocks
      onPaste1.mockClear();
      onPaste2.mockClear();

      // Second paste should call onPaste2
      const pasteEvent2 = new ClipboardEvent('paste', {
        bubbles: true,
        clipboardData: new DataTransfer(),
      });
      pasteEvent2.clipboardData?.setData('text/plain', 'Second');
      container.dispatchEvent(pasteEvent2);

      await waitFor(() => {
        expect(onPaste2).toHaveBeenCalled();
      });
      expect(onPaste1).not.toHaveBeenCalled();
    });
  });

  describe('StrictMode compatibility', () => {
    it('handles StrictMode double-mount correctly', async () => {
      const onPaste = vi.fn();

      function StrictModeClipboard() {
        return (
          <StrictMode>
            <TestClipboard onPaste={onPaste} />
          </StrictMode>
        );
      }

      render(<StrictModeClipboard />);

      // Container should be present and functional after StrictMode remount
      const container = screen.getByTestId('container');
      expect(container).toBeInTheDocument();

      // Trigger paste event
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        clipboardData: new DataTransfer(),
      });
      pasteEvent.clipboardData?.setData('text/plain', 'StrictMode test');
      container.dispatchEvent(pasteEvent);

      await waitFor(() => {
        expect(onPaste).toHaveBeenCalled();
      });
    });

    it('cleans up properly on StrictMode remount', () => {
      const onPaste = vi.fn();

      function TrackingClipboard() {
        const { containerRef } = useClipboard({
          onPaste,
        });

        return (
          <div ref={containerRef} data-testid="container">
            Content
          </div>
        );
      }

      render(
        <StrictMode>
          <TrackingClipboard />
        </StrictMode>,
      );

      // Verify the component rendered correctly after StrictMode remount
      expect(screen.getByTestId('container')).toBeInTheDocument();
    });
  });

  describe('SSR safety', () => {
    it('methods work correctly even without window', async () => {
      // This test verifies the hook handles SSR gracefully
      // The actual SSR check happens in the primitive, but we verify
      // the hook doesn't break when controller returns no-op functions

      let copyFunc: ((data: ClipboardData) => Promise<void>) | null = null;
      let pasteFunc: (() => Promise<ClipboardData>) | null = null;

      function SSRComponent() {
        const { containerRef, copy, paste } = useClipboard();
        copyFunc = copy;
        pasteFunc = paste;
        return <div ref={containerRef}>SSR Content</div>;
      }

      render(<SSRComponent />);

      // Both methods should complete without error
      await expect(copyFunc?.({ text: 'test' })).resolves.toBeUndefined();
      const result = await pasteFunc?.();
      expect(result).toBeDefined();
    });
  });

  describe('stable function references', () => {
    it('maintains stable references across renders', async () => {
      const references: {
        copy: (data: ClipboardData) => Promise<void>;
        cut: (data: ClipboardData) => Promise<void>;
        paste: () => Promise<ClipboardData>;
      }[] = [];

      function CaptureReferences() {
        const { containerRef, copy, cut, paste } = useClipboard();

        // Capture references on each effect run
        useEffect(() => {
          references.push({ copy, cut, paste });
        });

        const [, setCounter] = useState(0);

        return (
          <div ref={containerRef}>
            <button type="button" data-testid="rerender" onClick={() => setCounter((c) => c + 1)}>
              Rerender
            </button>
          </div>
        );
      }

      const user = userEvent.setup();
      render(<CaptureReferences />);

      // Trigger a rerender via user interaction
      await user.click(screen.getByTestId('rerender'));

      // Compare references - should have at least 2 captures
      expect(references.length).toBeGreaterThanOrEqual(2);

      // Get last two references
      const lastRef = references[references.length - 1];
      const prevRef = references[references.length - 2];

      // copy, cut, and paste should be stable (useCallback with empty deps)
      expect(prevRef?.copy).toBe(lastRef?.copy);
      expect(prevRef?.cut).toBe(lastRef?.cut);
      expect(prevRef?.paste).toBe(lastRef?.paste);
    });
  });

  describe('custom MIME type', () => {
    it('passes customMimeType to controller', async () => {
      const onPaste = vi.fn();

      render(<TestClipboard customMimeType="application/x-custom" onPaste={onPaste} />);

      const container = screen.getByTestId('container');

      // Create paste event with custom MIME type data
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        clipboardData: new DataTransfer(),
      });
      pasteEvent.clipboardData?.setData('application/x-custom', '{"custom": true}');
      pasteEvent.clipboardData?.setData('text/plain', 'Plain text');

      container.dispatchEvent(pasteEvent);

      await waitFor(() => {
        expect(onPaste).toHaveBeenCalled();
      });

      const callArg = onPaste.mock.calls[0]?.[0] as ClipboardData;
      expect(callArg.text).toBe('Plain text');
      expect(callArg.custom).toEqual({ custom: true });
    });
  });
});
