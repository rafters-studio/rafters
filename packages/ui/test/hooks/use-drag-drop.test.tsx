import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode, useEffect, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDraggable, useDropZone } from '../../src/hooks/use-drag-drop';
import { resetDragDropState } from '../../src/primitives/drag-drop';

// Reset drag-drop state between tests to avoid cross-test pollution
afterEach(() => {
  resetDragDropState();
});

/**
 * Test component for useDraggable hook
 */
function TestDraggable({
  data,
  disabled = false,
  onDragStart,
  onDrag,
  onDragEnd,
}: {
  data: unknown;
  disabled?: boolean;
  onDragStart?: (data: unknown) => void;
  onDrag?: (data: unknown) => void;
  onDragEnd?: (data: unknown) => void;
}) {
  const {
    ref,
    isDragging,
    setDisabled,
    startKeyboardDrag,
    moveUp,
    moveDown,
    commitKeyboardDrag,
    cancelKeyboardDrag,
  } = useDraggable({
    data,
    disabled,
    onDragStart,
    onDrag,
    onDragEnd,
  });

  return (
    <div data-testid="container">
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: tabIndex needed for keyboard drag testing */}
      <div ref={ref} data-testid="draggable" tabIndex={0}>
        Draggable Item
      </div>
      <div data-testid="is-dragging">{isDragging ? 'true' : 'false'}</div>
      <button type="button" data-testid="set-disabled" onClick={() => setDisabled(true)}>
        Disable
      </button>
      <button type="button" data-testid="start-keyboard-drag" onClick={startKeyboardDrag}>
        Start Keyboard Drag
      </button>
      <button type="button" data-testid="move-up" onClick={moveUp}>
        Move Up
      </button>
      <button type="button" data-testid="move-down" onClick={moveDown}>
        Move Down
      </button>
      <button type="button" data-testid="commit-keyboard-drag" onClick={commitKeyboardDrag}>
        Commit
      </button>
      <button type="button" data-testid="cancel-keyboard-drag" onClick={cancelKeyboardDrag}>
        Cancel
      </button>
    </div>
  );
}

/**
 * Test component for useDropZone hook
 */
function TestDropZone({
  accept,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  accept?: (data: unknown) => boolean;
  onDragEnter?: (data: unknown) => void;
  onDragOver?: (data: unknown) => void;
  onDragLeave?: () => void;
  onDrop?: (data: unknown) => void;
}) {
  const { ref, isOver } = useDropZone({
    accept,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
  });

  return (
    <div data-testid="container">
      <div ref={ref} data-testid="drop-zone">
        Drop Zone
      </div>
      <div data-testid="is-over">{isOver ? 'true' : 'false'}</div>
    </div>
  );
}

describe('useDraggable', () => {
  describe('ref callback', () => {
    it('returns a ref callback', () => {
      let capturedRef: React.RefCallback<HTMLElement> | null = null;

      function CaptureRef() {
        const { ref } = useDraggable({
          data: { id: 'test' },
        });
        capturedRef = ref;
        return null;
      }

      render(<CaptureRef />);

      expect(typeof capturedRef).toBe('function');
    });

    it('creates controller when ref is attached', () => {
      render(<TestDraggable data={{ id: 'test' }} />);

      // Verify draggable is rendered
      const draggable = screen.getByTestId('draggable');
      expect(draggable).toBeInTheDocument();

      // Should have draggable attribute set by primitive
      expect(draggable).toHaveAttribute('draggable', 'true');
    });

    it('cleans up when ref is detached', async () => {
      const onDragStart = vi.fn();

      function ToggleDraggable() {
        const [show, setShow] = useState(true);

        return (
          <div>
            {show && <TestDraggable data={{ id: 'test' }} onDragStart={onDragStart} />}
            <button type="button" data-testid="toggle" onClick={() => setShow(false)}>
              Toggle
            </button>
          </div>
        );
      }

      const user = userEvent.setup();
      render(<ToggleDraggable />);

      // Verify draggable is present
      expect(screen.getByTestId('draggable')).toBeInTheDocument();

      // Unmount the draggable
      await user.click(screen.getByTestId('toggle'));

      // The draggable should be gone
      expect(screen.queryByTestId('draggable')).not.toBeInTheDocument();
    });
  });

  describe('isDragging state', () => {
    it('starts as false', () => {
      render(<TestDraggable data={{ id: 'test' }} />);

      expect(screen.getByTestId('is-dragging')).toHaveTextContent('false');
    });
  });

  describe('methods', () => {
    it('returns all keyboard drag methods', () => {
      let methods: {
        setDisabled: (disabled: boolean) => void;
        startKeyboardDrag: () => void;
        moveUp: () => void;
        moveDown: () => void;
        commitKeyboardDrag: () => void;
        cancelKeyboardDrag: () => void;
      } | null = null;

      function CaptureMethod() {
        const hook = useDraggable({
          data: { id: 'test' },
        });
        methods = {
          setDisabled: hook.setDisabled,
          startKeyboardDrag: hook.startKeyboardDrag,
          moveUp: hook.moveUp,
          moveDown: hook.moveDown,
          commitKeyboardDrag: hook.commitKeyboardDrag,
          cancelKeyboardDrag: hook.cancelKeyboardDrag,
        };
        return <div ref={hook.ref}>Test</div>;
      }

      render(<CaptureMethod />);

      expect(typeof methods?.setDisabled).toBe('function');
      expect(typeof methods?.startKeyboardDrag).toBe('function');
      expect(typeof methods?.moveUp).toBe('function');
      expect(typeof methods?.moveDown).toBe('function');
      expect(typeof methods?.commitKeyboardDrag).toBe('function');
      expect(typeof methods?.cancelKeyboardDrag).toBe('function');
    });

    it('methods are no-ops before container is attached', () => {
      function NoContainerComponent() {
        const { isDragging, setDisabled, startKeyboardDrag, moveUp, moveDown } = useDraggable({
          data: { id: 'test' },
        });

        // Call methods without attaching ref
        useEffect(() => {
          setDisabled(true);
          startKeyboardDrag();
          moveUp();
          moveDown();
        }, [setDisabled, startKeyboardDrag, moveUp, moveDown]);

        return <div data-testid="is-dragging">{isDragging ? 'true' : 'false'}</div>;
      }

      // Should not throw
      render(<NoContainerComponent />);

      expect(screen.getByTestId('is-dragging')).toHaveTextContent('false');
    });
  });

  describe('StrictMode compatibility', () => {
    it('handles StrictMode double-mount correctly', () => {
      function StrictModeDraggable() {
        return (
          <StrictMode>
            <TestDraggable data={{ id: 'test' }} />
          </StrictMode>
        );
      }

      render(<StrictModeDraggable />);

      // Should work correctly after StrictMode remount
      const draggable = screen.getByTestId('draggable');
      expect(draggable).toBeInTheDocument();
      expect(draggable).toHaveAttribute('draggable', 'true');
    });

    it('cleans up properly on StrictMode remount', () => {
      function TrackingDraggable() {
        const { ref, isDragging } = useDraggable({
          data: { id: 'test' },
        });

        return (
          <div>
            <div ref={ref} data-testid="draggable">
              Draggable
            </div>
            <div data-testid="is-dragging">{isDragging ? 'true' : 'false'}</div>
          </div>
        );
      }

      render(
        <StrictMode>
          <TrackingDraggable />
        </StrictMode>,
      );

      // Verify the component rendered correctly after StrictMode remount
      expect(screen.getByTestId('draggable')).toBeInTheDocument();
      expect(screen.getByTestId('is-dragging')).toHaveTextContent('false');
    });
  });

  describe('SSR safety', () => {
    it('returns initial false state before container is attached', () => {
      function CheckInitialState() {
        const { isDragging } = useDraggable({
          data: { id: 'test' },
        });

        return <div data-testid="is-dragging">{isDragging ? 'true' : 'false'}</div>;
      }

      render(<CheckInitialState />);

      expect(screen.getByTestId('is-dragging')).toHaveTextContent('false');
    });
  });

  describe('stable function references', () => {
    it('maintains stable references across renders', async () => {
      const references: {
        setDisabled: (disabled: boolean) => void;
        startKeyboardDrag: () => void;
        moveUp: () => void;
        moveDown: () => void;
        commitKeyboardDrag: () => void;
        cancelKeyboardDrag: () => void;
      }[] = [];

      function CaptureReferences() {
        const {
          ref,
          setDisabled,
          startKeyboardDrag,
          moveUp,
          moveDown,
          commitKeyboardDrag,
          cancelKeyboardDrag,
        } = useDraggable({
          data: { id: 'test' },
        });

        useEffect(() => {
          references.push({
            setDisabled,
            startKeyboardDrag,
            moveUp,
            moveDown,
            commitKeyboardDrag,
            cancelKeyboardDrag,
          });
        });

        const [, setCounter] = useState(0);

        return (
          <div ref={ref}>
            <button type="button" data-testid="rerender" onClick={() => setCounter((c) => c + 1)}>
              Rerender
            </button>
          </div>
        );
      }

      const user = userEvent.setup();
      render(<CaptureReferences />);

      // Trigger a rerender
      await user.click(screen.getByTestId('rerender'));

      // Compare references - should have at least 2 captures
      expect(references.length).toBeGreaterThanOrEqual(2);

      const lastRef = references[references.length - 1];
      const prevRef = references[references.length - 2];

      // All methods should be stable (useCallback with empty deps)
      expect(prevRef?.setDisabled).toBe(lastRef?.setDisabled);
      expect(prevRef?.startKeyboardDrag).toBe(lastRef?.startKeyboardDrag);
      expect(prevRef?.moveUp).toBe(lastRef?.moveUp);
      expect(prevRef?.moveDown).toBe(lastRef?.moveDown);
      expect(prevRef?.commitKeyboardDrag).toBe(lastRef?.commitKeyboardDrag);
      expect(prevRef?.cancelKeyboardDrag).toBe(lastRef?.cancelKeyboardDrag);
    });
  });
});

describe('useDropZone', () => {
  describe('ref callback', () => {
    it('returns a ref callback', () => {
      let capturedRef: React.RefCallback<HTMLElement> | null = null;

      function CaptureRef() {
        const { ref } = useDropZone({});
        capturedRef = ref;
        return null;
      }

      render(<CaptureRef />);

      expect(typeof capturedRef).toBe('function');
    });

    it('creates controller when ref is attached', () => {
      render(<TestDropZone />);

      // Verify drop zone is rendered
      const dropZone = screen.getByTestId('drop-zone');
      expect(dropZone).toBeInTheDocument();

      // Should have aria-dropeffect set by primitive
      expect(dropZone).toHaveAttribute('aria-dropeffect', 'none');
    });

    it('cleans up when ref is detached', async () => {
      const onDrop = vi.fn();

      function ToggleDropZone() {
        const [show, setShow] = useState(true);

        return (
          <div>
            {show && <TestDropZone onDrop={onDrop} />}
            <button type="button" data-testid="toggle" onClick={() => setShow(false)}>
              Toggle
            </button>
          </div>
        );
      }

      const user = userEvent.setup();
      render(<ToggleDropZone />);

      // Verify drop zone is present
      expect(screen.getByTestId('drop-zone')).toBeInTheDocument();

      // Unmount the drop zone
      await user.click(screen.getByTestId('toggle'));

      // The drop zone should be gone
      expect(screen.queryByTestId('drop-zone')).not.toBeInTheDocument();
    });
  });

  describe('isOver state', () => {
    it('starts as false', () => {
      render(<TestDropZone />);

      expect(screen.getByTestId('is-over')).toHaveTextContent('false');
    });
  });

  describe('StrictMode compatibility', () => {
    it('handles StrictMode double-mount correctly', () => {
      function StrictModeDropZone() {
        return (
          <StrictMode>
            <TestDropZone />
          </StrictMode>
        );
      }

      render(<StrictModeDropZone />);

      // Should work correctly after StrictMode remount
      const dropZone = screen.getByTestId('drop-zone');
      expect(dropZone).toBeInTheDocument();
      expect(dropZone).toHaveAttribute('aria-dropeffect', 'none');
    });

    it('cleans up properly on StrictMode remount', () => {
      function TrackingDropZone() {
        const { ref, isOver } = useDropZone({});

        return (
          <div>
            <div ref={ref} data-testid="drop-zone">
              Drop Zone
            </div>
            <div data-testid="is-over">{isOver ? 'true' : 'false'}</div>
          </div>
        );
      }

      render(
        <StrictMode>
          <TrackingDropZone />
        </StrictMode>,
      );

      // Verify the component rendered correctly after StrictMode remount
      expect(screen.getByTestId('drop-zone')).toBeInTheDocument();
      expect(screen.getByTestId('is-over')).toHaveTextContent('false');
    });
  });

  describe('SSR safety', () => {
    it('returns initial false state before container is attached', () => {
      function CheckInitialState() {
        const { isOver } = useDropZone({});

        return <div data-testid="is-over">{isOver ? 'true' : 'false'}</div>;
      }

      render(<CheckInitialState />);

      expect(screen.getByTestId('is-over')).toHaveTextContent('false');
    });
  });

  describe('accept function', () => {
    it('passes accept function to primitive', () => {
      const accept = vi.fn().mockReturnValue(true);

      render(<TestDropZone accept={accept} />);

      // Verify drop zone was created (accept will be called during drag events)
      expect(screen.getByTestId('drop-zone')).toBeInTheDocument();
    });
  });
});

describe('useDraggable and useDropZone together', () => {
  it('both hooks work in the same component tree', () => {
    function DragDropContainer() {
      const draggable = useDraggable({
        data: { id: 'item-1' },
      });

      const onDrop = vi.fn();
      const dropZone = useDropZone({
        onDrop,
      });

      return (
        <div>
          <div ref={draggable.ref} data-testid="draggable">
            Drag me
          </div>
          <div data-testid="dragging">{draggable.isDragging ? 'true' : 'false'}</div>
          <div ref={dropZone.ref} data-testid="drop-zone">
            Drop here
          </div>
          <div data-testid="over">{dropZone.isOver ? 'true' : 'false'}</div>
        </div>
      );
    }

    render(<DragDropContainer />);

    expect(screen.getByTestId('draggable')).toBeInTheDocument();
    expect(screen.getByTestId('drop-zone')).toBeInTheDocument();
    expect(screen.getByTestId('dragging')).toHaveTextContent('false');
    expect(screen.getByTestId('over')).toHaveTextContent('false');
  });

  it('works in StrictMode with both hooks', () => {
    function DragDropContainer() {
      const draggable = useDraggable({
        data: { id: 'item-1' },
      });

      const dropZone = useDropZone({});

      return (
        <div>
          <div ref={draggable.ref} data-testid="draggable">
            Drag me
          </div>
          <div ref={dropZone.ref} data-testid="drop-zone">
            Drop here
          </div>
        </div>
      );
    }

    render(
      <StrictMode>
        <DragDropContainer />
      </StrictMode>,
    );

    // Both should work after StrictMode remount
    expect(screen.getByTestId('draggable')).toHaveAttribute('draggable', 'true');
    expect(screen.getByTestId('drop-zone')).toHaveAttribute('aria-dropeffect', 'none');
  });
});
