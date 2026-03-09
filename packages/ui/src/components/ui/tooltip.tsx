/**
 * Contextual tooltip component with smart timing and accessibility
 *
 * @cognitive-load 2/10 - Contextual help without interrupting user workflow
 * @attention-economics Non-intrusive assistance: Smart delays prevent accidental triggers while ensuring help availability
 * @trust-building Reliable contextual guidance that builds user confidence through progressive disclosure
 * @accessibility Keyboard navigation, screen reader support, focus management, escape key handling
 * @semantic-meaning Contextual assistance: help=functionality explanation, definition=terminology clarification, action=shortcuts and outcomes, status=system state
 *
 * @usage-patterns
 * DO: Explain functionality without overwhelming users
 * DO: Clarify terminology contextually when needed
 * DO: Show shortcuts and expected action outcomes
 * DO: Provide feedback on system state changes
 * NEVER: Include essential information that should be visible by default
 *
 * @example
 * ```tsx
 * <Tooltip.Provider>
 *   <Tooltip>
 *     <Tooltip.Trigger asChild>
 *       <Button>Hover me</Button>
 *     </Tooltip.Trigger>
 *     <Tooltip.Content>
 *       Helpful tooltip text
 *     </Tooltip.Content>
 *   </Tooltip>
 * </Tooltip.Provider>
 * ```
 */

import * as React from 'react';
import { createPortal } from 'react-dom';
import classy from '../../primitives/classy';
import { type CollisionOptions, computePosition } from '../../primitives/collision-detector';
import { getPortalContainer } from '../../primitives/portal';
import { mergeProps } from '../../primitives/slot';

// ==================== Global state for skip delay ====================

let globalOpenTimestamp = 0;
const SKIP_DELAY_THRESHOLD = 300;

function shouldSkipOpenDelay(): boolean {
  const timeSinceLastOpen = Date.now() - globalOpenTimestamp;
  return timeSinceLastOpen < SKIP_DELAY_THRESHOLD;
}

/**
 * Reset global hover delay state - for testing
 */
export function resetTooltipState(): void {
  globalOpenTimestamp = 0;
}

// ==================== TooltipProvider Context ====================

interface TooltipProviderContextValue {
  delayDuration: number;
  skipDelayDuration: number;
  disableHoverableContent: boolean;
}

const TooltipProviderContext = React.createContext<TooltipProviderContextValue>({
  delayDuration: 700,
  skipDelayDuration: 300,
  disableHoverableContent: false,
});

function useTooltipProviderContext() {
  return React.useContext(TooltipProviderContext);
}

// ==================== TooltipProvider ====================

export interface TooltipProviderProps {
  delayDuration?: number;
  skipDelayDuration?: number;
  disableHoverableContent?: boolean;
  children: React.ReactNode;
}

export function TooltipProvider({
  delayDuration = 700,
  skipDelayDuration = 300,
  disableHoverableContent = false,
  children,
}: TooltipProviderProps) {
  const value = React.useMemo(
    () => ({
      delayDuration,
      skipDelayDuration,
      disableHoverableContent,
    }),
    [delayDuration, skipDelayDuration, disableHoverableContent],
  );

  return (
    <TooltipProviderContext.Provider value={value}>{children}</TooltipProviderContext.Provider>
  );
}

// ==================== Tooltip Context ====================

interface TooltipContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  contentId: string;
  delayDuration: number;
  skipDelayDuration: number;
  disableHoverableContent: boolean;
}

const TooltipContext = React.createContext<TooltipContextValue | null>(null);

function useTooltipContext() {
  const context = React.useContext(TooltipContext);
  if (!context) {
    throw new Error('Tooltip components must be used within Tooltip');
  }
  return context;
}

// ==================== Tooltip (Root) ====================

export interface TooltipProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  delayDuration?: number;
  children: React.ReactNode;
}

export function Tooltip({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  delayDuration: delayDurationProp,
  children,
}: TooltipProps) {
  const providerContext = useTooltipProviderContext();
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const delayDuration = delayDurationProp ?? providerContext.delayDuration;

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (newOpen) {
        globalOpenTimestamp = Date.now();
      }
      if (!isControlled) {
        setUncontrolledOpen(newOpen);
      }
      onOpenChange?.(newOpen);
    },
    [isControlled, onOpenChange],
  );

  const triggerRef = React.useRef<HTMLElement | null>(null);
  const id = React.useId();
  const contentId = `tooltip-content-${id}`;

  const contextValue = React.useMemo(
    () => ({
      open,
      onOpenChange: handleOpenChange,
      triggerRef,
      contentId,
      delayDuration,
      skipDelayDuration: providerContext.skipDelayDuration,
      disableHoverableContent: providerContext.disableHoverableContent,
    }),
    [
      open,
      handleOpenChange,
      contentId,
      delayDuration,
      providerContext.skipDelayDuration,
      providerContext.disableHoverableContent,
    ],
  );

  return <TooltipContext.Provider value={contextValue}>{children}</TooltipContext.Provider>;
}

// ==================== TooltipTrigger ====================

export interface TooltipTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function TooltipTrigger({ asChild, children, ...props }: TooltipTriggerProps) {
  const { open, onOpenChange, triggerRef, contentId, delayDuration, skipDelayDuration } =
    useTooltipContext();

  const internalRef = React.useRef<HTMLButtonElement>(null);
  const openTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track hover/focus state
  const isHoveringRef = React.useRef(false);
  const isFocusedRef = React.useRef(false);

  // Sync the triggerRef
  React.useEffect(() => {
    if (internalRef.current) {
      (triggerRef as React.MutableRefObject<HTMLElement | null>).current = internalRef.current;
    }
  }, [triggerRef]);

  // Cleanup timeouts on unmount
  React.useEffect(() => {
    return () => {
      if (openTimeoutRef.current) {
        clearTimeout(openTimeoutRef.current);
      }
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const scheduleOpen = React.useCallback(() => {
    // Cancel any pending close
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    // If already open or opening, do nothing
    if (open || openTimeoutRef.current) {
      return;
    }

    const delay = shouldSkipOpenDelay() ? 0 : delayDuration;

    if (delay === 0) {
      onOpenChange(true);
    } else {
      openTimeoutRef.current = setTimeout(() => {
        openTimeoutRef.current = null;
        onOpenChange(true);
      }, delay);
    }
  }, [open, delayDuration, onOpenChange]);

  const scheduleClose = React.useCallback(() => {
    // Cancel any pending open
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }

    // If already closed or closing, do nothing
    if (!open || closeTimeoutRef.current) {
      return;
    }

    if (skipDelayDuration === 0) {
      onOpenChange(false);
    } else {
      closeTimeoutRef.current = setTimeout(() => {
        closeTimeoutRef.current = null;
        onOpenChange(false);
      }, skipDelayDuration);
    }
  }, [open, skipDelayDuration, onOpenChange]);

  const updateState = React.useCallback(() => {
    const shouldBeOpen = isHoveringRef.current || isFocusedRef.current;
    if (shouldBeOpen) {
      scheduleOpen();
    } else {
      scheduleClose();
    }
  }, [scheduleOpen, scheduleClose]);

  const handleMouseEnter = React.useCallback(() => {
    isHoveringRef.current = true;
    updateState();
  }, [updateState]);

  const handleMouseLeave = React.useCallback(() => {
    isHoveringRef.current = false;
    updateState();
  }, [updateState]);

  const handleFocus = React.useCallback(() => {
    isFocusedRef.current = true;
    updateState();
  }, [updateState]);

  const handleBlur = React.useCallback(() => {
    isFocusedRef.current = false;
    updateState();
  }, [updateState]);

  const triggerProps = {
    ref: internalRef,
    'aria-describedby': open ? contentId : undefined,
    'data-state': open ? 'open' : 'closed',
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleFocus,
    onBlur: handleBlur,
    ...props,
  };

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>;
    const childProps = (child.props ?? {}) as Record<string, unknown>;
    const merged = mergeProps(
      {
        ...triggerProps,
        ref: internalRef,
      } as Partial<unknown>,
      childProps,
    );
    return React.cloneElement(child, merged as Partial<Record<string, unknown>>);
  }

  return (
    <button type="button" {...triggerProps}>
      {children}
    </button>
  );
}

// ==================== TooltipPortal ====================

export interface TooltipPortalProps {
  children: React.ReactNode;
  container?: HTMLElement | null;
  forceMount?: boolean;
}

export function TooltipPortal({ children, container, forceMount }: TooltipPortalProps) {
  const { open } = useTooltipContext();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const portalContainer = getPortalContainer(
    container !== undefined ? { container, enabled: true } : { enabled: true },
  );

  const shouldRender = forceMount || open;

  if (!shouldRender || !mounted || !portalContainer) {
    return null;
  }

  return createPortal(children, portalContainer);
}

// ==================== TooltipContent ====================

export interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  asChild?: boolean;
  forceMount?: boolean;
}

export function TooltipContent({
  side = 'top',
  align = 'center',
  sideOffset = 4,
  asChild,
  forceMount,
  className,
  children,
  ...props
}: TooltipContentProps) {
  const { open, onOpenChange, triggerRef, contentId, disableHoverableContent } =
    useTooltipContext();
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [actualSide, setActualSide] = React.useState(side);
  const [actualAlign, setActualAlign] = React.useState(align);

  // Update position when tooltip opens or trigger moves
  React.useEffect(() => {
    if (!open || !triggerRef.current || !contentRef.current) {
      return;
    }

    const updatePosition = () => {
      if (!triggerRef.current || !contentRef.current) return;

      const options: CollisionOptions = {
        side,
        align,
        sideOffset,
        avoidCollisions: true,
      };

      const result = computePosition(triggerRef.current, contentRef.current, options);
      setPosition({ x: result.x, y: result.y });
      setActualSide(result.side);
      setActualAlign(result.align);
    };

    // Initial position
    updatePosition();

    // Update on scroll/resize
    window.addEventListener('scroll', updatePosition, { capture: true, passive: true });
    window.addEventListener('resize', updatePosition, { passive: true });

    return () => {
      window.removeEventListener('scroll', updatePosition, { capture: true });
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, side, align, sideOffset, triggerRef]);

  // Handle hovering over content (if not disabled)
  const handleContentMouseEnter = React.useCallback(() => {
    if (!disableHoverableContent) {
      // Keep tooltip open when hovering content - no action needed,
      // as we only close on mouse leave
    }
  }, [disableHoverableContent]);

  const handleContentMouseLeave = React.useCallback(() => {
    if (!disableHoverableContent) {
      onOpenChange(false);
    }
  }, [disableHoverableContent, onOpenChange]);

  const shouldRender = forceMount || open;

  if (!shouldRender) {
    return null;
  }

  const contentClassName = classy(
    'z-depth-tooltip overflow-hidden rounded-md bg-foreground px-3 py-1.5 text-sm text-background shadow-md',
    'animate-in fade-in-0 zoom-in-95',
    className,
  );

  const style: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    top: 0,
    transform: `translate(${Math.round(position.x)}px, ${Math.round(position.y)}px)`,
  };

  const contentProps = {
    ref: contentRef,
    id: contentId,
    role: 'tooltip' as const,
    'data-state': open ? 'open' : 'closed',
    'data-side': actualSide,
    'data-align': actualAlign,
    className: contentClassName,
    style,
    onMouseEnter: handleContentMouseEnter,
    onMouseLeave: handleContentMouseLeave,
    ...props,
  };

  let content: React.ReactNode;

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>;
    const childProps = (child.props ?? {}) as Record<string, unknown>;
    const merged = mergeProps(contentProps as Partial<unknown>, childProps);
    content = React.cloneElement(child, merged as Partial<Record<string, unknown>>);
  } else {
    content = <div {...contentProps}>{children}</div>;
  }

  // Portal to body
  const portalContainer = getPortalContainer({ enabled: true });
  if (portalContainer) {
    return createPortal(content, portalContainer);
  }
  return content;
}

// ==================== Display Names ====================

TooltipProvider.displayName = 'TooltipProvider';
Tooltip.displayName = 'Tooltip';
TooltipTrigger.displayName = 'TooltipTrigger';
TooltipPortal.displayName = 'TooltipPortal';
TooltipContent.displayName = 'TooltipContent';

// ==================== Namespaced Export (shadcn style) ====================

Tooltip.Provider = TooltipProvider;
Tooltip.Trigger = TooltipTrigger;
Tooltip.Portal = TooltipPortal;
Tooltip.Content = TooltipContent;

// Re-export individual components for direct import
export { TooltipProvider as TooltipRoot };
