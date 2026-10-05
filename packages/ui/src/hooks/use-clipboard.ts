/**
 * React hook for clipboard operations
 *
 * Wraps the createClipboard primitive with React lifecycle management
 * for automatic cleanup and stable function references.
 *
 * @example
 * ```tsx
 * function Editor() {
 *   const { containerRef, copy, cut, paste } = useClipboard({
 *     customMimeType: 'application/x-rafters-blocks',
 *     onPaste: (data) => console.log('Pasted:', data),
 *     onCopy: (data) => console.log('Copied:', data),
 *     onCut: (data) => console.log('Cut:', data),
 *   });
 *
 *   return (
 *     <div ref={containerRef}>
 *       <button onClick={() => copy({ text: 'Hello' })}>Copy Text</button>
 *       <button onClick={() => cut({ text: 'Hello' })}>Cut Text</button>
 *       <button onClick={async () => console.log(await paste())}>Paste</button>
 *     </div>
 *   );
 * }
 * ```
 */

import { useCallback, useEffect, useRef } from 'react';
import {
  type ClipboardData,
  type ClipboardManager,
  createClipboard,
} from '../primitives/clipboard';

/**
 * Options for the useClipboard hook
 */
export interface UseClipboardOptions {
  /**
   * Custom MIME type for application-specific clipboard data
   * @example 'application/x-rafters-blocks'
   */
  customMimeType?: string;

  /**
   * Callback fired when paste event occurs on the container
   */
  onPaste?: (data: ClipboardData) => void;

  /**
   * Callback fired when copy event occurs on the container
   */
  onCopy?: (data: ClipboardData) => void;

  /**
   * Callback fired when cut event occurs on the container
   */
  onCut?: (data: ClipboardData) => void;
}

/**
 * Return type for the useClipboard hook
 */
export interface UseClipboardReturn {
  /**
   * Ref callback to attach to the container element
   * When element is set, creates the clipboard controller
   * When element is detached (null), cleans up
   */
  containerRef: React.RefCallback<HTMLElement>;

  /**
   * Copy data to the clipboard
   * Uses the modern Clipboard API with fallback for basic text
   */
  copy: (data: ClipboardData) => Promise<void>;

  /**
   * Cut data to the clipboard (copy with cut semantics)
   * The caller is responsible for removing the source content
   */
  cut: (data: ClipboardData) => Promise<void>;

  /**
   * Read/paste data from the clipboard
   * Returns empty ClipboardData if clipboard is empty or permission denied
   */
  paste: () => Promise<ClipboardData>;
}

/**
 * React hook for clipboard operations
 * Wraps createClipboard primitive with React lifecycle management
 *
 * Features:
 * - SSR safe: checks for window before creating controller
 * - StrictMode compatible: handles double-mount cleanup properly
 * - Ref callback pattern: creates/cleans up controller on mount/unmount
 * - Stable function references: uses useCallback for all methods
 *
 * @param options - Configuration options for clipboard behavior
 * @returns Clipboard containerRef and control functions with stable references
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { containerRef, copy, paste } = useClipboard();
 *
 * // With custom MIME type and callbacks
 * const { containerRef, copy, cut, paste } = useClipboard({
 *   customMimeType: 'application/x-my-app',
 *   onPaste: (data) => {
 *     if (data.custom) {
 *       handleCustomPaste(data.custom);
 *     } else if (data.text) {
 *       handleTextPaste(data.text);
 *     }
 *   },
 *   onCopy: (data) => console.log('Copied:', data),
 * });
 * ```
 */
export function useClipboard(options: UseClipboardOptions = {}): UseClipboardReturn {
  const { customMimeType, onPaste, onCopy, onCut } = options;

  // Store controller in a ref to persist across renders
  const controllerRef = useRef<ClipboardManager | null>(null);

  // Store the container element for lifecycle management
  const elementRef = useRef<HTMLElement | null>(null);

  // Store options in refs to avoid recreating controller on option changes
  const customMimeTypeRef = useRef(customMimeType);
  const onPasteRef = useRef(onPaste);
  const onCopyRef = useRef(onCopy);
  const onCutRef = useRef(onCut);

  // Keep refs up to date
  useEffect(() => {
    customMimeTypeRef.current = customMimeType;
  }, [customMimeType]);

  useEffect(() => {
    onPasteRef.current = onPaste;
  }, [onPaste]);

  useEffect(() => {
    onCopyRef.current = onCopy;
  }, [onCopy]);

  useEffect(() => {
    onCutRef.current = onCut;
  }, [onCut]);

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
    controllerRef.current = createClipboard({
      container: element,
      ...(customMimeTypeRef.current ? { customMimeType: customMimeTypeRef.current } : {}),
      onPaste: (data: ClipboardData) => {
        onPasteRef.current?.(data);
      },
      onCopy: (data: ClipboardData) => {
        onCopyRef.current?.(data);
      },
      onCut: (data: ClipboardData) => {
        onCutRef.current?.(data);
      },
    });
  }, []);

  /**
   * Ref callback that manages controller lifecycle
   * Creates controller when element is attached
   * Cleans up when element is detached
   */
  const containerRef = useCallback(
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
      }
    },
    [createController],
  );

  /**
   * Copy data to the clipboard
   */
  const copy = useCallback(async (data: ClipboardData): Promise<void> => {
    if (controllerRef.current) {
      await controllerRef.current.write(data);
    }
  }, []);

  /**
   * Cut data to the clipboard
   * Functionally same as copy - caller handles removing source content
   */
  const cut = useCallback(async (data: ClipboardData): Promise<void> => {
    if (controllerRef.current) {
      await controllerRef.current.write(data);
    }
  }, []);

  /**
   * Paste/read data from the clipboard
   */
  const paste = useCallback(async (): Promise<ClipboardData> => {
    if (controllerRef.current) {
      return controllerRef.current.read();
    }
    return {};
  }, []);

  return {
    containerRef,
    copy,
    cut,
    paste,
  };
}

// Re-export ClipboardData type for convenience
export type { ClipboardData } from '../primitives/clipboard';
