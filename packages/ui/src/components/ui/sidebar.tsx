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
        className={classy(
          'group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar',
          className,
        )}
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
        className={classy(
          'flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground',
          className,
        )}
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
            className="fixed inset-0 z-depth-overlay bg-foreground/80 cursor-default"
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
            'fixed inset-y-0 z-depth-modal flex h-svh w-72 flex-col bg-sidebar text-sidebar-foreground',
            'transition-transform duration-200 ease-in-out',
            side === 'left'
              ? 'left-0 data-[state=closed]:-translate-x-full'
              : 'right-0 data-[state=closed]:translate-x-full',
            className,
          )}
          {...props}
        >
          <div className="flex h-full w-full flex-col">{children}</div>
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
      className="group peer hidden md:block"
    >
      {/* Gap element for smooth transition */}
      <div
        className={classy(
          'relative h-svh w-64 bg-transparent transition-all duration-200 ease-linear',
          'group-data-[collapsible=offcanvas]:w-0',
          'group-data-[collapsible=icon]:w-12',
        )}
      />

      {/* Actual sidebar content */}
      <div
        className={classy(
          'fixed inset-y-0 z-depth-navigation flex h-svh w-64 flex-col transition-all duration-200 ease-linear',
          side === 'left'
            ? 'left-0 group-data-[collapsible=offcanvas]:-left-64'
            : 'right-0 group-data-[collapsible=offcanvas]:-right-64',
          'group-data-[collapsible=icon]:w-12',
          // Variants
          variant === 'floating' || variant === 'inset'
            ? 'p-2 group-data-[collapsible=icon]:w-16'
            : 'border-r group-data-[side=right]:border-l group-data-[side=right]:border-r-0',
          className,
        )}
        {...props}
      >
        <div
          data-sidebar="content-wrapper"
          className={classy(
            'flex h-full w-full flex-col bg-sidebar text-sidebar-foreground',
            variant === 'floating' && 'rounded-lg border shadow-sm',
            variant === 'inset' && 'rounded-lg shadow-sm',
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
    className: classy('inline-flex items-center justify-center size-7', className),
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
      className={classy(
        'hidden w-4 -translate-x-1/2 transition-all ease-linear md:flex',
        'absolute inset-y-0 z-20 after:absolute after:inset-y-0 after:left-1/2 after:w-0.5',
        'hover:after:bg-sidebar-border cursor-ew-resize',
        'group-data-[side=left]:-right-4 group-data-[side=right]:left-0',
        'in-data-[variant=floating]:in-data-[side=left]:-right-6',
        'in-data-[variant=floating]:in-data-[side=right]:left-2',
        'in-data-[variant=inset]:in-data-[side=left]:-right-6',
        'in-data-[variant=inset]:in-data-[side=right]:left-2',
        className,
      )}
      {...props}
    />
  );
}

// ==================== Sidebar.Inset ====================

export interface SidebarInsetProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarInset({ className, ...props }: SidebarInsetProps) {
  return (
    <main
      data-sidebar="inset"
      className={classy(
        'relative flex w-full min-h-svh flex-1 flex-col bg-background',
        'peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))]',
        'md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm',
        className,
      )}
      {...props}
    />
  );
}

// ==================== Sidebar.Header ====================

export interface SidebarHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarHeader({ className, ...props }: SidebarHeaderProps) {
  return (
    <div
      data-sidebar="header"
      className={classy('flex flex-col gap-2 p-2', className)}
      {...props}
    />
  );
}

// ==================== Sidebar.Footer ====================

export interface SidebarFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarFooter({ className, ...props }: SidebarFooterProps) {
  return (
    <div
      data-sidebar="footer"
      className={classy('flex flex-col gap-2 p-2', className)}
      {...props}
    />
  );
}

// ==================== Sidebar.Content ====================

export interface SidebarContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarContent({ className, ...props }: SidebarContentProps) {
  return (
    <div
      data-sidebar="content"
      className={classy(
        'flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden',
        className,
      )}
      {...props}
    />
  );
}

// ==================== Sidebar.Group ====================

export interface SidebarGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarGroup({ className, ...props }: SidebarGroupProps) {
  return (
    <div
      data-sidebar="group"
      className={classy('relative flex w-full min-w-0 flex-col p-2', className)}
      {...props}
    />
  );
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
    className: classy(
      'flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none',
      'ring-sidebar-ring transition-all duration-200 ease-linear focus-visible:ring-2',
      'group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0',
      className,
    ),
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
    className: classy(
      'absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0',
      'text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      'focus-visible:ring-2 after:absolute after:-inset-2 after:md:hidden',
      'group-data-[collapsible=icon]:hidden',
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

// ==================== Sidebar.GroupContent ====================

export interface SidebarGroupContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarGroupContent({ className, ...props }: SidebarGroupContentProps) {
  return <div data-sidebar="group-content" className={classy('w-full', className)} {...props} />;
}

// ==================== Sidebar.Menu ====================

export interface SidebarMenuProps extends React.HTMLAttributes<HTMLUListElement> {}

export function SidebarMenu({ className, ...props }: SidebarMenuProps) {
  return (
    <ul
      data-sidebar="menu"
      className={classy('flex w-full min-w-0 flex-col gap-1', className)}
      {...props}
    />
  );
}

// ==================== Sidebar.MenuItem ====================

export interface SidebarMenuItemProps extends React.HTMLAttributes<HTMLLIElement> {}

export function SidebarMenuItem({ className, ...props }: SidebarMenuItemProps) {
  return (
    <li
      data-sidebar="menu-item"
      className={classy('group/menu-item relative', className)}
      {...props}
    />
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
      'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none',
      'ring-sidebar-ring transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      'focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50',
      'group-has-data-[sidebar=menu-action]/menu-item:pr-8',
      'aria-disabled:pointer-events-none aria-disabled:opacity-50',
      'data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground',
      // Icon collapsible mode
      'group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-2',
      'group-data-[collapsible=icon]:group-has-data-[sidebar=menu-action]/menu-item:pr-2',
      // Size variants
      size === 'sm' && 'text-xs',
      size === 'lg' && 'text-sm group-data-[collapsible=icon]:p-0',
      // Variant styles
      variant === 'outline' &&
        'bg-background shadow-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-none',
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
      'absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0',
      'text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      'focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground',
      'after:absolute after:-inset-2 after:md:hidden',
      'group-data-[collapsible=icon]:hidden',
      showOnHover &&
        'group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0',
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
      className={classy(
        'pointer-events-none absolute right-1 flex h-5 min-w-5 select-none items-center justify-center',
        'rounded-md px-1 text-xs font-medium tabular-nums text-sidebar-foreground',
        'peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground',
        'group-data-[collapsible=icon]:hidden',
        className,
      )}
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
      className={classy('flex h-8 items-center gap-2 rounded-md px-2', className)}
      {...props}
    >
      {showIcon && <div className="size-4 shrink-0 animate-pulse rounded-md bg-sidebar-accent" />}
      <div
        className="h-4 max-w-[--skeleton-width] flex-1 animate-pulse rounded-md bg-sidebar-accent"
        style={{ '--skeleton-width': width } as React.CSSProperties}
      />
    </div>
  );
}

// ==================== Sidebar.MenuSub ====================

export interface SidebarMenuSubProps extends React.HTMLAttributes<HTMLUListElement> {}

export function SidebarMenuSub({ className, ...props }: SidebarMenuSubProps) {
  return (
    <ul
      data-sidebar="menu-sub"
      className={classy(
        'ml-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border pl-2.5 py-0.5',
        'group-data-[collapsible=icon]:hidden',
        className,
      )}
      {...props}
    />
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
      'flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none',
      'ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      'focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50',
      'aria-disabled:pointer-events-none aria-disabled:opacity-50',
      'data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground',
      size === 'sm' && 'text-xs',
      size === 'md' && 'text-sm',
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
      className={classy('mx-2 h-px w-auto bg-sidebar-border', className)}
      {...props}
    />
  );
}

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
