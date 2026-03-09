/**
 * Modal dialog component with focus management and escape patterns
 *
 * @cognitive-load 6/10 - Interrupts user flow, requires decision making
 * @attention-economics Attention capture: modal=full attention, drawer=partial attention, popover=contextual attention
 * @trust-building Clear close mechanisms, confirmation for destructive actions, non-blocking for informational content
 * @accessibility Focus trapping, escape key handling, backdrop dismissal, screen reader announcements
 * @semantic-meaning Usage patterns: modal=blocking workflow, drawer=supplementary, alert=urgent information
 *
 * @usage-patterns
 * DO: Low trust - Quick confirmations, save draft (size=sm, minimal friction)
 * DO: Medium trust - Publish content, moderate consequences (clear context)
 * DO: High trust - Payments, significant impact (detailed explanation)
 * DO: Critical trust - Account deletion, permanent loss (progressive confirmation)
 * NEVER: Routine actions, non-essential interruptions
 *
 * @example
 * ```tsx
 * // Minimal usage - Portal, Overlay, and Close button are included automatically
 * <Dialog>
 *   <DialogTrigger>Open</DialogTrigger>
 *   <DialogContent>
 *     <DialogHeader>
 *       <DialogTitle>Title</DialogTitle>
 *     </DialogHeader>
 *     Content here
 *   </DialogContent>
 * </Dialog>
 *
 * // Or with namespace syntax
 * <Dialog>
 *   <Dialog.Trigger asChild>
 *     <Button>Open Dialog</Button>
 *   </Dialog.Trigger>
 *   <Dialog.Content>
 *     <Dialog.Header>
 *       <Dialog.Title>Dialog Title</Dialog.Title>
 *       <Dialog.Description>Dialog description here.</Dialog.Description>
 *     </Dialog.Header>
 *   </Dialog.Content>
 * </Dialog>
 *
 * // Hide close button if needed
 * <DialogContent showCloseButton={false}>...</DialogContent>
 * ```
 */

import * as React from 'react';
import { createPortal } from 'react-dom';
import classy from '../../primitives/classy';
import {
  getDialogAriaProps,
  getOverlayAriaProps,
  getTriggerAriaProps,
} from '../../primitives/dialog-aria';
import { onEscapeKeyDown } from '../../primitives/escape-keydown';
import { createFocusTrap, preventBodyScroll } from '../../primitives/focus-trap';
import { onPointerDownOutside } from '../../primitives/outside-click';
import { getPortalContainer } from '../../primitives/portal';
import { mergeProps } from '../../primitives/slot';

// Context for sharing dialog state
interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string;
  titleId: string;
  descriptionId: string;
  modal: boolean;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error('Dialog components must be used within Dialog.Root');
  }
  return context;
}

// Context to track if we're inside a portal (to avoid double-wrapping)
const DialogPortalContext = React.createContext<boolean>(false);

function useIsInsidePortal() {
  return React.useContext(DialogPortalContext);
}

// ==================== Dialog.Root ====================

export interface DialogProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
}

export function Dialog({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  modal = true,
}: DialogProps) {
  // Uncontrolled state
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);

  // Determine if controlled
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

  // Generate stable IDs for ARIA relationships using React 19 useId
  const id = React.useId();
  const contentId = `dialog-content-${id}`;
  const titleId = `dialog-title-${id}`;
  const descriptionId = `dialog-description-${id}`;

  const contextValue = React.useMemo(
    () => ({
      open,
      onOpenChange: handleOpenChange,
      contentId,
      titleId,
      descriptionId,
      modal,
    }),
    [open, handleOpenChange, contentId, titleId, descriptionId, modal],
  );

  return <DialogContext.Provider value={contextValue}>{children}</DialogContext.Provider>;
}

// ==================== Dialog.Trigger ====================

export interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function DialogTrigger({ asChild, onClick, children, ...props }: DialogTriggerProps) {
  const { open, onOpenChange, contentId } = useDialogContext();

  const ariaProps = getTriggerAriaProps({ open, controlsId: contentId });

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    onOpenChange(!open);
  };

  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as Record<string, unknown>;
    const mergedProps = mergeProps({ ...ariaProps, onClick: handleClick }, childProps);
    return React.cloneElement(children, mergedProps as React.Attributes);
  }

  return (
    <button type="button" onClick={handleClick} {...ariaProps} {...props}>
      {children}
    </button>
  );
}

// ==================== Dialog.Portal ====================

export interface DialogPortalProps {
  children: React.ReactNode;
  container?: HTMLElement | null;
  forceMount?: boolean;
}

export function DialogPortal({ children, container, forceMount }: DialogPortalProps) {
  const { open } = useDialogContext();
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
    <DialogPortalContext.Provider value={true}>{children}</DialogPortalContext.Provider>,
    portalContainer,
  );
}

// ==================== Dialog.Overlay ====================

export interface DialogOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
  forceMount?: boolean;
}

export function DialogOverlay({ asChild, forceMount, className, ...props }: DialogOverlayProps) {
  const { open } = useDialogContext();

  const ariaProps = getOverlayAriaProps({ open });

  const shouldRender = forceMount || open;

  if (!shouldRender) {
    return null;
  }

  const overlayProps = {
    ...ariaProps,
    className: classy('fixed inset-0 z-depth-overlay bg-foreground/80', className),
    ...props,
  };

  if (asChild && React.isValidElement(props.children)) {
    return React.cloneElement(props.children, overlayProps as Partial<unknown>);
  }

  return <div {...overlayProps} />;
}

// ==================== Dialog.Content ====================

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
  forceMount?: boolean;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  onPointerDownOutside?: (event: PointerEvent | TouchEvent) => void;
  onInteractOutside?: (event: Event) => void;
  /** Whether to show the close button in top-right corner.
   * Defaults to true for shadcn-style usage (without explicit DialogPortal),
   * defaults to false when used with explicit DialogPortal for backward compatibility. */
  showCloseButton?: boolean;
  /** Container element for the portal. Defaults to document.body. */
  container?: HTMLElement | null;
}

export function DialogContent({
  asChild,
  forceMount,
  onEscapeKeyDown: onEscapeKeyDownProp,
  onPointerDownOutside: onPointerDownOutsideProp,
  onInteractOutside,
  showCloseButton,
  container,
  className,
  children,
  ...props
}: DialogContentProps) {
  const { open, onOpenChange, contentId, titleId, descriptionId, modal } = useDialogContext();
  const isInsidePortal = useIsInsidePortal();

  // Default showCloseButton based on usage pattern:
  // - When using shadcn-style (no explicit DialogPortal), default to true
  // - When using explicit DialogPortal wrapper, default to false for backward compatibility
  const shouldShowCloseButton = showCloseButton ?? !isInsidePortal;
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Focus trap
  React.useEffect(() => {
    if (!open || !modal || !contentRef.current) return;

    const cleanup = createFocusTrap(contentRef.current);
    return cleanup;
  }, [open, modal]);

  // Body scroll lock
  React.useEffect(() => {
    if (!open || !modal) return;

    const cleanup = preventBodyScroll();
    return cleanup;
  }, [open, modal]);

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

  // Outside click handler
  React.useEffect(() => {
    if (!open || !modal || !contentRef.current) return;

    const cleanup = onPointerDownOutside(contentRef.current, (event) => {
      onPointerDownOutsideProp?.(event);
      onInteractOutside?.(event as unknown as Event);

      if (!event.defaultPrevented) {
        onOpenChange(false);
      }
    });

    return cleanup;
  }, [open, modal, onOpenChange, onPointerDownOutsideProp, onInteractOutside]);

  const ariaProps = getDialogAriaProps({
    open,
    labelId: titleId,
    descriptionId,
    modal,
  });

  const shouldRender = forceMount || open;

  if (!shouldRender) {
    return null;
  }

  // Close button component (X icon)
  const closeButton = shouldShowCloseButton ? (
    <button
      type="button"
      onClick={() => onOpenChange(false)}
      className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
      aria-label="Close"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
      <span className="sr-only">Close</span>
    </button>
  ) : null;

  // Render using a centered container
  const containerClass = classy('fixed inset-0 z-depth-modal flex items-center justify-center p-4');

  const innerClass = classy(
    'relative w-full max-w-lg rounded-lg border border-card-border bg-card p-6 text-card-foreground shadow-lg',
    className,
  );

  const innerProps = {
    ref: contentRef,
    id: contentId,
    ...ariaProps,
    className: innerClass,
    ...props,
  } as React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> };

  // The core content to render
  const renderContent = () => {
    // If asChild, clone the child with inner props
    if (asChild && React.isValidElement(children)) {
      const child = React.cloneElement(children, innerProps as Partial<unknown>);
      return (
        <div className={containerClass}>
          {child}
          {closeButton}
        </div>
      );
    }

    return (
      <div className={containerClass}>
        <div {...innerProps}>
          {children}
          {closeButton}
        </div>
      </div>
    );
  };

  // If already inside a portal (user used DialogPortal explicitly), just render content
  if (isInsidePortal) {
    return renderContent();
  }

  // Otherwise, wrap with Portal and Overlay automatically (shadcn-style)
  // Build portal props, only including defined values
  const portalProps: Omit<DialogPortalProps, 'children'> = {};
  if (container !== undefined) portalProps.container = container;
  if (forceMount !== undefined) portalProps.forceMount = forceMount;

  // Build overlay props, only including defined values
  const overlayProps: DialogOverlayProps = {};
  if (forceMount !== undefined) overlayProps.forceMount = forceMount;

  return (
    <DialogPortal {...portalProps}>
      <DialogOverlay {...overlayProps} />
      {renderContent()}
    </DialogPortal>
  );
}

// ==================== Dialog.Header ====================

export interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DialogHeader({ className, ...props }: DialogHeaderProps) {
  return (
    <div
      className={classy('flex flex-col space-y-1.5 text-center sm:text-left', className)}
      {...props}
    />
  );
}

// ==================== Dialog.Footer ====================

export interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DialogFooter({ className, ...props }: DialogFooterProps) {
  return (
    <div
      className={classy('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
      {...props}
    />
  );
}

// ==================== Dialog.Title ====================

export interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  asChild?: boolean;
}

export function DialogTitle({ asChild, className, ...props }: DialogTitleProps) {
  const { titleId } = useDialogContext();

  const titleProps = {
    id: titleId,
    className: classy('text-lg font-semibold leading-none tracking-tight', className),
    ...props,
  };

  if (asChild && React.isValidElement(props.children)) {
    return React.cloneElement(props.children, titleProps as Partial<unknown>);
  }

  return <h2 {...titleProps} />;
}

// ==================== Dialog.Description ====================

export interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  asChild?: boolean;
}

export function DialogDescription({ asChild, className, ...props }: DialogDescriptionProps) {
  const { descriptionId } = useDialogContext();

  const descriptionProps = {
    id: descriptionId,
    className: classy('text-sm text-muted-foreground', className),
    ...props,
  };

  if (asChild && React.isValidElement(props.children)) {
    return React.cloneElement(props.children, descriptionProps as Partial<unknown>);
  }

  return <p {...descriptionProps} />;
}

// ==================== Dialog.Close ====================

export interface DialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function DialogClose({ asChild, onClick, children, ...props }: DialogCloseProps) {
  const { onOpenChange } = useDialogContext();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    onOpenChange(false);
  };

  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as Record<string, unknown>;
    const mergedProps = mergeProps({ onClick: handleClick }, childProps);
    return React.cloneElement(children, mergedProps as React.Attributes);
  }

  return (
    <button type="button" onClick={handleClick} {...props}>
      {children}
    </button>
  );
}

// ==================== Display Names ====================

Dialog.displayName = 'Dialog';
DialogTrigger.displayName = 'DialogTrigger';
DialogPortal.displayName = 'DialogPortal';
DialogOverlay.displayName = 'DialogOverlay';
DialogContent.displayName = 'DialogContent';
DialogHeader.displayName = 'DialogHeader';
DialogFooter.displayName = 'DialogFooter';
DialogTitle.displayName = 'DialogTitle';
DialogDescription.displayName = 'DialogDescription';
DialogClose.displayName = 'DialogClose';

// ==================== Namespaced Export (shadcn style) ====================

Dialog.Trigger = DialogTrigger;
Dialog.Portal = DialogPortal;
Dialog.Overlay = DialogOverlay;
Dialog.Content = DialogContent;
Dialog.Header = DialogHeader;
Dialog.Footer = DialogFooter;
Dialog.Title = DialogTitle;
Dialog.Description = DialogDescription;
Dialog.Close = DialogClose;

// Re-export root as DialogRoot alias for shadcn compatibility
export { Dialog as DialogRoot };
