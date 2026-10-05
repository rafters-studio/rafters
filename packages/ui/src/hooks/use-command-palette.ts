/**
 * React hook for command palette behavior
 * Wraps the createCommandPalette primitive with React lifecycle management
 * @module hooks/use-command-palette
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type CommandPaletteController,
  type CommandPaletteState,
  createCommandPalette,
} from '../primitives/command-palette';
import type { Command } from '../primitives/types';

/**
 * Options for the useCommandPalette hook
 */
export interface UseCommandPaletteOptions {
  /**
   * Trigger character to open the palette
   * @default '/'
   */
  trigger?: string;

  /**
   * Available commands in the palette
   */
  commands: Command[];

  /**
   * Callback fired when palette opens
   */
  onOpen?: () => void;

  /**
   * Callback fired when palette closes
   */
  onClose?: () => void;

  /**
   * Callback fired when selection changes
   */
  onSelect?: (command: Command) => void;

  /**
   * Callback fired when a command is executed
   */
  onExecute?: (command: Command) => void;
}

/**
 * Return type for the useCommandPalette hook
 */
export interface UseCommandPaletteReturn {
  /**
   * Ref callback to attach to the container element
   * When element is set, creates the controller
   * When element is detached (null), cleans up
   */
  ref: React.RefCallback<HTMLElement>;

  /**
   * Current palette state
   * Updates when state changes
   */
  state: CommandPaletteState;

  /**
   * Open the command palette
   */
  open: () => void;

  /**
   * Close the command palette
   */
  close: () => void;

  /**
   * Update available commands
   */
  setCommands: (commands: Command[]) => void;

  /**
   * Update search query and filter commands
   */
  setQuery: (query: string) => void;

  /**
   * Select next command in the list
   */
  selectNext: () => void;

  /**
   * Select previous command in the list
   */
  selectPrevious: () => void;

  /**
   * Select first command in the list
   */
  selectFirst: () => void;

  /**
   * Select last command in the list
   */
  selectLast: () => void;

  /**
   * Execute the currently selected command
   */
  execute: () => void;
}

/**
 * Initial empty state for SSR and before container is attached
 */
const INITIAL_STATE: CommandPaletteState = {
  isOpen: false,
  query: '',
  filteredCommands: [],
  selectedIndex: -1,
};

/**
 * React hook for command palette behavior
 * Wraps createCommandPalette primitive with React lifecycle management
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
 *   const { ref, state, open, close, setQuery, execute } = useCommandPalette({
 *     commands: [
 *       { id: 'bold', label: 'Bold', action: () => toggleBold() },
 *       { id: 'italic', label: 'Italic', action: () => toggleItalic() },
 *     ],
 *     onOpen: () => console.log('Palette opened'),
 *     onClose: () => console.log('Palette closed'),
 *     onExecute: (cmd) => console.log('Executed:', cmd.id),
 *   });
 *
 *   return (
 *     <div ref={ref} contentEditable>
 *       {state.isOpen && (
 *         <ul>
 *           {state.filteredCommands.map((cmd, i) => (
 *             <li key={cmd.id} data-selected={i === state.selectedIndex}>
 *               {cmd.label}
 *             </li>
 *           ))}
 *         </ul>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useCommandPalette(options: UseCommandPaletteOptions): UseCommandPaletteReturn {
  const { trigger = '/', commands, onOpen, onClose, onSelect, onExecute } = options;

  // Store controller in a ref to persist across renders
  const controllerRef = useRef<CommandPaletteController | null>(null);

  // Store the container element to manage lifecycle with useEffect
  const elementRef = useRef<HTMLElement | null>(null);

  // Store options in refs to avoid recreating controller on option changes
  const triggerRef = useRef(trigger);
  const commandsRef = useRef(commands);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const onSelectRef = useRef(onSelect);
  const onExecuteRef = useRef(onExecute);

  // Track current palette state for React updates
  const [state, setState] = useState<CommandPaletteState>(INITIAL_STATE);

  /**
   * Sync React state from controller
   */
  const syncState = useCallback(() => {
    const controller = controllerRef.current;
    if (controller) {
      setState(controller.getState());
    }
  }, []);

  // Keep refs up to date
  useEffect(() => {
    triggerRef.current = trigger;
  }, [trigger]);

  useEffect(() => {
    commandsRef.current = commands;
    // Update commands in the controller if it exists and sync state
    if (controllerRef.current) {
      controllerRef.current.setCommands(commands);
      syncState();
    }
  }, [commands, syncState]);

  useEffect(() => {
    onOpenRef.current = onOpen;
  }, [onOpen]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    onExecuteRef.current = onExecute;
  }, [onExecute]);

  /**
   * Internal function to create the controller
   * Uses refs to access current options without triggering re-creation
   */
  const createController = useCallback(
    (element: HTMLElement) => {
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
      controllerRef.current = createCommandPalette({
        container: element,
        trigger: triggerRef.current,
        commands: commandsRef.current,
        onOpen: () => {
          syncState();
          onOpenRef.current?.();
        },
        onClose: () => {
          syncState();
          onCloseRef.current?.();
        },
        onSelect: (command: Command) => {
          syncState();
          onSelectRef.current?.(command);
        },
        onExecute: (command: Command) => {
          syncState();
          onExecuteRef.current?.(command);
        },
      });

      // Initialize state from controller
      setState(controllerRef.current.getState());
    },
    [syncState],
  );

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
   * Open the command palette
   */
  const open = useCallback(() => {
    controllerRef.current?.open();
    syncState();
  }, [syncState]);

  /**
   * Close the command palette
   */
  const close = useCallback(() => {
    controllerRef.current?.close();
    syncState();
  }, [syncState]);

  /**
   * Update available commands
   */
  const setCommands = useCallback(
    (newCommands: Command[]) => {
      controllerRef.current?.setCommands(newCommands);
      syncState();
    },
    [syncState],
  );

  /**
   * Update search query
   */
  const setQuery = useCallback(
    (query: string) => {
      controllerRef.current?.setQuery(query);
      syncState();
    },
    [syncState],
  );

  /**
   * Select next command
   */
  const selectNext = useCallback(() => {
    controllerRef.current?.selectNext();
    syncState();
  }, [syncState]);

  /**
   * Select previous command
   */
  const selectPrevious = useCallback(() => {
    controllerRef.current?.selectPrevious();
    syncState();
  }, [syncState]);

  /**
   * Select first command
   */
  const selectFirst = useCallback(() => {
    controllerRef.current?.selectFirst();
    syncState();
  }, [syncState]);

  /**
   * Select last command
   */
  const selectLast = useCallback(() => {
    controllerRef.current?.selectLast();
    syncState();
  }, [syncState]);

  /**
   * Execute currently selected command
   */
  const execute = useCallback(() => {
    controllerRef.current?.execute();
    syncState();
  }, [syncState]);

  return {
    ref,
    state,
    open,
    close,
    setCommands,
    setQuery,
    selectNext,
    selectPrevious,
    selectFirst,
    selectLast,
    execute,
  };
}
