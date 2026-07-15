/**
 * Float primitive
 * Composable floating content positioning with portal, collision detection,
 * and dismissal handling.
 *
 * Consolidates positioning logic used across Popover, Select, DropdownMenu,
 * Tooltip, HoverCard, Combobox, etc.
 *
 * @example
 * ```tsx
 * <Float.Root open={open} onOpenChange={setOpen}>
 *   <Float.Anchor asChild>
 *     <button>Trigger</button>
 *   </Float.Anchor>
 *   <Float.Content side="bottom" align="center">
 *     Floating content
 *   </Float.Content>
 * </Float.Root>
 * ```
 */

import * as React from 'react';
import { createPortal } from 'react-dom';

import { type CollisionOptions, computePosition } from './collision-detector';
import { onEscapeKeyDown } from './escape-keydown';
import { onPointerDownOutside } from './outside-click';
import { getPortalContainer } from './portal';
import type { Align, Side } from './types';

// ==================== Types ====================

export interface FloatContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  contentId: string;
  triggerId: string;
}

export interface FloatRootProps {
  children: React.ReactNode;
  /** Controlled open state */
  open?: boolean | undefined;
  /** Default open state for uncontrolled usage */
  defaultOpen?: boolean;
  /** Callback when open state changes */
  onOpenChange?: ((open: boolean) => void) | undefined;
}

export interface FloatAnchorProps {
  children: React.ReactNode;
  /** Render as child element instead of wrapper */
  asChild?: boolean;
}

export interface FloatContentProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'content'> {
  children: React.ReactNode;
  /** Render as child element instead of wrapper */
  asChild?: boolean | undefined;
  /** Keep mounted when closed (for animations) */
  forceMount?: boolean | undefined;
  /** Preferred side relative to anchor */
  side?: Side | undefined;
  /** Alignment along the side axis */
  align?: Align | undefined;
  /** Offset from anchor along side axis (px) */
  sideOffset?: number | undefined;
  /** Offset along alignment axis (px) */
  alignOffset?: number | undefined;
  /** Whether to flip on collision */
  avoidCollisions?: boolean | undefined;
  /** Padding from viewport edges (px) */
  collisionPadding?:
    | number
    | { top?: number; right?: number; bottom?: number; left?: number }
    | undefined;
  /** Custom container for portal */
  container?: HTMLElement | null | undefined;
  /** Disable portal rendering */
  disablePortal?: boolean | undefined;
  /** Called when escape key is pressed */
  onEscapeKeyDown?: ((event: KeyboardEvent) => void) | undefined;
  /** Called when pointer down outside */
  onPointerDownOutside?: ((event: PointerEvent | TouchEvent) => void) | undefined;
  /** Called when focus moves outside */
  onFocusOutside?: ((event: FocusEvent) => void) | undefined;
  /** Disable outside click dismissal */
  disableOutsideClick?: boolean | undefined;
  /** Disable escape key dismissal */
  disableEscapeKey?: boolean | undefined;
}

export interface FloatArrowProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Width of arrow (px) */
  width?: number;
  /** Height of arrow (px) */
  height?: number;
}

// ==================== Context ====================

const FloatContext = React.createContext<FloatContextValue | null>(null);

function useFloatContext() {
  const context = React.useContext(FloatContext);
  if (!context) {
    throw new Error('Float components must be used within Float.Root');
  }
  return context;
}

// ==================== Float.Root ====================

/**
 * Anchor-positioning root: the container for anything that floats near a trigger.
 *
 * Float.Root holds open state (controlled via `open`/`onOpenChange`, or
 * uncontrolled via `defaultOpen`) and the anchor ref. Float.Anchor marks the
 * element to position against; Float.Content renders the floating panel with
 * side/align/collision handling; Float.Arrow points at the anchor.
 *
 * This is the positioning substrate for popover, tooltip, hover-card, and the
 * menu family. It positions; it does not dismiss, trap focus, or lock scroll --
 * compose dismiss/focus primitives for that.
 */
function FloatRoot({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
}: FloatRootProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const anchorRef = React.useRef<HTMLElement | null>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(newOpen);
      }
      onOpenChange?.(newOpen);
    },
    [isControlled, onOpenChange],
  );

  const contentId = React.useId();
  const triggerId = React.useId();

  const contextValue = React.useMemo<FloatContextValue>(
    () => ({
      open,
      onOpenChange: handleOpenChange,
      anchorRef,
      contentId,
      triggerId,
    }),
    [open, handleOpenChange, contentId, triggerId],
  );

  return <FloatContext.Provider value={contextValue}>{children}</FloatContext.Provider>;
}

FloatRoot.displayName = 'Float.Root';

// ==================== Float.Anchor ====================

function FloatAnchor({ children, asChild }: FloatAnchorProps) {
  const { anchorRef, triggerId, contentId, open } = useFloatContext();

  const ref = React.useCallback(
    (node: HTMLElement | null) => {
      anchorRef.current = node;
    },
    [anchorRef],
  );

  const childProps = {
    ref,
    id: triggerId,
    'aria-controls': open ? contentId : undefined,
    'aria-expanded': open,
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, childProps as Partial<unknown>);
  }

  return (
    <div {...childProps} style={{ display: 'inline-block' }}>
      {children}
    </div>
  );
}

FloatAnchor.displayName = 'Float.Anchor';

// ==================== Float.Content ====================

interface PositionState {
  x: number;
  y: number;
  side: Side;
  align: Align;
}

const FloatContent = React.forwardRef<HTMLDivElement, FloatContentProps>(function FloatContent(
  {
    children,
    asChild,
    forceMount,
    side = 'bottom',
    align = 'center',
    sideOffset = 4,
    alignOffset = 0,
    avoidCollisions = true,
    collisionPadding = 10,
    container,
    disablePortal = false,
    onEscapeKeyDown: onEscapeKeyDownProp,
    onPointerDownOutside: onPointerDownOutsideProp,
    onFocusOutside: _onFocusOutside,
    disableOutsideClick = false,
    disableEscapeKey = false,
    className,
    style,
    ...props
  },
  forwardedRef,
) {
  const { open, onOpenChange, anchorRef, contentId, triggerId } = useFloatContext();
  const internalRef = React.useRef<HTMLDivElement>(null);
  const contentRef = forwardedRef ? (forwardedRef as React.RefObject<HTMLDivElement>) : internalRef;
  const [position, setPosition] = React.useState<PositionState>({
    x: 0,
    y: 0,
    side,
    align,
  });

  // Position the floating content
  React.useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const anchor = anchorRef.current;
      const floating = contentRef.current;

      if (!anchor || !floating) return;

      const collisionOptions: CollisionOptions = {
        side,
        align,
        sideOffset,
        alignOffset,
        avoidCollisions,
        collisionPadding,
      };

      const result = computePosition(anchor, floating, collisionOptions);

      setPosition({
        x: result.x,
        y: result.y,
        side: result.side,
        align: result.align,
      });
    };

    // Initial position after render
    const frame = requestAnimationFrame(updatePosition);

    // Update on scroll and resize
    window.addEventListener('scroll', updatePosition, { capture: true, passive: true });
    window.addEventListener('resize', updatePosition, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', updatePosition, { capture: true });
      window.removeEventListener('resize', updatePosition);
    };
  }, [
    open,
    side,
    align,
    sideOffset,
    alignOffset,
    avoidCollisions,
    collisionPadding,
    anchorRef,
    contentRef,
  ]);

  // Escape key handler
  React.useEffect(() => {
    if (!open || disableEscapeKey) return;

    const cleanup = onEscapeKeyDown((event) => {
      onEscapeKeyDownProp?.(event);
      if (!event.defaultPrevented) {
        onOpenChange(false);
      }
    });

    return cleanup;
  }, [open, onOpenChange, onEscapeKeyDownProp, disableEscapeKey]);

  // Outside click handler
  React.useEffect(() => {
    if (!open || disableOutsideClick || !contentRef.current) return;

    const cleanup = onPointerDownOutside(contentRef.current, (event) => {
      // Don't close if clicking the anchor
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) {
        return;
      }

      onPointerDownOutsideProp?.(event);

      if (!event.defaultPrevented) {
        onOpenChange(false);
      }
    });

    return cleanup;
  }, [open, onOpenChange, onPointerDownOutsideProp, disableOutsideClick, anchorRef, contentRef]);

  // Determine if should render
  const shouldRender = forceMount || open;

  if (!shouldRender) {
    return null;
  }

  const contentStyle: React.CSSProperties = {
    ...style,
    position: 'fixed',
    left: 0,
    top: 0,
    transform: `translate(${Math.round(position.x)}px, ${Math.round(position.y)}px)`,
    // Prevent layout shift during positioning
    willChange: 'transform',
  };

  const contentProps = {
    ref: contentRef,
    id: contentId,
    'aria-labelledby': triggerId,
    'data-state': open ? 'open' : 'closed',
    'data-side': position.side,
    'data-align': position.align,
    className,
    style: contentStyle,
    ...props,
  };

  const content =
    asChild && React.isValidElement(children) ? (
      React.cloneElement(children, contentProps as Partial<unknown>)
    ) : (
      <div {...contentProps}>{children}</div>
    );

  // Portal to container or body
  if (!disablePortal) {
    const portalContainer = getPortalContainer({
      container: container ?? null,
      enabled: true,
    });

    if (portalContainer) {
      return createPortal(content, portalContainer);
    }
  }

  return content;
});

FloatContent.displayName = 'Float.Content';

// ==================== Float.Arrow ====================

function FloatArrow({ width = 10, height = 5, className, style, ...props }: FloatArrowProps) {
  // Arrow positioning is handled by parent via CSS or data attributes
  // This component provides the visual arrow element

  const arrowStyle: React.CSSProperties = {
    ...style,
    width,
    height,
    position: 'absolute',
  };

  return (
    <div className={className} style={arrowStyle} aria-hidden="true" {...props}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        fill="currentColor"
        style={{ display: 'block' }}
        aria-hidden="true"
      >
        <polygon points={`0,${height} ${width / 2},0 ${width},${height}`} />
      </svg>
    </div>
  );
}

FloatArrow.displayName = 'Float.Arrow';

// ==================== Float.Close ====================

export interface FloatCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  asChild?: boolean;
}

function FloatClose({ children, asChild, ...props }: FloatCloseProps) {
  const { onOpenChange } = useFloatContext();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    props.onClick?.(event);
    if (!event.defaultPrevented) {
      onOpenChange(false);
    }
  };

  const buttonProps = {
    type: 'button' as const,
    onClick: handleClick,
    ...props,
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, buttonProps as Partial<unknown>);
  }

  return <button {...buttonProps}>{children}</button>;
}

FloatClose.displayName = 'Float.Close';

// ==================== Export ====================

export const Float = {
  Root: FloatRoot,
  Anchor: FloatAnchor,
  Content: FloatContent,
  Arrow: FloatArrow,
  Close: FloatClose,
};

// Also export individual components for flexibility
export { FloatRoot, FloatAnchor, FloatContent, FloatArrow, FloatClose };

// Export context hook for advanced usage
export { useFloatContext };
