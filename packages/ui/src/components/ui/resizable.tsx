/**
 * Resizable panel component for split-pane layouts with drag handles
 *
 * @cognitive-load 3/10 - Familiar split-pane pattern; drag affordance is intuitive
 * @attention-economics Low attention cost: panels remain visible, resize is reversible
 * @trust-building Immediate visual feedback, keyboard accessible, maintains ratios
 * @accessibility Keyboard resizing via arrow keys, proper focus indicators, ARIA attributes
 * @semantic-meaning Layout control: code editors, settings panels, comparison views
 *
 * @usage-patterns
 * DO: Use for content that benefits from adjustable space allocation
 * DO: Provide sensible default sizes and min/max constraints
 * DO: Persist user preferences for panel sizes
 * DO: Support both horizontal and vertical orientations
 * DO: Make handles keyboard accessible
 * NEVER: Nested resizable panels more than 2 levels deep
 * NEVER: Panels smaller than usable minimums
 * NEVER: Resize handles that are too small to target
 *
 * @example
 * ```tsx
 * <Resizable.PanelGroup direction="horizontal">
 *   <Resizable.Panel defaultSize={25} minSize={10}>
 *     <Sidebar />
 *   </Resizable.Panel>
 *   <Resizable.Handle />
 *   <Resizable.Panel defaultSize={75}>
 *     <MainContent />
 *   </Resizable.Panel>
 * </Resizable.PanelGroup>
 * ```
 */

import * as React from 'react';
import classy from '../../primitives/classy';

// ==================== Types ====================

type Direction = 'horizontal' | 'vertical';

interface PanelData {
  id: string;
  size: number;
  minSize: number;
  maxSize: number;
  collapsible: boolean;
  collapsed: boolean;
  collapsedSize: number;
}

// ==================== Context ====================

interface ResizableContextValue {
  direction: Direction;
  panels: PanelData[];
  registerPanel: (panel: PanelData) => void;
  unregisterPanel: (id: string) => void;
  resizePanels: (handleIndex: number, delta: number) => void;
  collapsePanel: (id: string) => void;
  expandPanel: (id: string) => void;
  getPanelSize: (id: string) => number;
  registerHandle: (id: string) => void;
  unregisterHandle: (id: string) => void;
  getHandleIndex: (id: string) => number;
}

const ResizableContext = React.createContext<ResizableContextValue | null>(null);

function useResizableContext() {
  const context = React.useContext(ResizableContext);
  if (!context) {
    throw new Error('Resizable components must be used within Resizable.PanelGroup');
  }
  return context;
}

// ==================== PanelGroup ====================

export interface ResizablePanelGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: Direction;
  onLayout?: (sizes: number[]) => void;
  autoSaveId?: string;
}

export function ResizablePanelGroup({
  direction = 'horizontal',
  onLayout,
  autoSaveId,
  className,
  children,
  ...props
}: ResizablePanelGroupProps) {
  const [panels, setPanels] = React.useState<PanelData[]>([]);
  const [handleIds, setHandleIds] = React.useState<string[]>([]);

  // Load saved sizes from localStorage
  React.useEffect(() => {
    if (!autoSaveId || typeof window === 'undefined') return;

    const saved = localStorage.getItem(`resizable:${autoSaveId}`);
    if (saved) {
      try {
        const sizes = JSON.parse(saved) as number[];
        setPanels((prev) =>
          prev.map((panel, i) => ({
            ...panel,
            size: sizes[i] ?? panel.size,
          })),
        );
      } catch {
        // Invalid data, ignore
      }
    }
  }, [autoSaveId]);

  // Save sizes to localStorage
  const saveSizes = React.useCallback(
    (newPanels: PanelData[]) => {
      if (!autoSaveId || typeof window === 'undefined') return;
      const sizes = newPanels.map((p) => p.size);
      localStorage.setItem(`resizable:${autoSaveId}`, JSON.stringify(sizes));
    },
    [autoSaveId],
  );

  const registerPanel = React.useCallback((panel: PanelData) => {
    setPanels((prev) => {
      // Don't duplicate
      if (prev.some((p) => p.id === panel.id)) {
        return prev.map((p) => (p.id === panel.id ? panel : p));
      }
      return [...prev, panel];
    });
  }, []);

  const unregisterPanel = React.useCallback((id: string) => {
    setPanels((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const resizePanels = React.useCallback(
    (handleIndex: number, delta: number) => {
      setPanels((prev) => {
        const panelBefore = prev[handleIndex];
        const panelAfter = prev[handleIndex + 1];

        if (!panelBefore || !panelAfter) return prev;

        // Calculate new sizes
        let newSizeBefore = panelBefore.size + delta;
        let newSizeAfter = panelAfter.size - delta;

        // Apply constraints
        if (newSizeBefore < panelBefore.minSize) {
          const diff = panelBefore.minSize - newSizeBefore;
          newSizeBefore = panelBefore.minSize;
          newSizeAfter -= diff;
        }

        if (newSizeAfter < panelAfter.minSize) {
          const diff = panelAfter.minSize - newSizeAfter;
          newSizeAfter = panelAfter.minSize;
          newSizeBefore -= diff;
        }

        if (newSizeBefore > panelBefore.maxSize) {
          newSizeBefore = panelBefore.maxSize;
        }

        if (newSizeAfter > panelAfter.maxSize) {
          newSizeAfter = panelAfter.maxSize;
        }

        const newPanels = prev.map((p, i) => {
          if (i === handleIndex) return { ...p, size: newSizeBefore, collapsed: false };
          if (i === handleIndex + 1) return { ...p, size: newSizeAfter, collapsed: false };
          return p;
        });

        onLayout?.(newPanels.map((p) => p.size));
        saveSizes(newPanels);

        return newPanels;
      });
    },
    [onLayout, saveSizes],
  );

  const collapsePanel = React.useCallback(
    (id: string) => {
      setPanels((prev) => {
        const panelIndex = prev.findIndex((p) => p.id === id);
        if (panelIndex === -1) return prev;

        const panel = prev[panelIndex];
        if (!panel || !panel.collapsible || panel.collapsed) return prev;

        // Find adjacent panel to take the space
        const adjacentIndex = panelIndex === 0 ? 1 : panelIndex - 1;
        const adjacent = prev[adjacentIndex];
        if (!adjacent) return prev;

        const sizeToGive = panel.size - panel.collapsedSize;

        const newPanels = prev.map((p, i) => {
          if (i === panelIndex) return { ...p, size: p.collapsedSize, collapsed: true };
          if (i === adjacentIndex) return { ...p, size: p.size + sizeToGive };
          return p;
        });

        onLayout?.(newPanels.map((p) => p.size));
        saveSizes(newPanels);

        return newPanels;
      });
    },
    [onLayout, saveSizes],
  );

  const expandPanel = React.useCallback(
    (id: string) => {
      setPanels((prev) => {
        const panelIndex = prev.findIndex((p) => p.id === id);
        if (panelIndex === -1) return prev;

        const panel = prev[panelIndex];
        if (!panel || !panel.collapsed) return prev;

        // Find adjacent panel to take space from
        const adjacentIndex = panelIndex === 0 ? 1 : panelIndex - 1;
        const adjacent = prev[adjacentIndex];
        if (!adjacent) return prev;

        // Restore to default size (use minSize as baseline)
        const targetSize = Math.max(panel.minSize, 20); // Reasonable default
        const sizeToTake = targetSize - panel.collapsedSize;

        const newPanels = prev.map((p, i) => {
          if (i === panelIndex) return { ...p, size: targetSize, collapsed: false };
          if (i === adjacentIndex) return { ...p, size: Math.max(p.minSize, p.size - sizeToTake) };
          return p;
        });

        onLayout?.(newPanels.map((p) => p.size));
        saveSizes(newPanels);

        return newPanels;
      });
    },
    [onLayout, saveSizes],
  );

  const registerHandle = React.useCallback((id: string) => {
    setHandleIds((prev) => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
  }, []);

  const unregisterHandle = React.useCallback((id: string) => {
    setHandleIds((prev) => prev.filter((h) => h !== id));
  }, []);

  const getHandleIndex = React.useCallback(
    (id: string) => {
      const index = handleIds.indexOf(id);
      return index === -1 ? 0 : index;
    },
    [handleIds],
  );

  const getPanelSize = React.useCallback(
    (id: string) => {
      const panel = panels.find((p) => p.id === id);
      return panel?.size ?? 0;
    },
    [panels],
  );

  const contextValue = React.useMemo<ResizableContextValue>(
    () => ({
      direction,
      panels,
      registerPanel,
      unregisterPanel,
      resizePanels,
      collapsePanel,
      expandPanel,
      getPanelSize,
      registerHandle,
      unregisterHandle,
      getHandleIndex,
    }),
    [
      direction,
      panels,
      registerPanel,
      unregisterPanel,
      resizePanels,
      collapsePanel,
      expandPanel,
      getPanelSize,
      registerHandle,
      unregisterHandle,
      getHandleIndex,
    ],
  );

  return (
    <ResizableContext.Provider value={contextValue}>
      <div
        data-panel-group=""
        data-direction={direction}
        className={classy(
          'flex h-full w-full',
          direction === 'horizontal' ? 'flex-row' : 'flex-col',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </ResizableContext.Provider>
  );
}

// ==================== Panel ====================

export interface ResizablePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  collapsible?: boolean;
  collapsedSize?: number;
  onCollapse?: () => void;
  onExpand?: () => void;
}

export function ResizablePanel({
  defaultSize = 50,
  minSize = 10,
  maxSize = 100,
  collapsible = false,
  collapsedSize = 0,
  onCollapse,
  onExpand,
  className,
  children,
  ...props
}: ResizablePanelProps) {
  const { registerPanel, unregisterPanel, panels } = useResizableContext();

  const id = React.useId();
  const prevCollapsed = React.useRef<boolean | null>(null);

  // Register panel on mount
  React.useEffect(() => {
    registerPanel({
      id,
      size: defaultSize,
      minSize,
      maxSize,
      collapsible,
      collapsed: false,
      collapsedSize,
    });

    return () => unregisterPanel(id);
  }, [
    id,
    defaultSize,
    minSize,
    maxSize,
    collapsible,
    collapsedSize,
    registerPanel,
    unregisterPanel,
  ]);

  // Get current size
  const panel = panels.find((p) => p.id === id);
  const size = panel?.size ?? defaultSize;
  const collapsed = panel?.collapsed ?? false;

  // Call onCollapse/onExpand callbacks
  React.useEffect(() => {
    if (prevCollapsed.current === null) {
      prevCollapsed.current = collapsed;
      return;
    }

    if (collapsed && !prevCollapsed.current) {
      onCollapse?.();
    } else if (!collapsed && prevCollapsed.current) {
      onExpand?.();
    }

    prevCollapsed.current = collapsed;
  }, [collapsed, onCollapse, onExpand]);

  const style: React.CSSProperties = {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: `${size}%`,
    overflow: 'hidden',
  };

  return (
    <div
      data-panel=""
      data-panel-id={id}
      data-collapsed={collapsed}
      className={classy('relative', className)}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
}

// ==================== Handle ====================

export interface ResizableHandleProps extends React.HTMLAttributes<HTMLDivElement> {
  withHandle?: boolean;
  disabled?: boolean;
}

export function ResizableHandle({
  withHandle = false,
  disabled = false,
  className,
  ...props
}: ResizableHandleProps) {
  const { direction, resizePanels, panels, registerHandle, unregisterHandle, getHandleIndex } =
    useResizableContext();
  const [isDragging, setIsDragging] = React.useState(false);
  const handleRef = React.useRef<HTMLDivElement>(null);
  const handleId = React.useId();

  // Register this handle on mount to get a stable positional index
  React.useEffect(() => {
    registerHandle(handleId);
    return () => unregisterHandle(handleId);
  }, [handleId, registerHandle, unregisterHandle]);

  const handleIndex = getHandleIndex(handleId);

  // Mouse drag handlers
  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      e.preventDefault();
      setIsDragging(true);
    },
    [disabled],
  );

  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = handleRef.current?.parentElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const totalSize = direction === 'horizontal' ? rect.width : rect.height;
      const movement = direction === 'horizontal' ? e.movementX : e.movementY;
      const delta = (movement / totalSize) * 100;

      resizePanels(handleIndex, delta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, direction, handleIndex, resizePanels]);

  // Keyboard handlers
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      const step = e.shiftKey ? 10 : 1;
      let delta = 0;

      if (direction === 'horizontal') {
        if (e.key === 'ArrowLeft') delta = -step;
        if (e.key === 'ArrowRight') delta = step;
      } else {
        if (e.key === 'ArrowUp') delta = -step;
        if (e.key === 'ArrowDown') delta = step;
      }

      if (delta !== 0) {
        e.preventDefault();
        resizePanels(handleIndex, delta);
      }
    },
    [disabled, direction, handleIndex, resizePanels],
  );

  // Get current panel size for ARIA value
  const panelBefore = panels[handleIndex];
  const currentValue = panelBefore?.size ?? 50;

  return (
    <div
      ref={handleRef}
      role="slider"
      aria-orientation={direction === 'horizontal' ? 'horizontal' : 'vertical'}
      aria-valuenow={Math.round(currentValue)}
      aria-valuemin={panelBefore?.minSize ?? 0}
      aria-valuemax={panelBefore?.maxSize ?? 100}
      aria-label="Resize panels"
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      data-panel-resize-handle=""
      data-handle-index={handleIndex}
      data-direction={direction}
      data-disabled={disabled}
      data-dragging={isDragging}
      className={classy(
        'relative flex items-center justify-center bg-border',
        'after:absolute after:inset-y-0 after:left-1/2 after:-translate-x-1/2',
        direction === 'horizontal'
          ? 'w-px cursor-col-resize after:w-1'
          : 'h-px cursor-row-resize after:h-1',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1',
        disabled && 'cursor-not-allowed opacity-50',
        isDragging && 'bg-primary',
        className,
      )}
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {withHandle && (
        <div
          className={classy(
            'z-10 flex items-center justify-center rounded-sm border bg-border',
            direction === 'horizontal' ? 'h-4 w-3' : 'h-3 w-4',
          )}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={classy('size-2.5', direction === 'horizontal' ? 'rotate-90' : '')}
            aria-hidden="true"
          >
            <title>Drag handle</title>
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </div>
      )}
    </div>
  );
}

// ==================== Namespaced Export ====================

export function Resizable() {
  return null;
}

Resizable.PanelGroup = ResizablePanelGroup;
Resizable.Panel = ResizablePanel;
Resizable.Handle = ResizableHandle;
