/**
 * Sheet component for slide-in side panel overlays
 *
 * @cognitive-load 5/10 - Partial page overlay requiring focused attention
 * @attention-economics Partial attention capture: main content dimmed but visible, slide animation indicates temporary state
 * @trust-building Clear slide direction, easy dismissal via overlay click or escape, preserves main content context
 * @accessibility Focus trap within sheet, escape key closes, proper ARIA dialog role
 * @semantic-meaning Supplementary content: navigation, filters, forms that don't warrant full page navigation
 *
 * @usage-patterns
 * DO: Use for mobile navigation, filters, or secondary forms
 * DO: Choose side based on content relationship (left=nav, right=details)
 * DO: Provide clear close mechanism
 * DO: Keep content scoped to single purpose
 * NEVER: Primary content, complex multi-step workflows, content requiring full attention
 *
 * @example
 * ```tsx
 * // Minimal usage - Portal, Overlay, and Close button are included automatically
 * <Sheet>
 *   <SheetTrigger>Open</SheetTrigger>
 *   <SheetContent side="right">
 *     <SheetHeader>
 *       <SheetTitle>Title</SheetTitle>
 *       <SheetDescription>Description</SheetDescription>
 *     </SheetHeader>
 *     Content here
 *   </SheetContent>
 * </Sheet>
 *
 * // Or with namespace syntax
 * <Sheet>
 *   <Sheet.Trigger asChild>
 *     <Button variant="outline">Open</Button>
 *   </Sheet.Trigger>
 *   <Sheet.Content side="right">
 *     <Sheet.Header>
 *       <Sheet.Title>Sheet Title</Sheet.Title>
 *     </Sheet.Header>
 *     Sheet content here
 *   </Sheet.Content>
 * </Sheet>
 *
 * // Hide close button if needed
 * <SheetContent showCloseButton={false}>...</SheetContent>
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

// Context for sharing sheet state
interface SheetContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string;
  titleId: string;
  descriptionId: string;
  modal: boolean;
}

const SheetContext = React.createContext<SheetContextValue | null>(null);

function useSheetContext() {
  const context = React.useContext(SheetContext);
  if (!context) {
    throw new Error('Sheet components must be used within Sheet.Root');
  }
  return context;
}

// Context to track if we're inside a portal (to avoid double-wrapping)
const SheetPortalContext = React.createContext<boolean>(false);

function useIsInsidePortal() {
  return React.useContext(SheetPortalContext);
}

// ==================== Sheet.Root ====================

export interface SheetProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
}

export function Sheet({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  modal = true,
}: SheetProps) {
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
  const contentId = `sheet-content-${id}`;
  const titleId = `sheet-title-${id}`;
  const descriptionId = `sheet-description-${id}`;

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

  return <SheetContext.Provider value={contextValue}>{children}</SheetContext.Provider>;
}

// ==================== Sheet.Trigger ====================

export interface SheetTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function SheetTrigger({ asChild, onClick, ...props }: SheetTriggerProps) {
  const { open, onOpenChange, contentId } = useSheetContext();

  const ariaProps = getTriggerAriaProps({ open, controlsId: contentId });

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    onOpenChange(!open);
  };

  if (asChild && React.isValidElement(props.children)) {
    return React.cloneElement(props.children, {
      ...ariaProps,
      onClick: handleClick,
    } as Partial<unknown>);
  }

  return <button type="button" onClick={handleClick} {...ariaProps} {...props} />;
}

// ==================== Sheet.Portal ====================

export interface SheetPortalProps {
  children: React.ReactNode;
  container?: HTMLElement | null;
  forceMount?: boolean;
}

export function SheetPortal({ children, container, forceMount }: SheetPortalProps) {
  const { open } = useSheetContext();
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
    <SheetPortalContext.Provider value={true}>{children}</SheetPortalContext.Provider>,
    portalContainer,
  );
}

// ==================== Sheet.Overlay ====================

export interface SheetOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
  forceMount?: boolean;
}

export function SheetOverlay({ asChild, forceMount, className, ...props }: SheetOverlayProps) {
  const { open } = useSheetContext();

  const ariaProps = getOverlayAriaProps({ open });

  const shouldRender = forceMount || open;

  if (!shouldRender) {
    return null;
  }

  const overlayProps = {
    ...ariaProps,
    className: classy(
      'fixed inset-0 z-depth-overlay bg-foreground/80',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    ),
    ...props,
  };

  if (asChild && React.isValidElement(props.children)) {
    return React.cloneElement(props.children, overlayProps as Partial<unknown>);
  }

  return <div {...overlayProps} />;
}

// ==================== Sheet.Content ====================

export interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: 'top' | 'right' | 'bottom' | 'left';
  asChild?: boolean;
  forceMount?: boolean;
  onOpenAutoFocus?: (event: Event) => void;
  onCloseAutoFocus?: (event: Event) => void;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  onPointerDownOutside?: (event: PointerEvent | TouchEvent) => void;
  onInteractOutside?: (event: Event) => void;
  /** Whether to show the close button in top-right corner. Defaults to true. */
  showCloseButton?: boolean;
  /** Container element for the portal. Defaults to document.body. */
  container?: HTMLElement | null;
}

const sideVariants = {
  top: 'inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
  bottom:
    'inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
  left: 'inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
  right:
    'inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
} as const;

export function SheetContent({
  side = 'right',
  asChild,
  forceMount,
  onOpenAutoFocus: _onOpenAutoFocus,
  onCloseAutoFocus: _onCloseAutoFocus,
  onEscapeKeyDown: onEscapeKeyDownProp,
  onPointerDownOutside: onPointerDownOutsideProp,
  onInteractOutside,
  showCloseButton,
  container,
  className,
  children,
  ...props
}: SheetContentProps) {
  const { open, onOpenChange, contentId, titleId, descriptionId, modal } = useSheetContext();
  const isInsidePortal = useIsInsidePortal();

  // Default showCloseButton to true (shadcn-style: always show close button)
  const shouldShowCloseButton = showCloseButton ?? true;
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

  const contentClassName = classy(
    'fixed z-depth-modal gap-4 bg-background p-6 shadow-lg transition ease-in-out',
    'data-[state=open]:animate-in data-[state=closed]:animate-out',
    'data-[state=open]:duration-500 data-[state=closed]:duration-300',
    sideVariants[side],
    className,
  );

  // Close button component (X icon)
  const closeButton = shouldShowCloseButton ? (
    <SheetClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
      <svg
        aria-hidden="true"
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
      >
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
      <span className="sr-only">Close</span>
    </SheetClose>
  ) : null;

  const contentProps = {
    ref: contentRef,
    id: contentId,
    ...ariaProps,
    className: contentClassName,
    ...props,
  } as React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> };

  // The core content to render
  const renderContent = () => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, contentProps as Partial<unknown>);
    }

    return (
      <div {...contentProps}>
        {children}
        {closeButton}
      </div>
    );
  };

  // If already inside a portal (user used SheetPortal explicitly), just render content
  if (isInsidePortal) {
    return renderContent();
  }

  // Otherwise, wrap with Portal and Overlay automatically (shadcn-style)
  // Build portal props, only including defined values
  const portalProps: SheetPortalProps = { children: null as unknown as React.ReactNode };
  if (container !== undefined) portalProps.container = container;
  if (forceMount !== undefined) portalProps.forceMount = forceMount;

  // Build overlay props, only including defined values
  const overlayProps: SheetOverlayProps = {};
  if (forceMount !== undefined) overlayProps.forceMount = forceMount;

  return (
    <SheetPortal {...portalProps}>
      <SheetOverlay {...overlayProps} />
      {renderContent()}
    </SheetPortal>
  );
}

// ==================== Sheet.Header ====================

export interface SheetHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SheetHeader({ className, ...props }: SheetHeaderProps) {
  return (
    <div
      className={classy('flex flex-col space-y-2 text-center sm:text-left', className)}
      {...props}
    />
  );
}

// ==================== Sheet.Footer ====================

export interface SheetFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SheetFooter({ className, ...props }: SheetFooterProps) {
  return (
    <div
      className={classy('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
      {...props}
    />
  );
}

// ==================== Sheet.Title ====================

export interface SheetTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  asChild?: boolean;
}

export function SheetTitle({ asChild, className, ...props }: SheetTitleProps) {
  const { titleId } = useSheetContext();

  const titleProps = {
    id: titleId,
    className: classy('text-lg font-semibold text-foreground', className),
    ...props,
  };

  if (asChild && React.isValidElement(props.children)) {
    return React.cloneElement(props.children, titleProps as Partial<unknown>);
  }

  return <h2 {...titleProps} />;
}

// ==================== Sheet.Description ====================

export interface SheetDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  asChild?: boolean;
}

export function SheetDescription({ asChild, className, ...props }: SheetDescriptionProps) {
  const { descriptionId } = useSheetContext();

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

// ==================== Sheet.Close ====================

export interface SheetCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function SheetClose({ asChild, onClick, ...props }: SheetCloseProps) {
  const { onOpenChange } = useSheetContext();

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

// ==================== Namespaced Export (shadcn style) ====================

Sheet.Trigger = SheetTrigger;
Sheet.Portal = SheetPortal;
Sheet.Overlay = SheetOverlay;
Sheet.Content = SheetContent;
Sheet.Header = SheetHeader;
Sheet.Footer = SheetFooter;
Sheet.Title = SheetTitle;
Sheet.Description = SheetDescription;
Sheet.Close = SheetClose;

// Re-export root as SheetRoot alias for shadcn compatibility
export { Sheet as SheetRoot };
