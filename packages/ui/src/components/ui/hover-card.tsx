/**
 * HoverCard component for rich preview content on hover
 *
 * @cognitive-load 3/10 - Contextual preview that supplements rather than replaces visible content
 * @attention-economics Glanceable enrichment: provides additional context without requiring action
 * @trust-building Predictable reveal timing, stable positioning, non-disruptive appearance
 * @accessibility Focus management, keyboard triggerable via focus, escape to dismiss, role="dialog" with aria-describedby
 * @semantic-meaning Rich preview: profile cards, link previews, contextual details that enhance understanding
 *
 * @usage-patterns
 * DO: Show supplementary information like user profiles, link previews, or contextual details
 * DO: Use appropriate delays to prevent accidental triggers (openDelay >= 500ms recommended)
 * DO: Keep content focused and scannable - users glance, not read
 * DO: Position intelligently to avoid viewport edges
 * NEVER: Essential information that should always be visible
 * NEVER: Interactive forms or multi-step workflows (use Popover instead)
 * NEVER: Time-sensitive content that disappears before user can read it
 *
 * @example
 * ```tsx
 * <HoverCard>
 *   <HoverCard.Trigger asChild>
 *     <a href="/user/john">@john</a>
 *   </HoverCard.Trigger>
 *   <HoverCard.Content>
 *     <div className="flex gap-4">
 *       <Avatar src="/john.jpg" />
 *       <div>
 *         <h4>John Doe</h4>
 *         <p>Software Engineer</p>
 *       </div>
 *     </div>
 *   </HoverCard.Content>
 * </HoverCard>
 * ```
 */

import * as React from 'react';
import { createPortal } from 'react-dom';
import classy from '../../primitives/classy';
import { type CollisionOptions, computePosition } from '../../primitives/collision-detector';
import { onEscapeKeyDown } from '../../primitives/escape-keydown';
import { getPortalContainer } from '../../primitives/portal';
import { mergeProps } from '../../primitives/slot';
import type { Align, Side } from '../../primitives/types';
import { hoverCardContentClasses } from './hover-card.classes';

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
export function resetHoverCardState(): void {
  globalOpenTimestamp = 0;
}

// ==================== HoverCard Context ====================

interface HoverCardContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  contentId: string;
  openDelay: number;
  closeDelay: number;
  // Shared hover state management
  isHoveringTrigger: React.MutableRefObject<boolean>;
  isHoveringContent: React.MutableRefObject<boolean>;
  isFocused: React.MutableRefObject<boolean>;
  openTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  closeTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
}

const HoverCardContext = React.createContext<HoverCardContextValue | null>(null);

function useHoverCardContext(): HoverCardContextValue {
  const context = React.useContext(HoverCardContext);
  if (!context) {
    throw new Error('HoverCard components must be used within HoverCard');
  }
  return context;
}

// ==================== HoverCard (Root) ====================

export interface HoverCardProps {
  /**
   * Controlled open state
   */
  open?: boolean;

  /**
   * Default open state for uncontrolled usage
   */
  defaultOpen?: boolean;

  /**
   * Callback when open state changes
   */
  onOpenChange?: (open: boolean) => void;

  /**
   * Delay in ms before showing content
   * @default 700
   */
  openDelay?: number;

  /**
   * Delay in ms before hiding content after mouse leaves
   * @default 300
   */
  closeDelay?: number;

  children: React.ReactNode;
}

export function HoverCard({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  openDelay = 700,
  closeDelay = 300,
  children,
}: HoverCardProps): React.JSX.Element {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

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
  const contentId = `hover-card-content-${id}`;

  // Shared hover state refs
  const isHoveringTrigger = React.useRef(false);
  const isHoveringContent = React.useRef(false);
  const isFocused = React.useRef(false);
  const openTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const contextValue = React.useMemo(
    () => ({
      open,
      onOpenChange: handleOpenChange,
      triggerRef,
      contentId,
      openDelay,
      closeDelay,
      isHoveringTrigger,
      isHoveringContent,
      isFocused,
      openTimeoutRef,
      closeTimeoutRef,
    }),
    [open, handleOpenChange, contentId, openDelay, closeDelay],
  );

  return <HoverCardContext.Provider value={contextValue}>{children}</HoverCardContext.Provider>;
}

// ==================== HoverCardTrigger ====================

export interface HoverCardTriggerProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * Render as child element instead of default anchor
   */
  asChild?: boolean;
}

export function HoverCardTrigger({
  asChild,
  children,
  ...props
}: HoverCardTriggerProps): React.JSX.Element {
  const {
    open,
    onOpenChange,
    triggerRef,
    contentId,
    openDelay,
    closeDelay,
    isHoveringTrigger,
    isHoveringContent,
    isFocused,
    openTimeoutRef,
    closeTimeoutRef,
  } = useHoverCardContext();

  const internalRef = React.useRef<HTMLAnchorElement>(null);

  // Sync the triggerRef
  React.useEffect(() => {
    if (internalRef.current) {
      (triggerRef as React.MutableRefObject<HTMLElement | null>).current = internalRef.current;
    }
  }, [triggerRef]);

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

    const delay = shouldSkipOpenDelay() ? 0 : openDelay;

    if (delay === 0) {
      onOpenChange(true);
    } else {
      openTimeoutRef.current = setTimeout(() => {
        openTimeoutRef.current = null;
        onOpenChange(true);
      }, delay);
    }
  }, [open, openDelay, onOpenChange, openTimeoutRef, closeTimeoutRef]);

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

    if (closeDelay === 0) {
      onOpenChange(false);
    } else {
      closeTimeoutRef.current = setTimeout(() => {
        closeTimeoutRef.current = null;
        // Only close if still not hovering anything
        if (!isHoveringTrigger.current && !isHoveringContent.current && !isFocused.current) {
          onOpenChange(false);
        }
      }, closeDelay);
    }
  }, [
    open,
    closeDelay,
    onOpenChange,
    openTimeoutRef,
    closeTimeoutRef,
    isHoveringTrigger,
    isHoveringContent,
    isFocused,
  ]);

  const updateState = React.useCallback(() => {
    const shouldBeOpen =
      isHoveringTrigger.current || isHoveringContent.current || isFocused.current;
    if (shouldBeOpen) {
      scheduleOpen();
    } else {
      scheduleClose();
    }
  }, [scheduleOpen, scheduleClose, isHoveringTrigger, isHoveringContent, isFocused]);

  const handleMouseEnter = React.useCallback(() => {
    isHoveringTrigger.current = true;
    updateState();
  }, [updateState, isHoveringTrigger]);

  const handleMouseLeave = React.useCallback(() => {
    isHoveringTrigger.current = false;
    updateState();
  }, [updateState, isHoveringTrigger]);

  const handleFocus = React.useCallback(() => {
    isFocused.current = true;
    updateState();
  }, [updateState, isFocused]);

  const handleBlur = React.useCallback(() => {
    isFocused.current = false;
    updateState();
  }, [updateState, isFocused]);

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

  return <a {...triggerProps}>{children}</a>;
}

// ==================== HoverCardPortal ====================

export interface HoverCardPortalProps {
  children: React.ReactNode;
  /**
   * Custom container for the portal
   */
  container?: HTMLElement | null;
  /**
   * Force mount the portal content even when closed
   */
  forceMount?: boolean;
}

export function HoverCardPortal({
  children,
  container,
  forceMount,
}: HoverCardPortalProps): React.ReactNode {
  const { open } = useHoverCardContext();
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

// ==================== HoverCardContent ====================

export interface HoverCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Preferred side for positioning
   * @default 'bottom'
   */
  side?: Side;

  /**
   * Alignment along the side
   * @default 'center'
   */
  align?: Align;

  /**
   * Offset from the trigger element
   * @default 4
   */
  sideOffset?: number;

  /**
   * Offset along the alignment axis
   * @default 0
   */
  alignOffset?: number;

  /**
   * Render as child element
   */
  asChild?: boolean;

  /**
   * Force mount even when closed
   */
  forceMount?: boolean;

  /**
   * Handler for escape key press
   */
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
}

export function HoverCardContent({
  side = 'bottom',
  align = 'center',
  sideOffset = 4,
  alignOffset = 0,
  asChild,
  forceMount,
  className,
  children,
  onEscapeKeyDown: onEscapeKeyDownProp,
  ...props
}: HoverCardContentProps): React.JSX.Element | null {
  const {
    open,
    onOpenChange,
    triggerRef,
    contentId,
    closeDelay,
    isHoveringTrigger,
    isHoveringContent,
    isFocused,
    openTimeoutRef,
    closeTimeoutRef,
  } = useHoverCardContext();
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [actualSide, setActualSide] = React.useState(side);
  const [actualAlign, setActualAlign] = React.useState(align);

  // Update position when hover card opens or trigger moves
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
        alignOffset,
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
  }, [open, side, align, sideOffset, alignOffset, triggerRef]);

  // Escape key handler
  React.useEffect(() => {
    if (!open) return;

    const cleanup = onEscapeKeyDown((event) => {
      onEscapeKeyDownProp?.(event);
      if (!event.defaultPrevented) {
        onOpenChange(false);
      }
    });

    return cleanup;
  }, [open, onOpenChange, onEscapeKeyDownProp]);

  // Handle hovering over content - keeps card open
  const handleContentMouseEnter = React.useCallback(() => {
    isHoveringContent.current = true;
    // Cancel any pending close
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, [isHoveringContent, closeTimeoutRef]);

  const handleContentMouseLeave = React.useCallback(() => {
    isHoveringContent.current = false;
    // Cancel any pending open
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
    // Schedule close with delay
    if (!open || closeTimeoutRef.current) {
      return;
    }
    if (closeDelay === 0) {
      // Only close if not hovering trigger or focused
      if (!isHoveringTrigger.current && !isFocused.current) {
        onOpenChange(false);
      }
    } else {
      closeTimeoutRef.current = setTimeout(() => {
        closeTimeoutRef.current = null;
        // Only close if still not hovering anything
        if (!isHoveringTrigger.current && !isHoveringContent.current && !isFocused.current) {
          onOpenChange(false);
        }
      }, closeDelay);
    }
  }, [
    closeDelay,
    onOpenChange,
    isHoveringContent,
    isHoveringTrigger,
    isFocused,
    openTimeoutRef,
    closeTimeoutRef,
    open,
  ]);

  const shouldRender = forceMount || open;

  if (!shouldRender) {
    return null;
  }

  const contentClassName = classy(hoverCardContentClasses, className);

  const style: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    top: 0,
    transform: `translate(${Math.round(position.x)}px, ${Math.round(position.y)}px)`,
  };

  const contentProps = {
    ref: contentRef,
    id: contentId,
    role: 'dialog' as const,
    'data-state': open ? 'open' : 'closed',
    'data-side': actualSide,
    'data-align': actualAlign,
    className: contentClassName,
    style,
    onMouseEnter: handleContentMouseEnter,
    onMouseLeave: handleContentMouseLeave,
    ...props,
  };

  let content: React.ReactElement;

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>;
    const childProps = (child.props ?? {}) as Record<string, unknown>;
    const merged = mergeProps(contentProps as Partial<unknown>, childProps);
    content = React.cloneElement(child, merged as Partial<Record<string, unknown>>);
  } else {
    content = <div {...contentProps}>{children}</div>;
  }

  const portalContainer = getPortalContainer({ enabled: true });
  if (portalContainer) {
    return createPortal(content, portalContainer);
  }
  return content;
}

// ==================== Namespaced Export (shadcn style) ====================

HoverCard.Trigger = HoverCardTrigger;
HoverCard.Portal = HoverCardPortal;
HoverCard.Content = HoverCardContent;

// Re-export individual components for direct import
export { HoverCard as HoverCardRoot };
