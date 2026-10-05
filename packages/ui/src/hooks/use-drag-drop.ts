/**
 * React hooks for drag and drop functionality
 * Wraps createDraggable and createDropZone primitives with React lifecycle management
 * @module hooks/use-drag-drop
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createDraggable,
  createDropZone,
  type DraggableControls,
  type DropZoneControls,
} from '../primitives/drag-drop';

/**
 * Options for the useDraggable hook
 */
export interface UseDraggableOptions {
  /**
   * Data associated with this draggable (passed to callbacks and drop zones)
   */
  data: unknown;

  /**
   * Optional handle element ref (if provided, only this element initiates drag)
   */
  handle?: React.RefObject<HTMLElement | null>;

  /**
   * Axis constraint for movement
   * @default 'both'
   */
  axis?: 'x' | 'y' | 'both';

  /**
   * Whether dragging is disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Called when drag starts
   */
  onDragStart?: (data: unknown) => void;

  /**
   * Called during drag (on mouse/touch move)
   */
  onDrag?: (data: unknown) => void;

  /**
   * Called when drag ends
   */
  onDragEnd?: (data: unknown) => void;
}

/**
 * Return type for the useDraggable hook
 */
export interface UseDraggableReturn {
  /**
   * Ref callback to attach to the draggable element
   */
  ref: React.RefCallback<HTMLElement>;

  /**
   * Whether the element is currently being dragged
   */
  isDragging: boolean;

  /**
   * Update disabled state
   */
  setDisabled: (disabled: boolean) => void;

  /**
   * Start keyboard drag mode
   */
  startKeyboardDrag: () => void;

  /**
   * Move up in keyboard drag mode
   */
  moveUp: () => void;

  /**
   * Move down in keyboard drag mode
   */
  moveDown: () => void;

  /**
   * Commit keyboard drag (drop)
   */
  commitKeyboardDrag: () => void;

  /**
   * Cancel keyboard drag
   */
  cancelKeyboardDrag: () => void;
}

/**
 * Options for the useDropZone hook
 */
export interface UseDropZoneOptions {
  /**
   * Function to filter acceptable drags (return true to accept)
   */
  accept?: (data: unknown) => boolean;

  /**
   * Called when drag enters the drop zone
   */
  onDragEnter?: (data: unknown) => void;

  /**
   * Called when drag moves over the drop zone
   */
  onDragOver?: (data: unknown) => void;

  /**
   * Called when drag leaves the drop zone
   */
  onDragLeave?: () => void;

  /**
   * Called when item is dropped
   */
  onDrop?: (data: unknown) => void;
}

/**
 * Return type for the useDropZone hook
 */
export interface UseDropZoneReturn {
  /**
   * Ref callback to attach to the drop zone element
   */
  ref: React.RefCallback<HTMLElement>;

  /**
   * Whether a draggable is currently over the drop zone
   */
  isOver: boolean;
}

/**
 * React hook for making elements draggable
 * Wraps createDraggable primitive with React lifecycle management
 *
 * Features:
 * - SSR safe: checks for window before creating controller
 * - StrictMode compatible: handles double-mount cleanup properly
 * - Ref callback pattern: creates/cleans up controller on mount/unmount
 * - Stable function references: uses useCallback for all methods
 *
 * @example
 * ```tsx
 * function DraggableCard({ id, title }: { id: string; title: string }) {
 *   const { ref, isDragging, startKeyboardDrag } = useDraggable({
 *     data: { id, title },
 *     onDragStart: (data) => console.log('Started dragging:', data),
 *     onDragEnd: (data) => console.log('Finished dragging:', data),
 *   });
 *
 *   return (
 *     <div
 *       ref={ref}
 *       style={{ opacity: isDragging ? 0.5 : 1 }}
 *       onKeyDown={(e) => e.key === ' ' && startKeyboardDrag()}
 *     >
 *       {title}
 *     </div>
 *   );
 * }
 * ```
 */
export function useDraggable(options: UseDraggableOptions): UseDraggableReturn {
  const { data, handle, axis = 'both', disabled = false, onDragStart, onDrag, onDragEnd } = options;

  // Store controller in a ref to persist across renders
  const controllerRef = useRef<DraggableControls | null>(null);

  // Store the element to manage lifecycle
  const elementRef = useRef<HTMLElement | null>(null);

  // Store options in refs to avoid recreating controller on option changes
  const dataRef = useRef(data);
  const handleRef = useRef(handle);
  const axisRef = useRef(axis);
  const disabledRef = useRef(disabled);
  const onDragStartRef = useRef(onDragStart);
  const onDragRef = useRef(onDrag);
  const onDragEndRef = useRef(onDragEnd);

  // Track dragging state for React updates
  const [isDragging, setIsDragging] = useState(false);

  // Keep refs up to date
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    handleRef.current = handle;
  }, [handle]);

  useEffect(() => {
    axisRef.current = axis;
  }, [axis]);

  useEffect(() => {
    disabledRef.current = disabled;
    // Update controller disabled state if it exists
    controllerRef.current?.setDisabled(disabled);
  }, [disabled]);

  useEffect(() => {
    onDragStartRef.current = onDragStart;
  }, [onDragStart]);

  useEffect(() => {
    onDragRef.current = onDrag;
  }, [onDrag]);

  useEffect(() => {
    onDragEndRef.current = onDragEnd;
  }, [onDragEnd]);

  /**
   * Internal function to create the controller
   * Uses refs to access current options without triggering re-creation
   */
  const createController = useCallback((element: HTMLElement) => {
    // SSR guard
    if (typeof window === 'undefined') {
      return;
    }

    // Cleanup existing controller
    if (controllerRef.current) {
      controllerRef.current.cleanup();
      controllerRef.current = null;
    }

    // Create new controller with handlers that use refs
    const handleElement = handleRef.current?.current;
    controllerRef.current = createDraggable({
      element,
      ...(handleElement ? { handle: handleElement } : {}),
      data: dataRef.current,
      axis: axisRef.current,
      disabled: disabledRef.current,
      onDragStart: (eventData) => {
        setIsDragging(true);
        onDragStartRef.current?.(eventData.data);
      },
      onDrag: (eventData) => {
        onDragRef.current?.(eventData.data);
      },
      onDragEnd: (eventData) => {
        setIsDragging(false);
        onDragEndRef.current?.(eventData.data);
      },
    });
  }, []);

  /**
   * Ref callback that manages controller lifecycle
   * Creates controller when element is attached
   * Cleans up when element is detached
   */
  const ref = useCallback(
    (element: HTMLElement | null) => {
      elementRef.current = element;

      // Cleanup existing controller
      if (controllerRef.current) {
        controllerRef.current.cleanup();
        controllerRef.current = null;
      }

      // Create new controller if element is provided
      if (element !== null) {
        createController(element);
      } else {
        // Reset state when element is detached
        setIsDragging(false);
      }
    },
    [createController],
  );

  /**
   * Update disabled state
   */
  const setDisabled = useCallback((newDisabled: boolean) => {
    controllerRef.current?.setDisabled(newDisabled);
  }, []);

  /**
   * Start keyboard drag mode
   */
  const startKeyboardDrag = useCallback(() => {
    controllerRef.current?.startKeyboardDrag();
  }, []);

  /**
   * Move up in keyboard drag mode
   */
  const moveUp = useCallback(() => {
    controllerRef.current?.moveUp();
  }, []);

  /**
   * Move down in keyboard drag mode
   */
  const moveDown = useCallback(() => {
    controllerRef.current?.moveDown();
  }, []);

  /**
   * Commit keyboard drag (drop)
   */
  const commitKeyboardDrag = useCallback(() => {
    controllerRef.current?.commitKeyboardDrag();
  }, []);

  /**
   * Cancel keyboard drag
   */
  const cancelKeyboardDrag = useCallback(() => {
    controllerRef.current?.cancelKeyboardDrag();
  }, []);

  return {
    ref,
    isDragging,
    setDisabled,
    startKeyboardDrag,
    moveUp,
    moveDown,
    commitKeyboardDrag,
    cancelKeyboardDrag,
  };
}

/**
 * React hook for creating drop zones
 * Wraps createDropZone primitive with React lifecycle management
 *
 * Features:
 * - SSR safe: checks for window before creating controller
 * - StrictMode compatible: handles double-mount cleanup properly
 * - Ref callback pattern: creates/cleans up controller on mount/unmount
 * - Tracks isOver state for React updates
 *
 * @example
 * ```tsx
 * function DropTarget({ onItemDropped }: { onItemDropped: (data: unknown) => void }) {
 *   const { ref, isOver } = useDropZone({
 *     accept: (data) => typeof data === 'object' && data !== null,
 *     onDrop: onItemDropped,
 *   });
 *
 *   return (
 *     <div
 *       ref={ref}
 *       style={{
 *         backgroundColor: isOver ? 'lightblue' : 'white',
 *         border: isOver ? '2px dashed blue' : '2px solid gray',
 *       }}
 *     >
 *       Drop items here
 *     </div>
 *   );
 * }
 * ```
 */
export function useDropZone(options: UseDropZoneOptions): UseDropZoneReturn {
  const { accept, onDragEnter, onDragOver, onDragLeave, onDrop } = options;

  // Store controller in a ref to persist across renders
  const controllerRef = useRef<DropZoneControls | null>(null);

  // Store the element to manage lifecycle
  const elementRef = useRef<HTMLElement | null>(null);

  // Store options in refs to avoid recreating controller on option changes
  const acceptRef = useRef(accept);
  const onDragEnterRef = useRef(onDragEnter);
  const onDragOverRef = useRef(onDragOver);
  const onDragLeaveRef = useRef(onDragLeave);
  const onDropRef = useRef(onDrop);

  // Track whether a draggable is over the drop zone
  const [isOver, setIsOver] = useState(false);

  // Keep refs up to date
  useEffect(() => {
    acceptRef.current = accept;
  }, [accept]);

  useEffect(() => {
    onDragEnterRef.current = onDragEnter;
  }, [onDragEnter]);

  useEffect(() => {
    onDragOverRef.current = onDragOver;
  }, [onDragOver]);

  useEffect(() => {
    onDragLeaveRef.current = onDragLeave;
  }, [onDragLeave]);

  useEffect(() => {
    onDropRef.current = onDrop;
  }, [onDrop]);

  /**
   * Internal function to create the controller
   * Uses refs to access current options without triggering re-creation
   */
  const createController = useCallback((element: HTMLElement) => {
    // SSR guard
    if (typeof window === 'undefined') {
      return;
    }

    // Cleanup existing controller
    if (controllerRef.current) {
      controllerRef.current.cleanup();
      controllerRef.current = null;
    }

    // Create new controller with handlers that use refs
    controllerRef.current = createDropZone({
      element,
      accept: (data) => acceptRef.current?.(data) ?? true,
      onDragEnter: (data) => {
        setIsOver(true);
        onDragEnterRef.current?.(data);
      },
      onDragOver: (data) => {
        onDragOverRef.current?.(data);
      },
      onDragLeave: () => {
        setIsOver(false);
        onDragLeaveRef.current?.();
      },
      onDrop: (data) => {
        setIsOver(false);
        onDropRef.current?.(data);
      },
    });
  }, []);

  /**
   * Ref callback that manages controller lifecycle
   * Creates controller when element is attached
   * Cleans up when element is detached
   */
  const ref = useCallback(
    (element: HTMLElement | null) => {
      elementRef.current = element;

      // Cleanup existing controller
      if (controllerRef.current) {
        controllerRef.current.cleanup();
        controllerRef.current = null;
      }

      // Create new controller if element is provided
      if (element !== null) {
        createController(element);
      } else {
        // Reset state when element is detached
        setIsOver(false);
      }
    },
    [createController],
  );

  return {
    ref,
    isOver,
  };
}
