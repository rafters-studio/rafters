/**
 * Popover component for contextual floating content
 *
 * Built on the Float primitive for consistent positioning across all overlay components.
 * Portal is automatically included - no need to wrap content in Popover.Portal.
 *
 * @cognitive-load 4/10 - Contextual content requiring focus but not blocking workflow
 * @attention-economics Partial attention: appears on trigger, dismisses on outside click or escape
 * @trust-building Predictable positioning, easy dismissal, non-blocking interaction
 * @accessibility Focus management, escape key dismissal, outside click closes, screen reader announcements
 * @semantic-meaning Contextual enhancement: additional info, controls, or options related to trigger
 *
 * @usage-patterns
 * DO: Use for contextual actions or information related to trigger element
 * DO: Position intelligently to avoid viewport edges
 * DO: Allow dismissal via escape key and outside click
 * DO: Keep content focused and relevant to trigger
 * NEVER: Critical information, primary navigation, complex multi-step forms
 *
 * @example
 * ```tsx
 * // Minimal usage - Portal is included automatically
 * <Popover>
 *   <Popover.Trigger asChild>
 *     <Button variant="outline">Open</Button>
 *   </Popover.Trigger>
 *   <Popover.Content>
 *     Popover content here
 *   </Popover.Content>
 * </Popover>
 *
 * // Or with explicit Portal (for custom container)
 * <Popover>
 *   <Popover.Trigger asChild>
 *     <Button>Open</Button>
 *   </Popover.Trigger>
 *   <Popover.Portal container={customContainer}>
 *     <Popover.Content>Content</Popover.Content>
 *   </Popover.Portal>
 * </Popover>
 * ```
 */

import * as React from 'react';
import { createPortal } from 'react-dom';
import classy from '../../primitives/classy';
import { Float, useFloatContext } from '../../primitives/float';
import { getPortalContainer } from '../../primitives/portal';
import type { Align, Side } from '../../primitives/types';

// Context to track if we're inside a portal (to avoid double-wrapping)
const PopoverPortalContext = React.createContext<boolean>(false);

function useIsInsidePortal() {
  return React.useContext(PopoverPortalContext);
}

// ==================== Popover (Root) ====================

export interface PopoverProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Popover({ children, open, defaultOpen = false, onOpenChange }: PopoverProps) {
  return (
    <Float.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {children}
    </Float.Root>
  );
}

// ==================== PopoverTrigger ====================

export interface PopoverTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function PopoverTrigger({ asChild, onClick, ...props }: PopoverTriggerProps) {
  const { open, onOpenChange, contentId, anchorRef } = useFloatContext();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    onOpenChange(!open);
  };

  const ariaProps = {
    'aria-expanded': open,
    'aria-controls': contentId,
    'aria-haspopup': 'dialog' as const,
    'data-state': open ? 'open' : 'closed',
  };

  if (asChild && React.isValidElement(props.children)) {
    return React.cloneElement(props.children, {
      ref: anchorRef,
      ...ariaProps,
      onClick: handleClick,
    } as Partial<unknown>);
  }

  return (
    <button
      ref={anchorRef as React.RefObject<HTMLButtonElement>}
      type="button"
      onClick={handleClick}
      {...ariaProps}
      {...props}
    />
  );
}

// ==================== PopoverAnchor ====================

export interface PopoverAnchorProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

export function PopoverAnchor({ asChild, ...props }: PopoverAnchorProps) {
  const { anchorRef } = useFloatContext();

  if (asChild && React.isValidElement(props.children)) {
    return React.cloneElement(props.children, {
      ref: anchorRef,
    } as Partial<unknown>);
  }

  return <div ref={anchorRef as React.RefObject<HTMLDivElement>} {...props} />;
}

// ==================== PopoverPortal ====================

export interface PopoverPortalProps {
  children: React.ReactNode;
  container?: HTMLElement | null;
  forceMount?: boolean;
}

export function PopoverPortal({ children, container, forceMount }: PopoverPortalProps) {
  const { open } = useFloatContext();
  const [mounted, setMounted] = React.useState(false);

  // Wait for client-side hydration
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

  return createPortal(
    <PopoverPortalContext.Provider value={true}>{children}</PopoverPortalContext.Provider>,
    portalContainer,
  );
}

// ==================== PopoverContent ====================

export interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  forceMount?: boolean;
  side?: Side;
  align?: Align;
  sideOffset?: number;
  alignOffset?: number;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  onPointerDownOutside?: (event: PointerEvent | TouchEvent) => void;
  onInteractOutside?: (event: Event) => void;
  /** Container element for the portal. Defaults to document.body. */
  container?: HTMLElement | null;
}

export function PopoverContent({
  forceMount,
  side = 'bottom',
  align = 'center',
  sideOffset = 4,
  alignOffset = 0,
  onEscapeKeyDown,
  onPointerDownOutside,
  onInteractOutside,
  container,
  className,
  children,
  ...props
}: PopoverContentProps) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const { open } = useFloatContext();
  const isInsidePortal = useIsInsidePortal();

  // Focus first element on open
  React.useEffect(() => {
    if (!open || !contentRef.current) return;

    const focusableElements = contentRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    const firstFocusable = focusableElements[0];
    if (firstFocusable) {
      firstFocusable.focus();
    }
  }, [open]);

  // Handle outside interaction (combines pointer and interact)
  const handlePointerDownOutside = React.useCallback(
    (event: PointerEvent | TouchEvent) => {
      onPointerDownOutside?.(event);
      onInteractOutside?.(event as unknown as Event);
    },
    [onPointerDownOutside, onInteractOutside],
  );

  // When inside explicit PopoverPortal, disable Float.Content's internal portal
  // When auto-portaling, let Float.Content handle the portal with the container prop
  const content = (
    <Float.Content
      ref={contentRef}
      forceMount={forceMount}
      side={side}
      align={align}
      sideOffset={sideOffset}
      alignOffset={alignOffset}
      onEscapeKeyDown={onEscapeKeyDown}
      onPointerDownOutside={handlePointerDownOutside}
      disablePortal={isInsidePortal}
      container={!isInsidePortal ? container : undefined}
      role="dialog"
      className={classy(
        'z-depth-popover w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
        'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className,
      )}
      {...props}
    >
      {children}
    </Float.Content>
  );

  return content;
}

// ==================== PopoverClose ====================

export interface PopoverCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function PopoverClose({ asChild, onClick, ...props }: PopoverCloseProps) {
  const { onOpenChange } = useFloatContext();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    onOpenChange(false);
  };

  if (asChild && React.isValidElement(props.children)) {
    return React.cloneElement(props.children, {
      onClick: handleClick,
    } as Partial<unknown>);
  }

  return <button type="button" onClick={handleClick} {...props} />;
}

// ==================== Display Names ====================

Popover.displayName = 'Popover';
PopoverTrigger.displayName = 'PopoverTrigger';
PopoverAnchor.displayName = 'PopoverAnchor';
PopoverPortal.displayName = 'PopoverPortal';
PopoverContent.displayName = 'PopoverContent';
PopoverClose.displayName = 'PopoverClose';

// ==================== Namespaced Export (shadcn style) ====================

Popover.Trigger = PopoverTrigger;
Popover.Anchor = PopoverAnchor;
Popover.Portal = PopoverPortal;
Popover.Content = PopoverContent;
Popover.Close = PopoverClose;

// Re-export root as PopoverRoot alias for shadcn compatibility
export { Popover as PopoverRoot };
