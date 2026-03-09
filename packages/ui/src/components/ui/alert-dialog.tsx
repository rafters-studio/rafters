/**
 * Alert dialog component for destructive or important confirmation actions
 *
 * @cognitive-load 7/10 - Requires immediate decision, interrupts workflow with high stakes
 * @attention-economics Full attention capture: blocks all other interactions until resolved
 * @trust-building Focus defaults to Cancel (safer choice), clear action consequences, escape allows safe exit
 * @accessibility role="alertdialog" for screen readers, focus trap, keyboard dismissal via Escape
 * @semantic-meaning Confirmation patterns: Action=proceed with consequence, Cancel=safe exit without changes
 *
 * @usage-patterns
 * DO: Use for destructive actions (delete, remove, discard)
 * DO: Use for irreversible operations requiring explicit confirmation
 * DO: Make consequences clear in description text
 * DO: Default focus to Cancel for safety
 * NEVER: Routine confirmations, non-destructive actions, information-only dialogs
 *
 * @example
 * ```tsx
 * // Minimal usage - Portal and Overlay are included automatically, no close X button
 * <AlertDialog>
 *   <AlertDialogTrigger>Delete</AlertDialogTrigger>
 *   <AlertDialogContent>
 *     <AlertDialogHeader>
 *       <AlertDialogTitle>Are you sure?</AlertDialogTitle>
 *       <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
 *     </AlertDialogHeader>
 *     <AlertDialogFooter>
 *       <AlertDialogCancel>Cancel</AlertDialogCancel>
 *       <AlertDialogAction>Delete</AlertDialogAction>
 *     </AlertDialogFooter>
 *   </AlertDialogContent>
 * </AlertDialog>
 *
 * // Or with namespace syntax
 * <AlertDialog>
 *   <AlertDialog.Trigger asChild>
 *     <Button variant="destructive">Delete</Button>
 *   </AlertDialog.Trigger>
 *   <AlertDialog.Content>
 *     <AlertDialog.Header>
 *       <AlertDialog.Title>Are you sure?</AlertDialog.Title>
 *       <AlertDialog.Description>This action cannot be undone.</AlertDialog.Description>
 *     </AlertDialog.Header>
 *     <AlertDialog.Footer>
 *       <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
 *       <AlertDialog.Action>Delete</AlertDialog.Action>
 *     </AlertDialog.Footer>
 *   </AlertDialog.Content>
 * </AlertDialog>
 * ```
 */

import * as React from 'react';
import { createPortal } from 'react-dom';
import classy from '../../primitives/classy';
import { onEscapeKeyDown } from '../../primitives/escape-keydown';
import { createFocusTrap, preventBodyScroll } from '../../primitives/focus-trap';
import { getPortalContainer } from '../../primitives/portal';
import { mergeProps } from '../../primitives/slot';

// Context for sharing alert dialog state
interface AlertDialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string;
  titleId: string;
  descriptionId: string;
  cancelRef: React.RefObject<HTMLButtonElement | null>;
}

const AlertDialogContext = React.createContext<AlertDialogContextValue | null>(null);

function useAlertDialogContext() {
  const context = React.useContext(AlertDialogContext);
  if (!context) {
    throw new Error('AlertDialog components must be used within AlertDialog');
  }
  return context;
}

// Context to track if we're inside a portal (to avoid double-wrapping)
const AlertDialogPortalContext = React.createContext<boolean>(false);

function useIsInsidePortal() {
  return React.useContext(AlertDialogPortalContext);
}

// ==================== AlertDialog (Root) ====================

export interface AlertDialogProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AlertDialog({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
}: AlertDialogProps) {
  // Uncontrolled state
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);

  // Reference to cancel button for initial focus
  const cancelRef = React.useRef<HTMLButtonElement | null>(null);

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

  // Generate stable IDs for ARIA relationships
  const id = React.useId();
  const contentId = `alertdialog-content-${id}`;
  const titleId = `alertdialog-title-${id}`;
  const descriptionId = `alertdialog-description-${id}`;

  const contextValue = React.useMemo(
    () => ({
      open,
      onOpenChange: handleOpenChange,
      contentId,
      titleId,
      descriptionId,
      cancelRef,
    }),
    [open, handleOpenChange, contentId, titleId, descriptionId],
  );

  return <AlertDialogContext.Provider value={contextValue}>{children}</AlertDialogContext.Provider>;
}

// ==================== AlertDialogTrigger ====================

export interface AlertDialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function AlertDialogTrigger({ asChild, onClick, ...props }: AlertDialogTriggerProps) {
  const { open, onOpenChange, contentId } = useAlertDialogContext();

  const ariaProps = {
    'aria-expanded': open,
    'aria-controls': contentId,
    'aria-haspopup': 'dialog' as const,
    'data-state': open ? 'open' : 'closed',
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    onOpenChange(!open);
  };

  if (asChild && React.isValidElement(props.children)) {
    const child = props.children as React.ReactElement<Record<string, unknown>>;
    const childProps = (child.props ?? {}) as Record<string, unknown>;
    const merged = mergeProps(
      {
        ...ariaProps,
        onClick: handleClick,
      } as Partial<unknown>,
      childProps,
    );
    return React.cloneElement(child, merged as Partial<Record<string, unknown>>);
  }

  return <button type="button" onClick={handleClick} {...ariaProps} {...props} />;
}

// ==================== AlertDialogPortal ====================

export interface AlertDialogPortalProps {
  children: React.ReactNode;
  container?: HTMLElement | null;
  forceMount?: boolean;
}

export function AlertDialogPortal({ children, container, forceMount }: AlertDialogPortalProps) {
  const { open } = useAlertDialogContext();
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
    <AlertDialogPortalContext.Provider value={true}>{children}</AlertDialogPortalContext.Provider>,
    portalContainer,
  );
}

// ==================== AlertDialogOverlay ====================

export interface AlertDialogOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
  forceMount?: boolean;
}

export function AlertDialogOverlay({
  asChild,
  forceMount,
  className,
  ...props
}: AlertDialogOverlayProps) {
  const { open } = useAlertDialogContext();

  const ariaProps = {
    'data-state': open ? 'open' : 'closed',
    'aria-hidden': 'true' as const,
  };

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
    const child = props.children as React.ReactElement<Record<string, unknown>>;
    const childProps = (child.props ?? {}) as Record<string, unknown>;
    const merged = mergeProps(overlayProps as Partial<unknown>, childProps);
    return React.cloneElement(child, merged as Partial<Record<string, unknown>>);
  }

  return <div {...overlayProps} />;
}

// ==================== AlertDialogContent ====================

export interface AlertDialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
  forceMount?: boolean;
  onOpenAutoFocus?: (event: Event) => void;
  onCloseAutoFocus?: (event: Event) => void;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  /** Container element for the portal. Defaults to document.body. */
  container?: HTMLElement | null;
}

export function AlertDialogContent({
  asChild,
  forceMount,
  onOpenAutoFocus: _onOpenAutoFocus,
  onCloseAutoFocus: _onCloseAutoFocus,
  onEscapeKeyDown: onEscapeKeyDownProp,
  container,
  className,
  children,
  ...props
}: AlertDialogContentProps) {
  const { open, onOpenChange, contentId, titleId, descriptionId, cancelRef } =
    useAlertDialogContext();
  const isInsidePortal = useIsInsidePortal();
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Focus trap - with custom initial focus on cancel button
  React.useEffect(() => {
    if (!open || !contentRef.current) return;

    // Store previously focused element
    const previouslyFocused = document.activeElement as HTMLElement;

    // Focus the cancel button if it exists, otherwise first focusable
    const focusInitial = () => {
      if (cancelRef.current) {
        cancelRef.current.focus();
      } else {
        const focusable = contentRef.current?.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusable && focusable.length > 0) {
          (focusable[0] as HTMLElement).focus();
        }
      }
    };

    // Delay focus slightly to ensure content is rendered
    const timer = setTimeout(focusInitial, 0);

    // Create focus trap
    const cleanup = createFocusTrap(contentRef.current);

    return () => {
      clearTimeout(timer);
      cleanup();
      // Restore focus to previously focused element
      previouslyFocused?.focus();
    };
  }, [open, cancelRef]);

  // Body scroll lock
  React.useEffect(() => {
    if (!open) return;

    const cleanup = preventBodyScroll();
    return cleanup;
  }, [open]);

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

  // Outside click handler - alert dialogs should NOT close on outside click
  // This is intentionally different from Dialog
  // The user must explicitly choose an action (Cancel or Action)

  const ariaProps = {
    role: 'alertdialog' as const,
    'aria-modal': 'true' as const,
    'aria-labelledby': titleId,
    'aria-describedby': descriptionId,
    'data-state': open ? 'open' : 'closed',
  };

  const shouldRender = forceMount || open;

  if (!shouldRender) {
    return null;
  }

  // Render using a centered container
  const containerClass = classy('fixed inset-0 z-depth-modal flex items-center justify-center p-4');

  // Default styles matching shadcn AlertDialogContent
  const innerClass = classy(
    'relative grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg sm:rounded-lg',
    className,
  );

  const innerProps = {
    ref: contentRef,
    id: contentId,
    ...ariaProps,
    className: innerClass,
    ...props,
  } as React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> };

  // The core content to render (NO close button for AlertDialog)
  const renderContent = () => {
    // If asChild, clone the child with inner props
    if (asChild && React.isValidElement(children)) {
      const innerChild = children as React.ReactElement<Record<string, unknown>>;
      const innerChildProps = (innerChild.props ?? {}) as Record<string, unknown>;
      const innerMerged = mergeProps(innerProps as Partial<unknown>, innerChildProps);
      const child = React.cloneElement(innerChild, innerMerged as Partial<Record<string, unknown>>);
      return <div className={containerClass}>{child}</div>;
    }

    return (
      <div className={containerClass}>
        <div {...innerProps}>{children}</div>
      </div>
    );
  };

  // If already inside a portal (user used AlertDialogPortal explicitly), just render content
  if (isInsidePortal) {
    return renderContent();
  }

  // Otherwise, wrap with Portal and Overlay automatically (shadcn-style)
  // Build portal props, only including defined values
  const portalProps: AlertDialogPortalProps = { children: null as unknown as React.ReactNode };
  if (container !== undefined) portalProps.container = container;
  if (forceMount !== undefined) portalProps.forceMount = forceMount;

  // Build overlay props, only including defined values
  const overlayProps: AlertDialogOverlayProps = {};
  if (forceMount !== undefined) overlayProps.forceMount = forceMount;

  return (
    <AlertDialogPortal {...portalProps}>
      <AlertDialogOverlay {...overlayProps} />
      {renderContent()}
    </AlertDialogPortal>
  );
}

// ==================== AlertDialogHeader ====================

export interface AlertDialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function AlertDialogHeader({ className, ...props }: AlertDialogHeaderProps) {
  return (
    <div
      className={classy('flex flex-col space-y-2 text-center sm:text-left', className)}
      {...props}
    />
  );
}

// ==================== AlertDialogFooter ====================

export interface AlertDialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function AlertDialogFooter({ className, ...props }: AlertDialogFooterProps) {
  return (
    <div
      className={classy('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
      {...props}
    />
  );
}

// ==================== AlertDialogTitle ====================

export interface AlertDialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  asChild?: boolean;
}

export function AlertDialogTitle({ asChild, className, ...props }: AlertDialogTitleProps) {
  const { titleId } = useAlertDialogContext();

  const titleProps = {
    id: titleId,
    className: classy('text-lg font-semibold', className),
    ...props,
  };

  if (asChild && React.isValidElement(props.children)) {
    const child = props.children as React.ReactElement<Record<string, unknown>>;
    const childProps = (child.props ?? {}) as Record<string, unknown>;
    const merged = mergeProps(titleProps as Partial<unknown>, childProps);
    return React.cloneElement(child, merged as Partial<Record<string, unknown>>);
  }

  return <h2 {...titleProps} />;
}

// ==================== AlertDialogDescription ====================

export interface AlertDialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  asChild?: boolean;
}

export function AlertDialogDescription({
  asChild,
  className,
  ...props
}: AlertDialogDescriptionProps) {
  const { descriptionId } = useAlertDialogContext();

  const descriptionProps = {
    id: descriptionId,
    className: classy('text-sm text-muted-foreground', className),
    ...props,
  };

  if (asChild && React.isValidElement(props.children)) {
    const child = props.children as React.ReactElement<Record<string, unknown>>;
    const childProps = (child.props ?? {}) as Record<string, unknown>;
    const merged = mergeProps(descriptionProps as Partial<unknown>, childProps);
    return React.cloneElement(child, merged as Partial<Record<string, unknown>>);
  }

  return <p {...descriptionProps} />;
}

// ==================== AlertDialogAction ====================

export interface AlertDialogActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function AlertDialogAction({
  asChild,
  onClick,
  className,
  ...props
}: AlertDialogActionProps) {
  const { onOpenChange } = useAlertDialogContext();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    onOpenChange(false);
  };

  const buttonClass = classy(
    'inline-flex h-10 items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground ring-offset-background transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
    className,
  );

  if (asChild && React.isValidElement(props.children)) {
    const child = props.children as React.ReactElement<Record<string, unknown>>;
    const childProps = (child.props ?? {}) as Record<string, unknown>;
    const merged = mergeProps(
      {
        onClick: handleClick,
        className: buttonClass,
      } as Partial<unknown>,
      childProps,
    );
    return React.cloneElement(child, merged as Partial<Record<string, unknown>>);
  }

  return <button type="button" onClick={handleClick} className={buttonClass} {...props} />;
}

// ==================== AlertDialogCancel ====================

export interface AlertDialogCancelProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function AlertDialogCancel({
  asChild,
  onClick,
  className,
  ...props
}: AlertDialogCancelProps) {
  const { onOpenChange, cancelRef } = useAlertDialogContext();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    onOpenChange(false);
  };

  const buttonClass = classy(
    'mt-2 inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:mt-0',
    className,
  );

  if (asChild && React.isValidElement(props.children)) {
    const child = props.children as React.ReactElement<Record<string, unknown>>;
    const childProps = (child.props ?? {}) as Record<string, unknown>;
    const merged = mergeProps(
      {
        ref: cancelRef,
        onClick: handleClick,
        className: buttonClass,
      } as Partial<unknown>,
      childProps,
    );
    return React.cloneElement(child, merged as Partial<Record<string, unknown>>);
  }

  return (
    <button
      ref={cancelRef}
      type="button"
      onClick={handleClick}
      className={buttonClass}
      {...props}
    />
  );
}

// ==================== Display Names ====================

AlertDialog.displayName = 'AlertDialog';
AlertDialogTrigger.displayName = 'AlertDialogTrigger';
AlertDialogPortal.displayName = 'AlertDialogPortal';
AlertDialogOverlay.displayName = 'AlertDialogOverlay';
AlertDialogContent.displayName = 'AlertDialogContent';
AlertDialogHeader.displayName = 'AlertDialogHeader';
AlertDialogFooter.displayName = 'AlertDialogFooter';
AlertDialogTitle.displayName = 'AlertDialogTitle';
AlertDialogDescription.displayName = 'AlertDialogDescription';
AlertDialogAction.displayName = 'AlertDialogAction';
AlertDialogCancel.displayName = 'AlertDialogCancel';

// ==================== Namespaced Export (shadcn style) ====================

AlertDialog.Trigger = AlertDialogTrigger;
AlertDialog.Portal = AlertDialogPortal;
AlertDialog.Overlay = AlertDialogOverlay;
AlertDialog.Content = AlertDialogContent;
AlertDialog.Header = AlertDialogHeader;
AlertDialog.Footer = AlertDialogFooter;
AlertDialog.Title = AlertDialogTitle;
AlertDialog.Description = AlertDialogDescription;
AlertDialog.Action = AlertDialogAction;
AlertDialog.Cancel = AlertDialogCancel;

// Re-export root as AlertDialogRoot alias for shadcn compatibility
export { AlertDialog as AlertDialogRoot };
