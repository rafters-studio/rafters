/**
 * Menubar component for application-style horizontal menu navigation
 *
 * @cognitive-load 5/10 - Horizontal menu bar with nested dropdowns requires spatial awareness
 * @attention-economics Application navigation: always visible, groups commands by category
 * @trust-building Familiar desktop app pattern (File, Edit, View...), keyboard shortcuts, hover transitions
 * @accessibility Full keyboard support (arrows between menus and within), role="menubar" on root, role="menu" on dropdowns
 * @semantic-meaning Navigation menu: Menu=category group, Item=action, CheckboxItem=toggle, RadioItem=exclusive choice
 *
 * @usage-patterns
 * DO: Use for application-level commands (File, Edit, View, Help)
 * DO: Group related actions within each menu
 * DO: Include keyboard shortcuts with MenubarShortcut
 * DO: Keep top-level menu count reasonable (5-8 menus max)
 * NEVER: Primary page navigation, deeply nested submenus (max 1 level), mobile-only interfaces
 *
 * @example
 * ```tsx
 * <Menubar>
 *   <MenubarMenu>
 *     <MenubarTrigger>File</MenubarTrigger>
 *     <MenubarContent>
 *       <MenubarItem>New Tab <MenubarShortcut>Cmd+T</MenubarShortcut></MenubarItem>
 *       <MenubarItem>New Window</MenubarItem>
 *       <MenubarSeparator />
 *       <MenubarItem>Print...</MenubarItem>
 *     </MenubarContent>
 *   </MenubarMenu>
 *   <MenubarMenu>
 *     <MenubarTrigger>Edit</MenubarTrigger>
 *     <MenubarContent>
 *       <MenubarItem>Undo <MenubarShortcut>Cmd+Z</MenubarShortcut></MenubarItem>
 *       <MenubarItem>Redo</MenubarItem>
 *     </MenubarContent>
 *   </MenubarMenu>
 * </Menubar>
 * ```
 */

import * as React from 'react';
import { createPortal } from 'react-dom';
import classy from '../../primitives/classy';
import { computePosition } from '../../primitives/collision-detector';
import { onEscapeKeyDown } from '../../primitives/escape-keydown';
import { onPointerDownOutside } from '../../primitives/outside-click';
import { getPortalContainer } from '../../primitives/portal';
import { createRovingFocus } from '../../primitives/roving-focus';
import { createTypeahead } from '../../primitives/typeahead';
import type { Align, Side } from '../../primitives/types';

// ==================== Types ====================

interface MenubarContextValue {
  activeMenuId: string | null;
  onMenuOpen: (menuId: string) => void;
  onMenuClose: () => void;
  triggerRefs: Map<string, HTMLButtonElement | null>;
  registerTrigger: (menuId: string, ref: HTMLButtonElement | null) => void;
}

interface MenubarMenuContextValue {
  menuId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  contentId: string;
}

interface MenubarContentContextValue {
  onItemSelect: () => void;
}

interface MenubarRadioGroupContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

interface MenubarSubContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  contentId: string;
}

// ==================== Contexts ====================

const MenubarContext = React.createContext<MenubarContextValue | null>(null);
const MenubarMenuContext = React.createContext<MenubarMenuContextValue | null>(null);
const MenubarContentContext = React.createContext<MenubarContentContextValue | null>(null);
const MenubarRadioGroupContext = React.createContext<MenubarRadioGroupContextValue | null>(null);
const MenubarSubContext = React.createContext<MenubarSubContextValue | null>(null);

function useMenubarContext() {
  const context = React.useContext(MenubarContext);
  if (!context) {
    throw new Error('Menubar components must be used within Menubar');
  }
  return context;
}

function useMenubarMenuContext() {
  const context = React.useContext(MenubarMenuContext);
  if (!context) {
    throw new Error('MenubarMenu components must be used within MenubarMenu');
  }
  return context;
}

function useMenubarContentContext() {
  const context = React.useContext(MenubarContentContext);
  if (!context) {
    throw new Error('MenubarItem must be used within MenubarContent');
  }
  return context;
}

function useMenubarRadioGroupContext() {
  const context = React.useContext(MenubarRadioGroupContext);
  if (!context) {
    throw new Error('MenubarRadioItem must be used within MenubarRadioGroup');
  }
  return context;
}

function useMenubarSubContext() {
  return React.useContext(MenubarSubContext);
}

// ==================== Menubar (Root) ====================

export interface MenubarProps extends React.HTMLAttributes<HTMLDivElement> {
  loop?: boolean;
}

const MenubarRoot = React.forwardRef<HTMLDivElement, MenubarProps>(
  ({ className, loop = true, onKeyDown, children, ...props }, ref) => {
    const [activeMenuId, setActiveMenuId] = React.useState<string | null>(null);
    const triggerRefs = React.useRef(new Map<string, HTMLButtonElement | null>());
    const menubarRef = React.useRef<HTMLDivElement>(null);

    // Compose refs
    React.useImperativeHandle(ref, () => menubarRef.current as HTMLDivElement);

    const onMenuOpen = React.useCallback((menuId: string) => {
      setActiveMenuId(menuId);
    }, []);

    const onMenuClose = React.useCallback(() => {
      setActiveMenuId(null);
    }, []);

    const registerTrigger = React.useCallback(
      (menuId: string, triggerRef: HTMLButtonElement | null) => {
        triggerRefs.current.set(menuId, triggerRef);
      },
      [],
    );

    // Setup roving focus for menu triggers
    React.useEffect(() => {
      if (!menubarRef.current) return;

      const cleanup = createRovingFocus(menubarRef.current, {
        orientation: 'horizontal',
        loop,
      });

      return cleanup;
    }, [loop]);

    // Handle left/right arrow keys to navigate between menus when one is open
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);

      if (!activeMenuId) return;

      const triggers = Array.from(triggerRefs.current.entries());
      const currentIndex = triggers.findIndex(([id]) => id === activeMenuId);

      if (currentIndex === -1) return;

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        const nextIndex = loop
          ? (currentIndex + 1) % triggers.length
          : Math.min(currentIndex + 1, triggers.length - 1);
        const nextEntry = triggers[nextIndex];
        if (nextEntry) {
          const [nextMenuId, nextTrigger] = nextEntry;
          if (nextTrigger && nextMenuId !== activeMenuId) {
            setActiveMenuId(nextMenuId);
            nextTrigger.focus();
          }
        }
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        const prevIndex = loop
          ? (currentIndex - 1 + triggers.length) % triggers.length
          : Math.max(currentIndex - 1, 0);
        const prevEntry = triggers[prevIndex];
        if (prevEntry) {
          const [prevMenuId, prevTrigger] = prevEntry;
          if (prevTrigger && prevMenuId !== activeMenuId) {
            setActiveMenuId(prevMenuId);
            prevTrigger.focus();
          }
        }
      }
    };

    const contextValue = React.useMemo(
      () => ({
        activeMenuId,
        onMenuOpen,
        onMenuClose,
        triggerRefs: triggerRefs.current,
        registerTrigger,
      }),
      [activeMenuId, onMenuOpen, onMenuClose, registerTrigger],
    );

    return (
      <MenubarContext.Provider value={contextValue}>
        <div
          ref={menubarRef}
          role="menubar"
          className={classy(
            'flex h-9 items-center gap-1 rounded-md border bg-background p-1',
            className,
          )}
          onKeyDown={handleKeyDown}
          {...props}
        >
          {children}
        </div>
      </MenubarContext.Provider>
    );
  },
);

MenubarRoot.displayName = 'Menubar';

// ==================== MenubarMenu ====================

export interface MenubarMenuProps {
  children: React.ReactNode;
}

export function MenubarMenu({ children }: MenubarMenuProps) {
  const { activeMenuId, onMenuOpen, onMenuClose } = useMenubarContext();

  const id = React.useId();
  const menuId = `menubar-menu-${id}`;
  const contentId = `menubar-menu-content-${id}`;
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  const open = activeMenuId === menuId;

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (newOpen) {
        onMenuOpen(menuId);
      } else {
        onMenuClose();
      }
    },
    [menuId, onMenuOpen, onMenuClose],
  );

  const contextValue = React.useMemo(
    () => ({
      menuId,
      open,
      onOpenChange: handleOpenChange,
      triggerRef,
      contentId,
    }),
    [menuId, open, handleOpenChange, contentId],
  );

  return <MenubarMenuContext.Provider value={contextValue}>{children}</MenubarMenuContext.Provider>;
}

// ==================== MenubarTrigger ====================

export interface MenubarTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const MenubarTrigger = React.forwardRef<HTMLButtonElement, MenubarTriggerProps>(
  ({ asChild, className, onClick, onPointerEnter, onKeyDown, ...props }, ref) => {
    const { activeMenuId, registerTrigger } = useMenubarContext();
    const { menuId, open, onOpenChange, triggerRef, contentId } = useMenubarMenuContext();

    // Track if menu was just opened by hover to avoid toggling it closed on click
    const openedByHoverRef = React.useRef(false);

    const composedRef = React.useCallback(
      (node: HTMLButtonElement | null) => {
        triggerRef.current = node;
        registerTrigger(menuId, node);
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref, triggerRef, registerTrigger, menuId],
    );

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);

      // If we just opened this menu via hover (mouse enter), don't toggle it closed
      if (openedByHoverRef.current) {
        openedByHoverRef.current = false;
        return;
      }

      // Toggle if this menu is open, otherwise open it
      if (open) {
        onOpenChange(false);
      } else {
        onOpenChange(true);
      }
    };

    // When hovering over a trigger while another menu is open, switch to this menu
    const handlePointerEnter = (event: React.PointerEvent<HTMLButtonElement>) => {
      onPointerEnter?.(event);
      if (activeMenuId && activeMenuId !== menuId) {
        openedByHoverRef.current = true;
        onOpenChange(true);
      }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
      onKeyDown?.(event);

      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onOpenChange(true);
      }
    };

    const ariaProps = {
      'aria-expanded': open,
      'aria-controls': contentId,
      'aria-haspopup': 'menu' as const,
      'data-state': open ? 'open' : 'closed',
    };

    if (asChild && React.isValidElement(props.children)) {
      return React.cloneElement(props.children, {
        ref: composedRef,
        role: 'menuitem',
        tabIndex: -1,
        ...ariaProps,
        onClick: handleClick,
        onPointerEnter: handlePointerEnter,
        onKeyDown: handleKeyDown,
      } as Partial<unknown>);
    }

    return (
      <button
        ref={composedRef}
        type="button"
        role="menuitem"
        tabIndex={-1}
        className={classy(
          'flex cursor-default select-none items-center rounded-sm px-3 py-1 text-sm font-medium outline-none',
          'focus:bg-accent focus:text-accent-foreground',
          'data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
          className,
        )}
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onKeyDown={handleKeyDown}
        {...ariaProps}
        {...props}
      />
    );
  },
);

MenubarTrigger.displayName = 'MenubarTrigger';

// ==================== MenubarPortal ====================

export interface MenubarPortalProps {
  children: React.ReactNode;
  container?: HTMLElement | null;
  forceMount?: boolean;
}

export function MenubarPortal({ children, container, forceMount }: MenubarPortalProps) {
  const { open } = useMenubarMenuContext();
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

// ==================== MenubarContent ====================

export interface MenubarContentProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
  forceMount?: boolean;
  side?: Side;
  align?: Align;
  sideOffset?: number;
  alignOffset?: number;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  onPointerDownOutside?: (event: PointerEvent | TouchEvent) => void;
  loop?: boolean;
}

export const MenubarContent = React.forwardRef<HTMLDivElement, MenubarContentProps>(
  (
    {
      asChild,
      forceMount,
      side = 'bottom',
      align = 'start',
      sideOffset = 8,
      alignOffset = -4,
      onEscapeKeyDown: onEscapeKeyDownProp,
      onPointerDownOutside: onPointerDownOutsideProp,
      loop = true,
      className,
      style,
      onKeyDown,
      ...props
    },
    ref,
  ) => {
    const { onMenuClose, triggerRefs } = useMenubarContext();
    const { open, onOpenChange, contentId, triggerRef, menuId } = useMenubarMenuContext();
    const subContext = useMenubarSubContext();
    const contentRef = React.useRef<HTMLDivElement>(null);
    const [position, setPosition] = React.useState<{
      x: number;
      y: number;
      side: Side;
      align: Align;
    }>({
      x: 0,
      y: 0,
      side,
      align,
    });

    // Compose refs
    React.useImperativeHandle(ref, () => contentRef.current as HTMLDivElement);

    // Get anchor element
    const getAnchorElement = React.useCallback(() => {
      if (subContext) {
        return subContext.triggerRef.current;
      }
      return triggerRef.current;
    }, [subContext, triggerRef]);

    // Position the menu
    React.useEffect(() => {
      if (!open) return;

      const updatePosition = () => {
        const anchorElement = getAnchorElement();
        const floatingElement = contentRef.current;

        if (!anchorElement || !floatingElement) return;

        const result = computePosition(anchorElement, floatingElement, {
          side: subContext ? 'right' : side,
          align: subContext ? 'start' : align,
          sideOffset: subContext ? 2 : sideOffset,
          alignOffset: subContext ? -4 : alignOffset,
          avoidCollisions: true,
        });

        setPosition({
          x: result.x,
          y: result.y,
          side: result.side,
          align: result.align,
        });
      };

      const frame = requestAnimationFrame(updatePosition);

      window.addEventListener('scroll', updatePosition, { capture: true, passive: true });
      window.addEventListener('resize', updatePosition, { passive: true });

      return () => {
        cancelAnimationFrame(frame);
        window.removeEventListener('scroll', updatePosition, { capture: true });
        window.removeEventListener('resize', updatePosition);
      };
    }, [open, side, align, sideOffset, alignOffset, subContext, getAnchorElement]);

    // Setup roving focus
    React.useEffect(() => {
      if (!open || !contentRef.current) return;

      const cleanup = createRovingFocus(contentRef.current, {
        orientation: 'vertical',
        loop,
      });

      return cleanup;
    }, [open, loop]);

    // Setup typeahead
    React.useEffect(() => {
      if (!open || !contentRef.current) return;

      const container = contentRef.current;

      const cleanup = createTypeahead(container, {
        getItems: () =>
          container.querySelectorAll<HTMLElement>(
            '[role="menuitem"]:not([disabled]), [role="menuitemcheckbox"]:not([disabled]), [role="menuitemradio"]:not([disabled])',
          ),
        onMatch: (item) => {
          item.focus();
        },
      });

      return cleanup;
    }, [open]);

    // Escape key handler
    React.useEffect(() => {
      if (!open) return;

      const cleanup = onEscapeKeyDown((event) => {
        onEscapeKeyDownProp?.(event);
        if (!event.defaultPrevented) {
          onMenuClose();
          triggerRef.current?.focus();
        }
      });

      return cleanup;
    }, [open, onMenuClose, onEscapeKeyDownProp, triggerRef]);

    // Outside click handler
    React.useEffect(() => {
      if (!open || !contentRef.current) return;

      const cleanup = onPointerDownOutside(contentRef.current, (event) => {
        const target = event.target as Node;

        // Check if clicking another menubar trigger
        const entries = Array.from(triggerRefs.entries());
        for (const [, trigger] of entries) {
          if (trigger?.contains(target)) {
            // Let the trigger handle opening its own menu
            return;
          }
        }

        onPointerDownOutsideProp?.(event);

        if (!event.defaultPrevented) {
          onMenuClose();
        }
      });

      return cleanup;
    }, [open, onMenuClose, onPointerDownOutsideProp, triggerRefs]);

    // Focus first item on open
    React.useEffect(() => {
      if (!open || !contentRef.current) return;

      const firstItem = contentRef.current.querySelector<HTMLElement>(
        '[role="menuitem"]:not([disabled]), [role="menuitemcheckbox"]:not([disabled]), [role="menuitemradio"]:not([disabled])',
      );

      if (firstItem) {
        firstItem.focus();
      }
    }, [open]);

    // Handle arrow left to close and go to previous menu
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);

      if (event.key === 'ArrowLeft' && !subContext) {
        event.preventDefault();
        // Close this menu and focus previous trigger
        const triggers = Array.from(triggerRefs.entries());
        const currentIndex = triggers.findIndex(([id]) => id === menuId);
        if (currentIndex > 0) {
          const prevEntry = triggers[currentIndex - 1];
          if (prevEntry) {
            const [, prevTrigger] = prevEntry;
            if (prevTrigger) {
              onOpenChange(false);
              prevTrigger.focus();
            }
          }
        }
      } else if (event.key === 'ArrowRight' && !subContext) {
        // Check if we're on a submenu trigger
        const activeElement = document.activeElement;
        if (activeElement?.getAttribute('aria-haspopup') === 'menu') {
          // Let the submenu trigger handle this
          return;
        }

        event.preventDefault();
        // Close this menu and focus next trigger
        const triggers = Array.from(triggerRefs.entries());
        const currentIndex = triggers.findIndex(([id]) => id === menuId);
        if (currentIndex < triggers.length - 1) {
          const nextEntry = triggers[currentIndex + 1];
          if (nextEntry) {
            const [, nextTrigger] = nextEntry;
            if (nextTrigger) {
              onOpenChange(false);
              nextTrigger.focus();
            }
          }
        }
      }
    };

    // Handle item selection
    const onItemSelect = React.useCallback(() => {
      onMenuClose();
      triggerRef.current?.focus();
    }, [onMenuClose, triggerRef]);

    const contentContextValue = React.useMemo(() => ({ onItemSelect }), [onItemSelect]);

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
    };

    const contentProps = {
      ref: contentRef,
      id: subContext ? subContext.contentId : contentId,
      role: 'menu',
      'aria-orientation': 'vertical' as const,
      'data-state': open ? 'open' : 'closed',
      'data-side': position.side,
      'data-align': position.align,
      className: classy(
        'z-depth-dropdown min-w-48 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
        'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className,
      ),
      style: contentStyle,
      onKeyDown: handleKeyDown,
      ...props,
    };

    let content: React.ReactNode;

    if (asChild && React.isValidElement(props.children)) {
      content = (
        <MenubarContentContext.Provider value={contentContextValue}>
          {React.cloneElement(props.children, contentProps as Partial<unknown>)}
        </MenubarContentContext.Provider>
      );
    } else {
      content = (
        <MenubarContentContext.Provider value={contentContextValue}>
          <div {...contentProps} />
        </MenubarContentContext.Provider>
      );
    }

    const portalContainer = getPortalContainer({ enabled: true });
    if (portalContainer) {
      return createPortal(content, portalContainer);
    }
    return content;
  },
);

MenubarContent.displayName = 'MenubarContent';

// ==================== MenubarGroup ====================

export interface MenubarGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

export const MenubarGroup = React.forwardRef<HTMLDivElement, MenubarGroupProps>(
  ({ ...props }, ref) => {
    // biome-ignore lint/a11y/useSemanticElements: role="group" is correct for menu groups per WAI-ARIA APG
    return <div ref={ref} role="group" {...props} />;
  },
);

MenubarGroup.displayName = 'MenubarGroup';

// ==================== MenubarLabel ====================

export interface MenubarLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}

export const MenubarLabel = React.forwardRef<HTMLDivElement, MenubarLabelProps>(
  ({ className, inset, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={classy('px-2 py-1.5 text-sm font-semibold', inset && 'pl-8', className)}
        {...props}
      />
    );
  },
);

MenubarLabel.displayName = 'MenubarLabel';

// ==================== MenubarItem ====================

export interface MenubarItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  inset?: boolean;
  disabled?: boolean;
  onSelect?: (event: Event) => void;
}

export const MenubarItem = React.forwardRef<HTMLDivElement, MenubarItemProps>(
  ({ className, inset, disabled, onSelect, onClick, onKeyDown, ...props }, ref) => {
    const { onItemSelect } = useMenubarContentContext();

    const handleSelect = React.useCallback(() => {
      if (disabled) return;

      const event = new Event('select', { cancelable: true });
      onSelect?.(event);

      if (!event.defaultPrevented) {
        onItemSelect();
      }
    }, [disabled, onSelect, onItemSelect]);

    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
      onClick?.(event);
      handleSelect();
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelect();
      }
    };

    return (
      <div
        ref={ref}
        role="menuitem"
        tabIndex={disabled ? undefined : -1}
        aria-disabled={disabled || undefined}
        data-disabled={disabled ? '' : undefined}
        className={classy(
          'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
          'transition-colors focus:bg-accent focus:text-accent-foreground',
          'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
          inset && 'pl-8',
          className,
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...props}
      />
    );
  },
);

MenubarItem.displayName = 'MenubarItem';

// ==================== MenubarCheckboxItem ====================

export interface MenubarCheckboxItemProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  checked?: boolean;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onSelect?: (event: Event) => void;
}

export const MenubarCheckboxItem = React.forwardRef<HTMLDivElement, MenubarCheckboxItemProps>(
  (
    {
      className,
      checked = false,
      disabled,
      onCheckedChange,
      onSelect,
      onClick,
      onKeyDown,
      children,
      ...props
    },
    ref,
  ) => {
    const { onItemSelect } = useMenubarContentContext();

    const handleSelect = React.useCallback(() => {
      if (disabled) return;

      const event = new Event('select', { cancelable: true });
      onSelect?.(event);

      if (!event.defaultPrevented) {
        onCheckedChange?.(!checked);
        onItemSelect();
      }
    }, [disabled, onSelect, onCheckedChange, checked, onItemSelect]);

    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
      onClick?.(event);
      handleSelect();
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelect();
      }
    };

    return (
      <div
        ref={ref}
        role="menuitemcheckbox"
        aria-checked={checked}
        tabIndex={disabled ? undefined : -1}
        aria-disabled={disabled || undefined}
        data-disabled={disabled ? '' : undefined}
        data-state={checked ? 'checked' : 'unchecked'}
        className={classy(
          'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
          'transition-colors focus:bg-accent focus:text-accent-foreground',
          'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
          className,
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...props}
      >
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          {checked && (
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </span>
        {children}
      </div>
    );
  },
);

MenubarCheckboxItem.displayName = 'MenubarCheckboxItem';

// ==================== MenubarRadioGroup ====================

export interface MenubarRadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
}

export const MenubarRadioGroup = React.forwardRef<HTMLDivElement, MenubarRadioGroupProps>(
  ({ value = '', onValueChange, ...props }, ref) => {
    const handleValueChange = React.useCallback(
      (newValue: string) => {
        onValueChange?.(newValue);
      },
      [onValueChange],
    );

    const contextValue = React.useMemo(
      () => ({
        value,
        onValueChange: handleValueChange,
      }),
      [value, handleValueChange],
    );

    return (
      <MenubarRadioGroupContext.Provider value={contextValue}>
        {/* biome-ignore lint/a11y/useSemanticElements: role="group" is correct for menu radio groups per WAI-ARIA APG */}
        <div ref={ref} role="group" {...props} />
      </MenubarRadioGroupContext.Provider>
    );
  },
);

MenubarRadioGroup.displayName = 'MenubarRadioGroup';

// ==================== MenubarRadioItem ====================

export interface MenubarRadioItemProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  value: string;
  disabled?: boolean;
  onSelect?: (event: Event) => void;
}

export const MenubarRadioItem = React.forwardRef<HTMLDivElement, MenubarRadioItemProps>(
  ({ className, value, disabled, onSelect, onClick, onKeyDown, children, ...props }, ref) => {
    const { value: selectedValue, onValueChange } = useMenubarRadioGroupContext();
    const { onItemSelect } = useMenubarContentContext();

    const checked = value === selectedValue;

    const handleSelect = React.useCallback(() => {
      if (disabled) return;

      const event = new Event('select', { cancelable: true });
      onSelect?.(event);

      if (!event.defaultPrevented) {
        onValueChange(value);
        onItemSelect();
      }
    }, [disabled, onSelect, onValueChange, value, onItemSelect]);

    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
      onClick?.(event);
      handleSelect();
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelect();
      }
    };

    return (
      <div
        ref={ref}
        role="menuitemradio"
        aria-checked={checked}
        tabIndex={disabled ? undefined : -1}
        aria-disabled={disabled || undefined}
        data-disabled={disabled ? '' : undefined}
        data-state={checked ? 'checked' : 'unchecked'}
        className={classy(
          'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
          'transition-colors focus:bg-accent focus:text-accent-foreground',
          'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
          className,
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...props}
      >
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          {checked && <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />}
        </span>
        {children}
      </div>
    );
  },
);

MenubarRadioItem.displayName = 'MenubarRadioItem';

// ==================== MenubarSeparator ====================

export interface MenubarSeparatorProps extends React.HTMLAttributes<HTMLHRElement> {}

export const MenubarSeparator = React.forwardRef<HTMLHRElement, MenubarSeparatorProps>(
  ({ className, ...props }, ref) => {
    return (
      <hr ref={ref} className={classy('-mx-1 my-1 h-px border-0 bg-muted', className)} {...props} />
    );
  },
);

MenubarSeparator.displayName = 'MenubarSeparator';

// ==================== MenubarShortcut ====================

export interface MenubarShortcutProps extends React.HTMLAttributes<HTMLSpanElement> {}

export function MenubarShortcut({ className, ...props }: MenubarShortcutProps) {
  return (
    <span className={classy('ml-auto text-xs tracking-widest opacity-60', className)} {...props} />
  );
}

// ==================== MenubarSub ====================

export interface MenubarSubProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function MenubarSub({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
}: MenubarSubProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);

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

  const id = React.useId();
  const contentId = `menubar-submenu-content-${id}`;
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  const contextValue = React.useMemo(
    () => ({
      open,
      onOpenChange: handleOpenChange,
      triggerRef,
      contentId,
    }),
    [open, handleOpenChange, contentId],
  );

  return <MenubarSubContext.Provider value={contextValue}>{children}</MenubarSubContext.Provider>;
}

// ==================== MenubarSubTrigger ====================

export interface MenubarSubTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
  disabled?: boolean;
}

export const MenubarSubTrigger = React.forwardRef<HTMLDivElement, MenubarSubTriggerProps>(
  (
    { className, inset, disabled, onPointerEnter, onPointerLeave, onKeyDown, children, ...props },
    ref,
  ) => {
    const subContext = useMenubarSubContext();
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    if (!subContext) {
      throw new Error('MenubarSubTrigger must be used within MenubarSub');
    }

    const { open, onOpenChange, triggerRef, contentId } = subContext;

    // Compose refs
    const composedRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        triggerRef.current = node as unknown as HTMLButtonElement;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref, triggerRef],
    );

    const handlePointerEnter = (event: React.PointerEvent<HTMLDivElement>) => {
      onPointerEnter?.(event);
      if (disabled) return;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        onOpenChange(true);
      }, 100);
    };

    const handlePointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
      onPointerLeave?.(event);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        onOpenChange(false);
      }, 100);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      if (disabled) return;

      if (event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onOpenChange(true);
      }
    };

    React.useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    return (
      <div
        ref={composedRef}
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={contentId}
        tabIndex={disabled ? undefined : -1}
        aria-disabled={disabled || undefined}
        data-disabled={disabled ? '' : undefined}
        data-state={open ? 'open' : 'closed'}
        className={classy(
          'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
          'transition-colors focus:bg-accent focus:text-accent-foreground',
          'data-[state=open]:bg-accent',
          'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
          inset && 'pl-8',
          className,
        )}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {children}
        <svg
          className="ml-auto h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    );
  },
);

MenubarSubTrigger.displayName = 'MenubarSubTrigger';

// ==================== MenubarSubContent ====================

export interface MenubarSubContentProps extends Omit<MenubarContentProps, 'side' | 'align'> {}

export const MenubarSubContent = React.forwardRef<HTMLDivElement, MenubarSubContentProps>(
  ({ className, onPointerEnter, onPointerLeave, ...props }, ref) => {
    const subContext = useMenubarSubContext();
    const menuContext = useMenubarMenuContext();
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    if (!subContext) {
      throw new Error('MenubarSubContent must be used within MenubarSub');
    }

    const { open, onOpenChange } = subContext;

    const handlePointerEnter = (event: React.PointerEvent<HTMLDivElement>) => {
      onPointerEnter?.(event as React.PointerEvent<HTMLDivElement>);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };

    const handlePointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
      onPointerLeave?.(event as React.PointerEvent<HTMLDivElement>);
      timeoutRef.current = setTimeout(() => {
        onOpenChange(false);
      }, 100);
    };

    React.useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    if (!open) {
      return null;
    }

    return (
      <MenubarMenuContext.Provider value={menuContext}>
        <MenubarContent
          ref={ref}
          className={className}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          {...props}
        />
      </MenubarMenuContext.Provider>
    );
  },
);

MenubarSubContent.displayName = 'MenubarSubContent';

// ==================== Namespaced Export (shadcn style) ====================

MenubarMenu.displayName = 'MenubarMenu';
MenubarPortal.displayName = 'MenubarPortal';
MenubarShortcut.displayName = 'MenubarShortcut';
MenubarSub.displayName = 'MenubarSub';

export const Menubar = Object.assign(MenubarRoot, {
  Menu: MenubarMenu,
  Trigger: MenubarTrigger,
  Portal: MenubarPortal,
  Content: MenubarContent,
  Group: MenubarGroup,
  Label: MenubarLabel,
  Item: MenubarItem,
  CheckboxItem: MenubarCheckboxItem,
  RadioGroup: MenubarRadioGroup,
  RadioItem: MenubarRadioItem,
  Separator: MenubarSeparator,
  Shortcut: MenubarShortcut,
  Sub: MenubarSub,
  SubTrigger: MenubarSubTrigger,
  SubContent: MenubarSubContent,
});
