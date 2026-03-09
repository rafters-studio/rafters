/**
 * Dropdown menu component for contextual action menus
 *
 * @cognitive-load 4/10 - Menu navigation with multiple options requires scanning and selection
 * @attention-economics Contextual actions: appears on demand, groups related actions logically
 * @trust-building Typeahead search for quick access, clear hover states, keyboard navigation
 * @accessibility Full keyboard support (arrows, typeahead), proper ARIA menu role, roving focus
 * @semantic-meaning Action menu: Item=action, CheckboxItem=toggle, RadioItem=exclusive selection, Sub=nested group
 *
 * @usage-patterns
 * DO: Group related actions logically with separators
 * DO: Use keyboard shortcuts with Kbd component for common actions
 * DO: Limit to 7±2 items per menu level (Miller's Law)
 * DO: Use submenus sparingly for complex action hierarchies
 * NEVER: Primary actions, navigation, more than 2 levels of nesting
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *   <DropdownMenu.Trigger asChild>
 *     <Button variant="ghost">Options</Button>
 *   </DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Item>Edit</DropdownMenu.Item>
 *     <DropdownMenu.Item>Duplicate</DropdownMenu.Item>
 *     <DropdownMenu.Separator />
 *     <DropdownMenu.Item variant="destructive">Delete</DropdownMenu.Item>
 *   </DropdownMenu.Content>
 * </DropdownMenu>
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

interface DropdownMenuContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

interface DropdownMenuContentContextValue {
  onItemSelect: () => void;
}

interface DropdownMenuRadioGroupContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

interface DropdownMenuSubContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  contentId: string;
}

// ==================== Contexts ====================

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);
const DropdownMenuContentContext = React.createContext<DropdownMenuContentContextValue | null>(
  null,
);
const DropdownMenuRadioGroupContext =
  React.createContext<DropdownMenuRadioGroupContextValue | null>(null);
const DropdownMenuSubContext = React.createContext<DropdownMenuSubContextValue | null>(null);

function useDropdownMenuContext() {
  const context = React.useContext(DropdownMenuContext);
  if (!context) {
    throw new Error('DropdownMenu components must be used within DropdownMenu');
  }
  return context;
}

function useDropdownMenuContentContext() {
  const context = React.useContext(DropdownMenuContentContext);
  if (!context) {
    throw new Error('DropdownMenuItem must be used within DropdownMenuContent');
  }
  return context;
}

function useDropdownMenuRadioGroupContext() {
  const context = React.useContext(DropdownMenuRadioGroupContext);
  if (!context) {
    throw new Error('DropdownMenuRadioItem must be used within DropdownMenuRadioGroup');
  }
  return context;
}

function useDropdownMenuSubContext() {
  const context = React.useContext(DropdownMenuSubContext);
  return context;
}

// ==================== DropdownMenu (Root) ====================

export interface DropdownMenuProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DropdownMenu({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
}: DropdownMenuProps) {
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
  const contentId = `dropdown-menu-content-${id}`;
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  const contextValue = React.useMemo(
    () => ({
      open,
      onOpenChange: handleOpenChange,
      contentId,
      triggerRef,
    }),
    [open, handleOpenChange, contentId],
  );

  return (
    <DropdownMenuContext.Provider value={contextValue}>{children}</DropdownMenuContext.Provider>
  );
}

// ==================== DropdownMenuTrigger ====================

export interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
  ({ asChild, onClick, ...props }, ref) => {
    const { open, onOpenChange, contentId, triggerRef } = useDropdownMenuContext();

    const composedRef = React.useCallback(
      (node: HTMLButtonElement | null) => {
        triggerRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref, triggerRef],
    );

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      onOpenChange(!open);
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
        ...ariaProps,
        onClick: handleClick,
      } as Partial<unknown>);
    }

    return (
      <button ref={composedRef} type="button" onClick={handleClick} {...ariaProps} {...props} />
    );
  },
);

DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

// ==================== DropdownMenuPortal ====================

export interface DropdownMenuPortalProps {
  children: React.ReactNode;
  container?: HTMLElement | null;
  forceMount?: boolean;
}

export function DropdownMenuPortal({ children, container, forceMount }: DropdownMenuPortalProps) {
  const { open } = useDropdownMenuContext();
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

// ==================== DropdownMenuContent ====================

export interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
  forceMount?: boolean;
  side?: Side;
  align?: Align;
  sideOffset?: number;
  alignOffset?: number;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  onPointerDownOutside?: (event: PointerEvent | TouchEvent) => void;
  onCloseAutoFocus?: (event: Event) => void;
  loop?: boolean;
}

export const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  (
    {
      asChild,
      forceMount,
      side = 'bottom',
      align = 'start',
      sideOffset = 4,
      alignOffset = 0,
      onEscapeKeyDown: onEscapeKeyDownProp,
      onPointerDownOutside: onPointerDownOutsideProp,
      onCloseAutoFocus: _onCloseAutoFocus,
      loop = true,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const { open, onOpenChange, contentId, triggerRef } = useDropdownMenuContext();
    const subContext = useDropdownMenuSubContext();
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

    // Get anchor element (trigger or submenu trigger)
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
          onOpenChange(false);
          triggerRef.current?.focus();
        }
      });

      return cleanup;
    }, [open, onOpenChange, onEscapeKeyDownProp, triggerRef]);

    // Outside click handler
    React.useEffect(() => {
      if (!open || !contentRef.current) return;

      const cleanup = onPointerDownOutside(contentRef.current, (event) => {
        const target = event.target as Node;
        if (triggerRef.current?.contains(target)) {
          return;
        }

        onPointerDownOutsideProp?.(event);

        if (!event.defaultPrevented) {
          onOpenChange(false);
        }
      });

      return cleanup;
    }, [open, onOpenChange, onPointerDownOutsideProp, triggerRef]);

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

    // Handle item selection
    const onItemSelect = React.useCallback(() => {
      onOpenChange(false);
      triggerRef.current?.focus();
    }, [onOpenChange, triggerRef]);

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
        'z-depth-dropdown min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
        'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className,
      ),
      style: contentStyle,
      ...props,
    };

    let content: React.ReactNode;

    if (asChild && React.isValidElement(props.children)) {
      content = (
        <DropdownMenuContentContext.Provider value={contentContextValue}>
          {React.cloneElement(props.children, contentProps as Partial<unknown>)}
        </DropdownMenuContentContext.Provider>
      );
    } else {
      content = (
        <DropdownMenuContentContext.Provider value={contentContextValue}>
          <div {...contentProps} />
        </DropdownMenuContentContext.Provider>
      );
    }

    // Portal to body for proper positioning
    const portalContainer = getPortalContainer({ enabled: true });
    if (portalContainer) {
      return createPortal(content, portalContainer);
    }
    return content;
  },
);

DropdownMenuContent.displayName = 'DropdownMenuContent';

// ==================== DropdownMenuGroup ====================

export interface DropdownMenuGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DropdownMenuGroup = React.forwardRef<HTMLDivElement, DropdownMenuGroupProps>(
  ({ ...props }, ref) => {
    // biome-ignore lint/a11y/useSemanticElements: role="group" is correct for menu groups per WAI-ARIA APG
    return <div ref={ref} role="group" {...props} />;
  },
);

DropdownMenuGroup.displayName = 'DropdownMenuGroup';

// ==================== DropdownMenuLabel ====================

export interface DropdownMenuLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}

export const DropdownMenuLabel = React.forwardRef<HTMLDivElement, DropdownMenuLabelProps>(
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

DropdownMenuLabel.displayName = 'DropdownMenuLabel';

// ==================== DropdownMenuItem ====================

export interface DropdownMenuItemProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  inset?: boolean;
  disabled?: boolean;
  onSelect?: (event: Event) => void;
}

export const DropdownMenuItem = React.forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  ({ className, inset, disabled, onSelect, onClick, onKeyDown, ...props }, ref) => {
    const { onItemSelect } = useDropdownMenuContentContext();

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

DropdownMenuItem.displayName = 'DropdownMenuItem';

// ==================== DropdownMenuCheckboxItem ====================

export interface DropdownMenuCheckboxItemProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  checked?: boolean;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onSelect?: (event: Event) => void;
}

export const DropdownMenuCheckboxItem = React.forwardRef<
  HTMLDivElement,
  DropdownMenuCheckboxItemProps
>(
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
    const { onItemSelect } = useDropdownMenuContentContext();

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

DropdownMenuCheckboxItem.displayName = 'DropdownMenuCheckboxItem';

// ==================== DropdownMenuRadioGroup ====================

export interface DropdownMenuRadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
}

export const DropdownMenuRadioGroup = React.forwardRef<HTMLDivElement, DropdownMenuRadioGroupProps>(
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
      <DropdownMenuRadioGroupContext.Provider value={contextValue}>
        {/* biome-ignore lint/a11y/useSemanticElements: role="group" is correct for menu radio groups per WAI-ARIA APG */}
        <div ref={ref} role="group" {...props} />
      </DropdownMenuRadioGroupContext.Provider>
    );
  },
);

DropdownMenuRadioGroup.displayName = 'DropdownMenuRadioGroup';

// ==================== DropdownMenuRadioItem ====================

export interface DropdownMenuRadioItemProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  value: string;
  disabled?: boolean;
  onSelect?: (event: Event) => void;
}

export const DropdownMenuRadioItem = React.forwardRef<HTMLDivElement, DropdownMenuRadioItemProps>(
  ({ className, value, disabled, onSelect, onClick, onKeyDown, children, ...props }, ref) => {
    const { value: selectedValue, onValueChange } = useDropdownMenuRadioGroupContext();
    const { onItemSelect } = useDropdownMenuContentContext();

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

DropdownMenuRadioItem.displayName = 'DropdownMenuRadioItem';

// ==================== DropdownMenuSeparator ====================

export interface DropdownMenuSeparatorProps extends React.HTMLAttributes<HTMLHRElement> {}

export const DropdownMenuSeparator = React.forwardRef<HTMLHRElement, DropdownMenuSeparatorProps>(
  ({ className, ...props }, ref) => {
    return (
      <hr ref={ref} className={classy('-mx-1 my-1 h-px border-0 bg-muted', className)} {...props} />
    );
  },
);

DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';

// ==================== DropdownMenuShortcut ====================

export interface DropdownMenuShortcutProps extends React.HTMLAttributes<HTMLSpanElement> {}

export function DropdownMenuShortcut({ className, ...props }: DropdownMenuShortcutProps) {
  return (
    <span className={classy('ml-auto text-xs tracking-widest opacity-60', className)} {...props} />
  );
}

// ==================== DropdownMenuSub ====================

export interface DropdownMenuSubProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DropdownMenuSub({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
}: DropdownMenuSubProps) {
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
  const contentId = `dropdown-submenu-content-${id}`;
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

  return (
    <DropdownMenuSubContext.Provider value={contextValue}>
      {children}
    </DropdownMenuSubContext.Provider>
  );
}

// ==================== DropdownMenuSubTrigger ====================

export interface DropdownMenuSubTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
  disabled?: boolean;
}

export const DropdownMenuSubTrigger = React.forwardRef<HTMLDivElement, DropdownMenuSubTriggerProps>(
  (
    { className, inset, disabled, onPointerEnter, onPointerLeave, onKeyDown, children, ...props },
    ref,
  ) => {
    const subContext = useDropdownMenuSubContext();
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    if (!subContext) {
      throw new Error('DropdownMenuSubTrigger must be used within DropdownMenuSub');
    }

    const { open, onOpenChange, triggerRef, contentId } = subContext;

    // Compose refs
    const composedRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        // Store as button ref for positioning (cast is intentional for trigger ref compatibility)
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

DropdownMenuSubTrigger.displayName = 'DropdownMenuSubTrigger';

// ==================== DropdownMenuSubContent ====================

export interface DropdownMenuSubContentProps
  extends Omit<DropdownMenuContentProps, 'side' | 'align'> {}

export const DropdownMenuSubContent = React.forwardRef<HTMLDivElement, DropdownMenuSubContentProps>(
  ({ className, onPointerEnter, onPointerLeave, ...props }, ref) => {
    const subContext = useDropdownMenuSubContext();
    const parentContext = useDropdownMenuContext();
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    if (!subContext) {
      throw new Error('DropdownMenuSubContent must be used within DropdownMenuSub');
    }

    const { open, onOpenChange } = subContext;

    const handlePointerEnter = (event: React.PointerEvent<HTMLDivElement>) => {
      onPointerEnter?.(event as unknown as React.PointerEvent<HTMLDivElement>);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };

    const handlePointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
      onPointerLeave?.(event as unknown as React.PointerEvent<HTMLDivElement>);
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
      <DropdownMenuContext.Provider value={parentContext}>
        <DropdownMenuContent
          ref={ref}
          className={className}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          {...props}
        />
      </DropdownMenuContext.Provider>
    );
  },
);

DropdownMenuSubContent.displayName = 'DropdownMenuSubContent';

// ==================== Namespaced Export (shadcn style) ====================

DropdownMenu.Trigger = DropdownMenuTrigger;
DropdownMenu.Portal = DropdownMenuPortal;
DropdownMenu.Content = DropdownMenuContent;
DropdownMenu.Group = DropdownMenuGroup;
DropdownMenu.Label = DropdownMenuLabel;
DropdownMenu.Item = DropdownMenuItem;
DropdownMenu.CheckboxItem = DropdownMenuCheckboxItem;
DropdownMenu.RadioGroup = DropdownMenuRadioGroup;
DropdownMenu.RadioItem = DropdownMenuRadioItem;
DropdownMenu.Separator = DropdownMenuSeparator;
DropdownMenu.Shortcut = DropdownMenuShortcut;
DropdownMenu.Sub = DropdownMenuSub;
DropdownMenu.SubTrigger = DropdownMenuSubTrigger;
DropdownMenu.SubContent = DropdownMenuSubContent;

DropdownMenu.displayName = 'DropdownMenu';
DropdownMenuPortal.displayName = 'DropdownMenuPortal';
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut';
DropdownMenuSub.displayName = 'DropdownMenuSub';

// Re-export root as DropdownMenuRoot alias for shadcn compatibility
export { DropdownMenu as DropdownMenuRoot };
