/**
 * React hook for block selection in editors
 * Wraps the createBlockSelection primitive with React lifecycle management
 * @module hooks/use-block-selection
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type BlockSelectionController,
  type BlockSelectionState,
  createBlockSelection,
} from '../primitives/selection';

/**
 * Options for the useBlockSelection hook
 */
export interface UseBlockSelectionOptions {
  /**
   * Function to get current block elements
   * Called dynamically to handle DOM changes
   */
  getBlocks: () => HTMLElement[];

  /**
   * Callback fired when selection changes
   */
  onSelectionChange?: (selected: Set<string>) => void;

  /**
   * Whether multiple blocks can be selected
   * @default true
   */
  multiSelect?: boolean;
}

/**
 * Return type for the useBlockSelection hook
 */
export interface UseBlockSelectionReturn {
  /**
   * Ref callback to attach to the container element
   * When element is set, creates the controller
   * When element is detached (null), cleans up
   */
  ref: React.RefCallback<HTMLElement>;

  /**
   * Current selection state
   * Updates when selection changes
   */
  state: BlockSelectionState;

  /**
   * Select a single block
   * @param id Block ID to select
   * @param additive If true, add to selection instead of replacing
   */
  select: (id: string, additive?: boolean) => void;

  /**
   * Select a range of blocks between two IDs (inclusive)
   * @param fromId Start block ID
   * @param toId End block ID
   */
  selectRange: (fromId: string, toId: string) => void;

  /**
   * Select all blocks
   */
  selectAll: () => void;

  /**
   * Clear all selection
   */
  clear: () => void;
}

/**
 * Initial empty state for SSR and before container is attached
 */
const INITIAL_STATE: BlockSelectionState = {
  selected: new Set<string>(),
  anchor: null,
  focus: null,
};

/**
 * React hook for block selection behavior
 * Wraps createBlockSelection primitive with React lifecycle management
 *
 * Features:
 * - SSR safe: checks for window before creating controller
 * - StrictMode compatible: handles double-mount cleanup properly
 * - Ref callback pattern: creates/cleans up controller on mount/unmount
 * - Stable function references: uses useCallback for all methods
 *
 * @example
 * ```tsx
 * function Editor() {
 *   const { ref, state, select, clear } = useBlockSelection({
 *     getBlocks: () => Array.from(
 *       document.querySelectorAll('[data-block-id]')
 *     ) as HTMLElement[],
 *     onSelectionChange: (selected) => {
 *       console.log('Selected blocks:', selected);
 *     },
 *   });
 *
 *   return (
 *     <div ref={ref}>
 *       <div data-block-id="block-1">Block 1</div>
 *       <div data-block-id="block-2">Block 2</div>
 *       <div data-block-id="block-3">Block 3</div>
 *       <p>Selected: {state.selected.size} blocks</p>
 *       <button onClick={clear}>Clear</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useBlockSelection(options: UseBlockSelectionOptions): UseBlockSelectionReturn {
  const { getBlocks, onSelectionChange, multiSelect = true } = options;

  // Store controller in a ref to persist across renders
  const controllerRef = useRef<BlockSelectionController | null>(null);

  // Store the container element to manage lifecycle with useEffect
  const elementRef = useRef<HTMLElement | null>(null);

  // Store options in refs to avoid recreating controller on option changes
  const getBlocksRef = useRef(getBlocks);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const multiSelectRef = useRef(multiSelect);

  // Keep refs up to date
  useEffect(() => {
    getBlocksRef.current = getBlocks;
  }, [getBlocks]);

  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  useEffect(() => {
    multiSelectRef.current = multiSelect;
  }, [multiSelect]);

  // Track current selection state for React updates
  const [state, setState] = useState<BlockSelectionState>(INITIAL_STATE);

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

    // Create new controller with handler that uses refs
    controllerRef.current = createBlockSelection({
      container: element,
      getBlocks: () => getBlocksRef.current(),
      onSelectionChange: (selected: Set<string>) => {
        // Update React state to trigger re-render
        const controller = controllerRef.current;
        if (controller) {
          setState(controller.getState());
        }
        // Call user callback via ref
        onSelectionChangeRef.current?.(selected);
      },
      multiSelect: multiSelectRef.current,
    });

    // Initialize state from controller
    setState(controllerRef.current.getState());
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
        // Reset to initial state when element is detached
        setState(INITIAL_STATE);
      }
    },
    [createController],
  );

  /**
   * Select a single block
   */
  const select = useCallback((id: string, additive?: boolean) => {
    controllerRef.current?.select(id, additive);
  }, []);

  /**
   * Select a range of blocks
   */
  const selectRange = useCallback((fromId: string, toId: string) => {
    controllerRef.current?.selectRange(fromId, toId);
  }, []);

  /**
   * Select all blocks
   */
  const selectAll = useCallback(() => {
    controllerRef.current?.selectAll();
  }, []);

  /**
   * Clear all selection
   */
  const clear = useCallback(() => {
    controllerRef.current?.clear();
  }, []);

  return {
    ref,
    state,
    select,
    selectRange,
    selectAll,
    clear,
  };
}
