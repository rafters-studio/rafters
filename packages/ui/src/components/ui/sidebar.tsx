/**
 * Responsive sidebar component for app navigation with collapsible states
 *
 * @cognitive-load 3/10 - Familiar navigation pattern; always visible, predictable location
 * @attention-economics Low attention cost: persistent navigation allows quick orientation
 * @trust-building Consistent location, keyboard toggle (Cmd+B), state persistence
 * @accessibility Keyboard navigation, proper landmarks (nav role), focus management
 * @semantic-meaning Primary navigation: main app sections, user actions, branding
 *
 * @usage-patterns
 * DO: Use for primary app navigation with 4-8 main sections
 * DO: Collapse to icons on mobile/narrow viewports
 * DO: Persist collapsed state in user preferences
 * DO: Include keyboard shortcut for toggle (Cmd+B)
 * DO: Group related items with sections and separators
 * NEVER: Secondary navigation (use tabs or breadcrumbs)
 * NEVER: Temporary content (use Sheet or Drawer)
 * NEVER: More than 2 levels of nesting
 *
 * @example
 * ```tsx
 * <Sidebar.Provider>
 *   <Sidebar>
 *     <Sidebar.Header>
 *       <Logo />
 *     </Sidebar.Header>
 *     <Sidebar.Content>
 *       <Sidebar.Group>
 *         <Sidebar.GroupLabel>Main</Sidebar.GroupLabel>
 *         <Sidebar.Menu>
 *           <Sidebar.MenuItem>
 *             <Sidebar.MenuButton asChild>
 *               <a href="/dashboard">Dashboard</a>
 *             </Sidebar.MenuButton>
 *           </Sidebar.MenuItem>
 *         </Sidebar.Menu>
 *       </Sidebar.Group>
 *     </Sidebar.Content>
 *     <Sidebar.Footer>
 *       <UserMenu />
 *     </Sidebar.Footer>
 *   </Sidebar>
 *   <Sidebar.Inset>
 *     <main>Content here</main>
 *   </Sidebar.Inset>
 * </Sidebar.Provider>
 * ```
 */

import * as React from 'react';
import classy from '../../primitives/classy';
import { mergeProps } from '../../primitives/slot';
import {
  sidebarContentClasses,
  sidebarContentWrapperClasses,
  sidebarContentWrapperFloatingClasses,
  sidebarContentWrapperInsetClasses,
  sidebarDesktopFixedClasses,
  sidebarDesktopFixedLeftClasses,
  sidebarDesktopFixedRightClasses,
  sidebarDesktopGapClasses,
  sidebarDesktopVariantDefaultClasses,
  sidebarDesktopVariantFloatingInsetClasses,
  sidebarDesktopWrapperClasses,
  sidebarFooterClasses,
  sidebarGroupActionClasses,
  sidebarGroupClasses,
  sidebarGroupContentClasses,
  sidebarGroupLabelClasses,
  sidebarHeaderClasses,
  sidebarInsetClasses,
  sidebarMenuActionClasses,
  sidebarMenuActionShowOnHoverClasses,
  sidebarMenuBadgeClasses,
  sidebarMenuButtonClasses,
  sidebarMenuButtonLgClasses,
  sidebarMenuButtonOutlineClasses,
  sidebarMenuButtonSmClasses,
  sidebarMenuClasses,
  sidebarMenuItemClasses,
  sidebarMenuSkeletonClasses,
  sidebarMenuSkeletonIconClasses,
  sidebarMenuSkeletonTextClasses,
  sidebarMenuSubButtonClasses,
  sidebarMenuSubButtonMdClasses,
  sidebarMenuSubButtonSmClasses,
  sidebarMenuSubClasses,
  sidebarMobileInnerClasses,
  sidebarMobileOverlayClasses,
  sidebarMobilePanelClasses,
  sidebarMobilePanelLeftClasses,
  sidebarMobilePanelRightClasses,
  sidebarNonCollapsibleClasses,
  sidebarProviderClasses,
  sidebarRailClasses,
  sidebarSeparatorClasses,
  sidebarTriggerClasses,
} from './sidebar.classes';

// ==================== Types ====================

type SidebarSide = 'left' | 'right';
type SidebarVariant = 'sidebar' | 'floating' | 'inset';
type SidebarCollapsible = 'offcanvas' | 'icon' | 'none';

// ==================== Context ====================

interface SidebarContextValue {
  state: 'expanded' | 'collapsed';
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

// ==================== Provider ====================

const SIDEBAR_COOKIE_NAME = 'sidebar:state';
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const SIDEBAR_KEYBOARD_SHORTCUT = 'b';

export interface SidebarProviderProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SidebarProvider({
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
  className,
  style,
  children,
  ...props
}: SidebarProviderProps) {
  const [openMobile, setOpenMobile] = React.useState(false);
  const [_open, _setOpen] = React.useState(defaultOpen);

  // Controlled vs uncontrolled
  const open = controlledOpen ?? _open;
  const setOpen = React.useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      const nextOpen = typeof value === 'function' ? value(open) : value;

      if (onOpenChange) {
        onOpenChange(nextOpen);
      } else {
        _setOpen(nextOpen);
      }

      // Set cookie for persistence
      if (typeof document !== 'undefined') {
        // biome-ignore lint/suspicious/noDocumentCookie: Cookie is used for sidebar state persistence across page loads
        document.cookie = `${SIDEBAR_COOKIE_NAME}=${nextOpen}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
      }
    },
    [open, onOpenChange],
  );

  // Simple mobile detection via media query
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)');
    setIsMobile(mql.matches);

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile((prev) => !prev);
    } else {
      setOpen((prev) => !prev);
    }
  }, [isMobile, setOpen]);

  // Keyboard shortcut (Cmd/Ctrl + B)
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === SIDEBAR_KEYBOARD_SHORTCUT && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleSidebar]);

  const state = open ? 'expanded' : 'collapsed';

  const contextValue = React.useMemo<SidebarContextValue>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        data-sidebar="provider"
        style={style}
        className={classy(sidebarProviderClasses, className)}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

// ==================== Sidebar ====================

export interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: SidebarSide;
  variant?: SidebarVariant;
  collapsible?: SidebarCollapsible;
}

export function Sidebar({
  side = 'left',
  variant = 'sidebar',
  collapsible = 'offcanvas',
  className,
  children,
  ...props
}: SidebarProps) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

  if (collapsible === 'none') {
    return (
      <div
        data-sidebar="sidebar"
        data-variant={variant}
        data-side={side}
        className={classy(sidebarNonCollapsibleClasses, className)}
        {...props}
      >
        {children}
      </div>
    );
  }

  // Mobile: render as Sheet-like overlay
  if (isMobile) {
    return (
      <>
        {/* Mobile overlay */}
        {openMobile && (
          <button
            type="button"
            data-sidebar="overlay"
            className={sidebarMobileOverlayClasses}
            onClick={() => setOpenMobile(false)}
            aria-label="Close sidebar"
          />
        )}

        {/* Mobile sidebar panel */}
        <div
          data-sidebar="sidebar"
          data-variant={variant}
          data-side={side}
          data-state={openMobile ? 'open' : 'closed'}
          className={classy(
            sidebarMobilePanelClasses,
            side === 'left' ? sidebarMobilePanelLeftClasses : sidebarMobilePanelRightClasses,
            className,
          )}
          {...props}
        >
          <div className={sidebarMobileInnerClasses}>{children}</div>
        </div>
      </>
    );
  }

  // Desktop: collapsible sidebar
  return (
    <div
      data-sidebar="sidebar"
      data-state={state}
      data-collapsible={state === 'collapsed' ? collapsible : ''}
      data-variant={variant}
      data-side={side}
      className={sidebarDesktopWrapperClasses}
    >
      {/* Gap element for smooth transition */}
      <div className={classy(sidebarDesktopGapClasses)} />

      {/* Actual sidebar content */}
      <div
        className={classy(
          sidebarDesktopFixedClasses,
          side === 'left' ? sidebarDesktopFixedLeftClasses : sidebarDesktopFixedRightClasses,
          // Variants
          variant === 'floating' || variant === 'inset'
            ? sidebarDesktopVariantFloatingInsetClasses
            : sidebarDesktopVariantDefaultClasses,
          className,
        )}
        {...props}
      >
        <div
          data-sidebar="content-wrapper"
          className={classy(
            sidebarContentWrapperClasses,
            variant === 'floating' && sidebarContentWrapperFloatingClasses,
            variant === 'inset' && sidebarContentWrapperInsetClasses,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// ==================== Sidebar.Trigger ====================

export interface SidebarTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function SidebarTrigger({ asChild, className, onClick, ...props }: SidebarTriggerProps) {
  const { toggleSidebar } = useSidebar();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    toggleSidebar();
  };

  const triggerProps = {
    'data-sidebar': 'trigger',
    className: classy(sidebarTriggerClasses, className),
    onClick: handleClick,
    ...props,
  };

  if (asChild && React.isValidElement(props.children)) {
    const childProps = props.children.props as Record<string, unknown>;
    return React.cloneElement(
      props.children,
      mergeProps(triggerProps, childProps) as React.Attributes,
    );
  }

  return (
    <button type="button" {...triggerProps}>
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
        className="size-4"
        aria-hidden="true"
      >
        <title>Toggle sidebar</title>
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M9 3v18" />
      </svg>
      <span className="sr-only">Toggle Sidebar</span>
    </button>
  );
}

// ==================== Sidebar.Rail ====================

export interface SidebarRailProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function SidebarRail({ className, ...props }: SidebarRailProps) {
  const { toggleSidebar } = useSidebar();

  return (
    <button
      type="button"
      data-sidebar="rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle Sidebar"
      className={classy(sidebarRailClasses, className)}
      {...props}
    />
  );
}

// ==================== Sidebar.Inset ====================

export interface SidebarInsetProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarInset({ className, ...props }: SidebarInsetProps) {
  return (
    <main data-sidebar="inset" className={classy(sidebarInsetClasses, className)} {...props} />
  );
}

// ==================== Sidebar.Header ====================

export interface SidebarHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarHeader({ className, ...props }: SidebarHeaderProps) {
  return (
    <div data-sidebar="header" className={classy(sidebarHeaderClasses, className)} {...props} />
  );
}

// ==================== Sidebar.Footer ====================

export interface SidebarFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarFooter({ className, ...props }: SidebarFooterProps) {
  return (
    <div data-sidebar="footer" className={classy(sidebarFooterClasses, className)} {...props} />
  );
}

// ==================== Sidebar.Content ====================

export interface SidebarContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarContent({ className, ...props }: SidebarContentProps) {
  return (
    <div data-sidebar="content" className={classy(sidebarContentClasses, className)} {...props} />
  );
}

// ==================== Sidebar.Group ====================

export interface SidebarGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarGroup({ className, ...props }: SidebarGroupProps) {
  return <div data-sidebar="group" className={classy(sidebarGroupClasses, className)} {...props} />;
}

// ==================== Sidebar.GroupLabel ====================

export interface SidebarGroupLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

export function SidebarGroupLabel({
  asChild,
  className,
  children,
  ...props
}: SidebarGroupLabelProps) {
  const labelProps = {
    'data-sidebar': 'group-label',
    className: classy(sidebarGroupLabelClasses, className),
    ...props,
  };

  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as Record<string, unknown>;
    return React.cloneElement(children, mergeProps(labelProps, childProps) as React.Attributes);
  }

  return <div {...labelProps}>{children}</div>;
}

// ==================== Sidebar.GroupAction ====================

export interface SidebarGroupActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function SidebarGroupAction({
  asChild,
  className,
  children,
  ...props
}: SidebarGroupActionProps) {
  const actionProps = {
    'data-sidebar': 'group-action',
    className: classy(sidebarGroupActionClasses, className),
    ...props,
  };

  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as Record<string, unknown>;
    return React.cloneElement(children, mergeProps(actionProps, childProps) as React.Attributes);
  }

  return (
    <button type="button" {...actionProps}>
      {children}
    </button>
  );
}

// ==================== Sidebar.GroupContent ====================

export interface SidebarGroupContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarGroupContent({ className, ...props }: SidebarGroupContentProps) {
  return (
    <div
      data-sidebar="group-content"
      className={classy(sidebarGroupContentClasses, className)}
      {...props}
    />
  );
}

// ==================== Sidebar.Menu ====================

export interface SidebarMenuProps extends React.HTMLAttributes<HTMLUListElement> {}

export function SidebarMenu({ className, ...props }: SidebarMenuProps) {
  return <ul data-sidebar="menu" className={classy(sidebarMenuClasses, className)} {...props} />;
}

// ==================== Sidebar.MenuItem ====================

export interface SidebarMenuItemProps extends React.HTMLAttributes<HTMLLIElement> {}

export function SidebarMenuItem({ className, ...props }: SidebarMenuItemProps) {
  return (
    <li data-sidebar="menu-item" className={classy(sidebarMenuItemClasses, className)} {...props} />
  );
}

// ==================== Sidebar.MenuButton ====================

export interface SidebarMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  isActive?: boolean;
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm' | 'lg';
}

export function SidebarMenuButton({
  asChild,
  isActive = false,
  variant = 'default',
  size = 'default',
  className,
  children,
  ...props
}: SidebarMenuButtonProps) {
  const buttonProps = {
    'data-sidebar': 'menu-button',
    'data-size': size,
    'data-active': isActive,
    className: classy(
      sidebarMenuButtonClasses,
      // Size variants
      size === 'sm' && sidebarMenuButtonSmClasses,
      size === 'lg' && sidebarMenuButtonLgClasses,
      // Variant styles
      variant === 'outline' && sidebarMenuButtonOutlineClasses,
      className,
    ),
    ...props,
  };

  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as Record<string, unknown>;
    return React.cloneElement(children, mergeProps(buttonProps, childProps) as React.Attributes);
  }

  return (
    <button type="button" {...buttonProps}>
      {children}
    </button>
  );
}

// ==================== Sidebar.MenuAction ====================

export interface SidebarMenuActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  showOnHover?: boolean;
}

export function SidebarMenuAction({
  asChild,
  showOnHover = false,
  className,
  children,
  ...props
}: SidebarMenuActionProps) {
  const actionProps = {
    'data-sidebar': 'menu-action',
    className: classy(
      sidebarMenuActionClasses,
      showOnHover && sidebarMenuActionShowOnHoverClasses,
      className,
    ),
    ...props,
  };

  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as Record<string, unknown>;
    return React.cloneElement(children, mergeProps(actionProps, childProps) as React.Attributes);
  }

  return (
    <button type="button" {...actionProps}>
      {children}
    </button>
  );
}

// ==================== Sidebar.MenuBadge ====================

export interface SidebarMenuBadgeProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarMenuBadge({ className, ...props }: SidebarMenuBadgeProps) {
  return (
    <div
      data-sidebar="menu-badge"
      className={classy(sidebarMenuBadgeClasses, className)}
      {...props}
    />
  );
}

// ==================== Sidebar.MenuSkeleton ====================

export interface SidebarMenuSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  showIcon?: boolean;
}

export function SidebarMenuSkeleton({
  showIcon = false,
  className,
  ...props
}: SidebarMenuSkeletonProps) {
  // Generate random width for skeleton (stable across re-renders)
  const [width] = React.useState(() => `${Math.floor(Math.random() * 40) + 50}%`);

  return (
    <div
      data-sidebar="menu-skeleton"
      className={classy(sidebarMenuSkeletonClasses, className)}
      {...props}
    >
      {showIcon && <div className={sidebarMenuSkeletonIconClasses} />}
      <div
        className={sidebarMenuSkeletonTextClasses}
        style={{ '--skeleton-width': width } as React.CSSProperties}
      />
    </div>
  );
}

// ==================== Sidebar.MenuSub ====================

export interface SidebarMenuSubProps extends React.HTMLAttributes<HTMLUListElement> {}

export function SidebarMenuSub({ className, ...props }: SidebarMenuSubProps) {
  return (
    <ul data-sidebar="menu-sub" className={classy(sidebarMenuSubClasses, className)} {...props} />
  );
}

// ==================== Sidebar.MenuSubItem ====================

export interface SidebarMenuSubItemProps extends React.HTMLAttributes<HTMLLIElement> {}

export function SidebarMenuSubItem({ className, ...props }: SidebarMenuSubItemProps) {
  return <li data-sidebar="menu-sub-item" className={className} {...props} />;
}

// ==================== Sidebar.MenuSubButton ====================

export interface SidebarMenuSubButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  asChild?: boolean;
  isActive?: boolean;
  size?: 'sm' | 'md';
}

export function SidebarMenuSubButton({
  asChild,
  isActive = false,
  size = 'md',
  className,
  children,
  ...props
}: SidebarMenuSubButtonProps) {
  const buttonProps = {
    'data-sidebar': 'menu-sub-button',
    'data-size': size,
    'data-active': isActive,
    className: classy(
      sidebarMenuSubButtonClasses,
      size === 'sm' && sidebarMenuSubButtonSmClasses,
      size === 'md' && sidebarMenuSubButtonMdClasses,
      className,
    ),
    ...props,
  };

  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as Record<string, unknown>;
    return React.cloneElement(children, mergeProps(buttonProps, childProps) as React.Attributes);
  }

  return <a {...buttonProps}>{children}</a>;
}

// ==================== Sidebar.Separator ====================

export interface SidebarSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarSeparator({ className, ...props }: SidebarSeparatorProps) {
  return (
    <div
      data-sidebar="separator"
      className={classy(sidebarSeparatorClasses, className)}
      {...props}
    />
  );
}

// ==================== Display Names ====================

SidebarProvider.displayName = 'SidebarProvider';
Sidebar.displayName = 'Sidebar';
SidebarTrigger.displayName = 'SidebarTrigger';
SidebarRail.displayName = 'SidebarRail';
SidebarInset.displayName = 'SidebarInset';
SidebarHeader.displayName = 'SidebarHeader';
SidebarFooter.displayName = 'SidebarFooter';
SidebarContent.displayName = 'SidebarContent';
SidebarGroup.displayName = 'SidebarGroup';
SidebarGroupLabel.displayName = 'SidebarGroupLabel';
SidebarGroupAction.displayName = 'SidebarGroupAction';
SidebarGroupContent.displayName = 'SidebarGroupContent';
SidebarMenu.displayName = 'SidebarMenu';
SidebarMenuItem.displayName = 'SidebarMenuItem';
SidebarMenuButton.displayName = 'SidebarMenuButton';
SidebarMenuAction.displayName = 'SidebarMenuAction';
SidebarMenuBadge.displayName = 'SidebarMenuBadge';
SidebarMenuSkeleton.displayName = 'SidebarMenuSkeleton';
SidebarMenuSub.displayName = 'SidebarMenuSub';
SidebarMenuSubItem.displayName = 'SidebarMenuSubItem';
SidebarMenuSubButton.displayName = 'SidebarMenuSubButton';
SidebarSeparator.displayName = 'SidebarSeparator';

// ==================== Namespaced Export ====================

Sidebar.Provider = SidebarProvider;
Sidebar.Trigger = SidebarTrigger;
Sidebar.Rail = SidebarRail;
Sidebar.Inset = SidebarInset;
Sidebar.Header = SidebarHeader;
Sidebar.Footer = SidebarFooter;
Sidebar.Content = SidebarContent;
Sidebar.Group = SidebarGroup;
Sidebar.GroupLabel = SidebarGroupLabel;
Sidebar.GroupAction = SidebarGroupAction;
Sidebar.GroupContent = SidebarGroupContent;
Sidebar.Menu = SidebarMenu;
Sidebar.MenuItem = SidebarMenuItem;
Sidebar.MenuButton = SidebarMenuButton;
Sidebar.MenuAction = SidebarMenuAction;
Sidebar.MenuBadge = SidebarMenuBadge;
Sidebar.MenuSkeleton = SidebarMenuSkeleton;
Sidebar.MenuSub = SidebarMenuSub;
Sidebar.MenuSubItem = SidebarMenuSubItem;
Sidebar.MenuSubButton = SidebarMenuSubButton;
Sidebar.Separator = SidebarSeparator;
