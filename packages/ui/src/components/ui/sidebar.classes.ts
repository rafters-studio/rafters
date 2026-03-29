/**
 * Shared sidebar class definitions
 *
 * Imported by sidebar.tsx (React) to keep inline strings
 * in a single source of truth.
 */

export const sidebarProviderClasses =
  'group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar';

export const sidebarNonCollapsibleClasses =
  'flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground';

export const sidebarMobileOverlayClasses =
  'fixed inset-0 z-depth-overlay bg-foreground/80 cursor-default';

export const sidebarMobilePanelClasses =
  'fixed inset-y-0 z-depth-modal flex h-svh w-72 flex-col bg-sidebar text-sidebar-foreground ' +
  'transition-transform duration-200 ease-in-out motion-reduce:transition-none';

export const sidebarMobilePanelLeftClasses = 'left-0 data-[state=closed]:-translate-x-full';

export const sidebarMobilePanelRightClasses = 'right-0 data-[state=closed]:translate-x-full';

export const sidebarMobileInnerClasses = 'flex h-full w-full flex-col';

export const sidebarDesktopWrapperClasses = 'group peer hidden md:block';

export const sidebarDesktopGapClasses =
  'relative h-svh w-64 bg-transparent transition-all duration-200 ease-linear motion-reduce:transition-none ' +
  'group-data-[collapsible=offcanvas]:w-0 ' +
  'group-data-[collapsible=icon]:w-12';

export const sidebarDesktopFixedClasses =
  'fixed inset-y-0 z-depth-navigation flex h-svh w-64 flex-col transition-all duration-200 ease-linear motion-reduce:transition-none ' +
  'group-data-[collapsible=icon]:w-12';

export const sidebarDesktopFixedLeftClasses = 'left-0 group-data-[collapsible=offcanvas]:-left-64';

export const sidebarDesktopFixedRightClasses =
  'right-0 group-data-[collapsible=offcanvas]:-right-64';

export const sidebarDesktopVariantDefaultClasses =
  'border-r group-data-[side=right]:border-l group-data-[side=right]:border-r-0';

export const sidebarDesktopVariantFloatingInsetClasses = 'p-2 group-data-[collapsible=icon]:w-16';

export const sidebarContentWrapperClasses =
  'flex h-full w-full flex-col bg-sidebar text-sidebar-foreground';

export const sidebarContentWrapperFloatingClasses = 'rounded-lg border shadow-sm';

export const sidebarContentWrapperInsetClasses = 'rounded-lg shadow-sm';

export const sidebarTriggerClasses = 'inline-flex items-center justify-center size-7';

export const sidebarRailClasses =
  'hidden w-4 -translate-x-1/2 transition-all ease-linear motion-reduce:transition-none md:flex ' +
  'absolute inset-y-0 z-20 after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 ' +
  'hover:after:bg-sidebar-border cursor-ew-resize ' +
  'group-data-[side=left]:-right-4 group-data-[side=right]:left-0 ' +
  'in-data-[variant=floating]:in-data-[side=left]:-right-6 ' +
  'in-data-[variant=floating]:in-data-[side=right]:left-2 ' +
  'in-data-[variant=inset]:in-data-[side=left]:-right-6 ' +
  'in-data-[variant=inset]:in-data-[side=right]:left-2';

export const sidebarInsetClasses =
  'relative flex w-full min-h-svh flex-1 flex-col bg-background ' +
  'peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))] ' +
  'md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm';

export const sidebarHeaderClasses = 'flex flex-col gap-2 p-2';

export const sidebarFooterClasses = 'flex flex-col gap-2 p-2';

export const sidebarContentClasses =
  'flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden';

export const sidebarGroupClasses = 'relative flex w-full min-w-0 flex-col p-2';

export const sidebarGroupLabelClasses =
  'flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none ' +
  'ring-sidebar-ring transition-all duration-200 ease-linear motion-reduce:transition-none focus-visible:ring-2 ' +
  'group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0';

export const sidebarGroupActionClasses =
  'absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 ' +
  'text-sidebar-foreground outline-none ring-sidebar-ring transition-transform duration-150 motion-reduce:transition-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ' +
  'focus-visible:ring-2 after:absolute after:-inset-2 after:md:hidden ' +
  'group-data-[collapsible=icon]:hidden';

export const sidebarGroupContentClasses = 'w-full';

export const sidebarMenuClasses = 'flex w-full min-w-0 flex-col gap-1';

export const sidebarMenuItemClasses = 'group/menu-item relative';

export const sidebarMenuButtonClasses =
  'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ' +
  'ring-sidebar-ring transition-all duration-150 motion-reduce:transition-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ' +
  'focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 ' +
  'group-has-data-[sidebar=menu-action]/menu-item:pr-8 ' +
  'aria-disabled:pointer-events-none aria-disabled:opacity-50 ' +
  'data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground ' +
  'group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-2 ' +
  'group-data-[collapsible=icon]:group-has-data-[sidebar=menu-action]/menu-item:pr-2';

export const sidebarMenuButtonSmClasses = 'text-xs';

export const sidebarMenuButtonLgClasses = 'text-sm group-data-[collapsible=icon]:p-0';

export const sidebarMenuButtonOutlineClasses =
  'bg-background shadow-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-none';

export const sidebarMenuActionClasses =
  'absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 ' +
  'text-sidebar-foreground outline-none ring-sidebar-ring transition-transform duration-150 motion-reduce:transition-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ' +
  'focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground ' +
  'after:absolute after:-inset-2 after:md:hidden ' +
  'group-data-[collapsible=icon]:hidden';

export const sidebarMenuActionShowOnHoverClasses =
  'group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0';

export const sidebarMenuBadgeClasses =
  'pointer-events-none absolute right-1 flex h-5 min-w-5 select-none items-center justify-center ' +
  'rounded-md px-1 text-xs font-medium tabular-nums text-sidebar-foreground ' +
  'peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground ' +
  'group-data-[collapsible=icon]:hidden';

export const sidebarMenuSkeletonClasses = 'flex h-8 items-center gap-2 rounded-md px-2';

export const sidebarMenuSkeletonIconClasses =
  'size-4 shrink-0 animate-pulse motion-reduce:animate-none rounded-md bg-sidebar-accent';

export const sidebarMenuSkeletonTextClasses =
  'h-4 max-w-[--skeleton-width] flex-1 animate-pulse motion-reduce:animate-none rounded-md bg-sidebar-accent';

export const sidebarMenuSubClasses =
  'ml-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border pl-2.5 py-0.5 ' +
  'group-data-[collapsible=icon]:hidden';

export const sidebarMenuSubButtonClasses =
  'flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none ' +
  'ring-sidebar-ring transition-colors duration-150 motion-reduce:transition-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ' +
  'focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 ' +
  'aria-disabled:pointer-events-none aria-disabled:opacity-50 ' +
  'data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground';

export const sidebarMenuSubButtonSmClasses = 'text-xs';

export const sidebarMenuSubButtonMdClasses = 'text-sm';

export const sidebarSeparatorClasses = 'mx-2 h-px w-auto bg-sidebar-border';
