/**
 * Menubar component for application-style horizontal menu navigation
 *
 * Behavior (which top-level menu is open, Arrow Left/Right + Home/End across triggers,
 * Arrow Up/Down + typeahead within an open menu, escape / outside-click dismissal,
 * focus-first-item-on-open, focus-return-to-trigger-on-close, and ARIA / visibility
 * reflection) lives in the framework-agnostic createMenubar controller, which composes
 * the shared primitives (selection-group + roving-focus + typeahead + escape-keydown +
 * outside-click). React renders the markup and delegates to the controller via a
 * callback ref - the same controller the Astro and web-component wrappers use, so
 * behavior cannot drift between frameworks.
 *
 * Inactive menu content stays MOUNTED but hidden (the controller toggles `hidden` +
 * `data-state`), mirroring tabs/accordion. Checkbox/radio item checked state is light
 * local React state - it is not part of the open/active-menu behavior the controller owns.
 *
 * @cognitive-load 5/10 - Horizontal menu bar with nested dropdowns requires spatial awareness
 * @attention-economics Application navigation: always visible, groups commands by category
 * @trust-building Familiar desktop app pattern (File, Edit, View...), keyboard shortcuts
 * @accessibility Full keyboard support, role="menubar" on root, role="menu" on dropdowns
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
 *       <MenubarSeparator />
 *       <MenubarItem>Print...</MenubarItem>
 *     </MenubarContent>
 *   </MenubarMenu>
 *   <MenubarMenu>
 *     <MenubarTrigger>Edit</MenubarTrigger>
 *     <MenubarContent>
 *       <MenubarItem>Undo <MenubarShortcut>Cmd+Z</MenubarShortcut></MenubarItem>
 *     </MenubarContent>
 *   </MenubarMenu>
 * </Menubar>
 * ```
 */

import * as React from 'react';
import classy from '../../primitives/classy';
import { mergeProps } from '../../primitives/slot';
import {
  menubarCheckboxIndicatorClasses,
  menubarCheckboxItemClasses,
  menubarCheckIconClasses,
  menubarContentClasses,
  menubarInsetClasses,
  menubarItemClasses,
  menubarLabelClasses,
  menubarRadioDotClasses,
  menubarRadioIndicatorClasses,
  menubarRadioItemClasses,
  menubarRootClasses,
  menubarSeparatorClasses,
  menubarShortcutClasses,
  menubarSubTriggerClasses,
  menubarSubTriggerIconClasses,
  menubarTriggerClasses,
} from './menubar.classes';
import { createMenubar, type MenubarController } from './menubar.controller';

// ==================== Contexts ====================

// Menu context carries only the stable value + ARIA ids for one menu. All open/close
// behavior lives in the controller, so there is no open state threaded through context.
interface MenubarMenuContextValue {
  /** The menu's value (also used as data-value and the menu's id namespace). */
  value: string;
  triggerId: string;
  contentId: string;
}

const MenubarMenuContext = React.createContext<MenubarMenuContextValue | null>(null);

function useMenubarMenuContext() {
  const context = React.useContext(MenubarMenuContext);
  if (!context) {
    throw new Error('MenubarMenu components must be used within MenubarMenu');
  }
  return context;
}

// Radio group context: checked state for radio items (light local state, not controller-owned).
interface MenubarRadioGroupContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const MenubarRadioGroupContext = React.createContext<MenubarRadioGroupContextValue | null>(null);

function useMenubarRadioGroupContext() {
  const context = React.useContext(MenubarRadioGroupContext);
  if (!context) {
    throw new Error('MenubarRadioItem must be used within MenubarRadioGroup');
  }
  return context;
}

// Sub context: open state for a single submenu (light local state). Submenus are a
// nested disclosure inside an open menu; the top-level open/close is the part the
// controller owns. Submenu open/close stays as local React state here.
interface MenubarSubContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string;
}

const MenubarSubContext = React.createContext<MenubarSubContextValue | null>(null);

function useMenubarSubContext() {
  return React.useContext(MenubarSubContext);
}

// ==================== Menubar (Root) ====================

export interface MenubarProps extends React.HTMLAttributes<HTMLDivElement> {
  loop?: boolean;
}

const MenubarRoot = React.forwardRef<HTMLDivElement, MenubarProps>(
  ({ className, loop = true, children, ...props }, ref) => {
    const controllerRef = React.useRef<MenubarController | null>(null);
    const nodeRef = React.useRef<HTMLDivElement | null>(null);

    React.useImperativeHandle(ref, () => nodeRef.current as HTMLDivElement);

    // Mount the controller via a callback ref: runs during commit (before paint), so
    // initial open state is reflected with no flash, and React renders no open-derived
    // attributes, so re-renders cannot clobber the controller.
    const setRoot = React.useCallback(
      (node: HTMLDivElement | null) => {
        nodeRef.current = node;
        if (!node) return;
        const controller = createMenubar(node, { loop });
        controllerRef.current = controller;
        return () => {
          controller.destroy();
          controllerRef.current = null;
        };
      },
      [loop],
    );

    return (
      <div
        ref={setRoot}
        role="menubar"
        className={classy(menubarRootClasses, className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);

MenubarRoot.displayName = 'Menubar';

// ==================== MenubarMenu ====================

export interface MenubarMenuProps {
  children: React.ReactNode;
}

export function MenubarMenu({ children }: MenubarMenuProps) {
  const id = React.useId();
  const value = `menubar-menu-${id}`;
  const triggerId = `${value}-trigger`;
  const contentId = `${value}-content`;

  const contextValue = React.useMemo(
    () => ({ value, triggerId, contentId }),
    [value, triggerId, contentId],
  );

  return <MenubarMenuContext.Provider value={contextValue}>{children}</MenubarMenuContext.Provider>;
}

// ==================== MenubarTrigger ====================

export interface MenubarTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const MenubarTrigger = React.forwardRef<HTMLButtonElement, MenubarTriggerProps>(
  ({ asChild, className, ...props }, ref) => {
    const { value, triggerId, contentId } = useMenubarMenuContext();

    // No aria-expanded / data-state / tabindex / onClick here: the controller reflects
    // open state and handles activation (click delegation + roving focus) on the root.
    const triggerProps = {
      ref,
      type: 'button' as const,
      role: 'menuitem' as const,
      id: triggerId,
      'aria-haspopup': 'menu' as const,
      'aria-controls': contentId,
      'data-menubar-trigger': '',
      'data-value': value,
      className: classy(menubarTriggerClasses, className),
    };

    if (asChild && React.isValidElement(props.children)) {
      const child = props.children as React.ReactElement<Record<string, unknown>>;
      const childProps = (child.props ?? {}) as Record<string, unknown>;
      const merged = mergeProps(triggerProps as Partial<unknown>, childProps);
      return React.cloneElement(child, merged as Partial<Record<string, unknown>>);
    }

    return <button {...triggerProps} {...props} />;
  },
);

MenubarTrigger.displayName = 'MenubarTrigger';

// ==================== MenubarPortal ====================

export interface MenubarPortalProps {
  children: React.ReactNode;
  container?: HTMLElement | null;
  forceMount?: boolean;
}

// Retained for API stability. In the controller model, menu content stays mounted in
// the DOM (the controller toggles visibility), so the portal is a passthrough.
export function MenubarPortal({ children }: MenubarPortalProps) {
  return <>{children}</>;
}

MenubarPortal.displayName = 'MenubarPortal';

// ==================== MenubarContent ====================

export interface MenubarContentProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
  loop?: boolean;
}

export const MenubarContent = React.forwardRef<HTMLDivElement, MenubarContentProps>(
  ({ asChild, loop, className, children, ...props }, ref) => {
    const { value, triggerId, contentId } = useMenubarMenuContext();

    // Always mounted; the controller sets hidden + data-state (closed by default on
    // mount via subscribe). Roving focus / typeahead are mounted by the controller on open.
    const contentProps = {
      ref,
      id: contentId,
      role: 'menu' as const,
      'aria-labelledby': triggerId,
      'aria-orientation': 'vertical' as const,
      'data-menubar-content': '',
      'data-value': value,
      hidden: true,
      className: classy(menubarContentClasses, className),
    };

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<Record<string, unknown>>;
      const childProps = (child.props ?? {}) as Record<string, unknown>;
      const merged = mergeProps(contentProps as Partial<unknown>, childProps);
      return React.cloneElement(child, merged as Partial<Record<string, unknown>>);
    }

    return (
      <div {...contentProps} {...props}>
        {children}
      </div>
    );
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
        className={classy(menubarLabelClasses, inset && menubarInsetClasses, className)}
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
  ({ className, inset, disabled, onSelect, onClick, ...props }, ref) => {
    // The controller closes the menu and returns focus on item click/Enter/Space. This
    // handler only runs the user's onSelect; selection always closes the menu (matching
    // the prior activation behavior).
    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
      onClick?.(event);
      if (disabled) return;
      onSelect?.(new Event('select', { cancelable: true }));
    };

    return (
      // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard activation (Enter/Space) is handled by the createMenubar controller, which synthesizes the click on the focused item
      <div
        ref={ref}
        role="menuitem"
        tabIndex={disabled ? undefined : -1}
        aria-disabled={disabled || undefined}
        data-disabled={disabled ? '' : undefined}
        className={classy(menubarItemClasses, inset && menubarInsetClasses, className)}
        onClick={handleClick}
        {...props}
      />
    );
  },
);

MenubarItem.displayName = 'MenubarItem';

// ==================== MenubarCheckboxItem ====================

export interface MenubarCheckboxItemProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onSelect'
> {
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
      children,
      ...props
    },
    ref,
  ) => {
    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
      onClick?.(event);
      if (disabled) return;
      onSelect?.(new Event('select', { cancelable: true }));
      onCheckedChange?.(!checked);
    };

    return (
      // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard activation (Enter/Space) is handled by the createMenubar controller, which synthesizes the click on the focused item
      <div
        ref={ref}
        role="menuitemcheckbox"
        aria-checked={checked}
        tabIndex={disabled ? undefined : -1}
        aria-disabled={disabled || undefined}
        data-disabled={disabled ? '' : undefined}
        data-state={checked ? 'checked' : 'unchecked'}
        className={classy(menubarCheckboxItemClasses, className)}
        onClick={handleClick}
        {...props}
      >
        <div className={menubarCheckboxIndicatorClasses} aria-hidden="true">
          {checked && (
            <svg
              className={menubarCheckIconClasses}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
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
      () => ({ value, onValueChange: handleValueChange }),
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

export interface MenubarRadioItemProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onSelect'
> {
  value: string;
  disabled?: boolean;
  onSelect?: (event: Event) => void;
}

export const MenubarRadioItem = React.forwardRef<HTMLDivElement, MenubarRadioItemProps>(
  ({ className, value, disabled, onSelect, onClick, children, ...props }, ref) => {
    const { value: selectedValue, onValueChange } = useMenubarRadioGroupContext();
    const checked = value === selectedValue;

    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
      onClick?.(event);
      if (disabled) return;
      onSelect?.(new Event('select', { cancelable: true }));
      onValueChange(value);
    };

    return (
      // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard activation (Enter/Space) is handled by the createMenubar controller, which synthesizes the click on the focused item
      <div
        ref={ref}
        role="menuitemradio"
        aria-checked={checked}
        tabIndex={disabled ? undefined : -1}
        aria-disabled={disabled || undefined}
        data-disabled={disabled ? '' : undefined}
        data-state={checked ? 'checked' : 'unchecked'}
        className={classy(menubarRadioItemClasses, className)}
        onClick={handleClick}
        {...props}
      >
        <div className={menubarRadioIndicatorClasses} aria-hidden="true">
          {checked && <div className={menubarRadioDotClasses} aria-hidden="true" />}
        </div>
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
    return <hr ref={ref} className={classy(menubarSeparatorClasses, className)} {...props} />;
  },
);

MenubarSeparator.displayName = 'MenubarSeparator';

// ==================== MenubarShortcut ====================

export interface MenubarShortcutProps extends React.HTMLAttributes<HTMLDivElement> {}

export function MenubarShortcut({ className, ...props }: MenubarShortcutProps) {
  // A right-aligned shortcut hint; rendered as a div to satisfy the system typography
  // rule (no raw span with className). menubarShortcutClasses pushes it to the trailing edge.
  return <div className={classy(menubarShortcutClasses, className)} {...props} />;
}

MenubarShortcut.displayName = 'MenubarShortcut';

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

  const contextValue = React.useMemo(
    () => ({ open, onOpenChange: handleOpenChange, contentId }),
    [open, handleOpenChange, contentId],
  );

  return <MenubarSubContext.Provider value={contextValue}>{children}</MenubarSubContext.Provider>;
}

MenubarSub.displayName = 'MenubarSub';

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

    const { open, onOpenChange, contentId } = subContext;

    // Submenu open-on-hover (with a small delay) stays as local behavior - it is a
    // nested disclosure inside an already-open menu, not the top-level open/close the
    // controller owns.
    const handlePointerEnter = (event: React.PointerEvent<HTMLDivElement>) => {
      onPointerEnter?.(event);
      if (disabled) return;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => onOpenChange(true), 100);
    };

    const handlePointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
      onPointerLeave?.(event);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => onOpenChange(false), 100);
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
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }, []);

    return (
      <div
        ref={ref}
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={contentId}
        tabIndex={disabled ? undefined : -1}
        aria-disabled={disabled || undefined}
        data-disabled={disabled ? '' : undefined}
        data-state={open ? 'open' : 'closed'}
        className={classy(menubarSubTriggerClasses, inset && menubarInsetClasses, className)}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {children}
        <svg
          className={menubarSubTriggerIconClasses}
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

export interface MenubarSubContentProps extends React.HTMLAttributes<HTMLDivElement> {
  loop?: boolean;
}

export const MenubarSubContent = React.forwardRef<HTMLDivElement, MenubarSubContentProps>(
  ({ className, loop, onPointerEnter, onPointerLeave, children, ...props }, ref) => {
    const subContext = useMenubarSubContext();
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    if (!subContext) {
      throw new Error('MenubarSubContent must be used within MenubarSub');
    }

    const { open, onOpenChange, contentId } = subContext;

    const handlePointerEnter = (event: React.PointerEvent<HTMLDivElement>) => {
      onPointerEnter?.(event);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    const handlePointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
      onPointerLeave?.(event);
      timeoutRef.current = setTimeout(() => onOpenChange(false), 100);
    };

    React.useEffect(() => {
      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }, []);

    // Submenu content mounts only while open (local disclosure state, not controller-owned).
    if (!open) {
      return null;
    }

    return (
      <div
        ref={ref}
        id={contentId}
        role="menu"
        aria-orientation="vertical"
        data-state="open"
        className={classy(menubarContentClasses, className)}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        {...props}
      >
        {children}
      </div>
    );
  },
);

MenubarSubContent.displayName = 'MenubarSubContent';

// ==================== Namespaced Export (shadcn style) ====================

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
