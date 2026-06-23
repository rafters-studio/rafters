/**
 * React hook for undo/redo history management
 *
 * Wraps the createHistory primitive with React state management
 * for automatic re-renders on state changes.
 *
 * @example
 * ```tsx
 * function Editor() {
 *   const { state, push, undo, redo, batch, clear } = useHistory({
 *     initialState: '',
 *     limit: 50,
 *   });
 *
 *   return (
 *     <div>
 *       <input
 *         value={state.current}
 *         onChange={(e) => push(e.target.value)}
 *       />
 *       <button onClick={undo} disabled={!state.canUndo}>Undo</button>
 *       <button onClick={redo} disabled={!state.canRedo}>Redo</button>
 *       <button onClick={clear}>Clear</button>
 *     </div>
 *   );
 * }
 * ```
 */

import { useCallback, useRef } from 'react';
import { createHistory, type History, type HistoryState } from '../primitives/history';
import { useMemory } from './use-memory';

export interface UseHistoryOptions<T> {
  /**
   * Initial state for the history
   */
  initialState: T;

  /**
   * Maximum number of history entries
   * Oldest entries are dropped when exceeded
   * @default 100
   */
  limit?: number;

  /**
   * Equality function to skip duplicate states
   * If returns true, push is skipped
   */
  isEqual?: (a: T, b: T) => boolean;
}

export interface UseHistoryReturn<T> {
  /**
   * Current history state including current value and undo/redo availability
   */
  state: HistoryState<T>;

  /**
   * Push a new state to history
   * Triggers re-render with updated state
   */
  push: (state: T) => void;

  /**
   * Undo to previous state
   * Returns previous state or null if at beginning
   * Triggers re-render with updated state
   */
  undo: () => T | null;

  /**
   * Redo to next state
   * Returns next state or null if at end
   * Triggers re-render with updated state
   */
  redo: () => T | null;

  /**
   * Batch multiple push calls into single undo step
   * Only the final state is recorded
   * Triggers single re-render after batch completes
   */
  batch: (fn: () => void) => void;

  /**
   * Reset history to initial state only
   * Triggers re-render with initial state
   */
  clear: () => void;
}

/**
 * React hook for undo/redo history management
 *
 * @param options - Configuration options for the history
 * @returns History state and control functions with stable references
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { state, push, undo, redo } = useHistory({
 *   initialState: { count: 0 },
 * });
 *
 * // With limit and equality check
 * const { state, push, undo, redo } = useHistory({
 *   initialState: '',
 *   limit: 50,
 *   isEqual: (a, b) => a === b,
 * });
 *
 * // Batch operations
 * const { batch, push } = useHistory({ initialState: [] });
 * batch(() => {
 *   push([...items, 'a']);
 *   push([...items, 'a', 'b']);
 *   push([...items, 'a', 'b', 'c']);
 * });
 * // Only one undo step recorded
 * ```
 */
export function useHistory<T>(options: UseHistoryOptions<T>): UseHistoryReturn<T> {
  // Store history controller in ref to persist across renders
  const historyRef = useRef<History<T> | null>(null);

  // Initialize history controller once
  if (historyRef.current === null) {
    historyRef.current = createHistory(options);
  }
  // biome-ignore lint/style/noNonNullAssertion: initialized by the if-block above
  const history = historyRef.current!;

  // Subscribe to history's reactive snapshot; re-renders (concurrent-safe) on any change.
  const historyState = useMemory(history.snapshot);

  const push = useCallback((state: T): void => history.push(state), [history]);
  const undo = useCallback((): T | null => history.undo(), [history]);
  const redo = useCallback((): T | null => history.redo(), [history]);
  const batch = useCallback((fn: () => void): void => history.batch(fn), [history]);
  const clear = useCallback((): void => history.clear(), [history]);

  return {
    state: historyState,
    push,
    undo,
    redo,
    batch,
    clear,
  };
}
