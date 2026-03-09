/**
 * Context menu component for right-click contextual actions
 *
 * @cognitive-load 4/10 - Menu navigation with multiple options requires scanning and selection
 * @attention-economics Contextual actions: appears on right-click at cursor position, groups related actions logically
 * @trust-building Typeahead search for quick access, clear hover states, keyboard navigation
 * @accessibility Full keyboard support (arrows, typeahead), proper ARIA menu role, roving focus
 * @semantic-meaning Context menu: Item=action, CheckboxItem=toggle, RadioItem=exclusive selection, Sub=nested group
 *
 * @usage-patterns
 * DO: Group related actions logically with separators
 * DO: Use keyboard shortcuts with Kbd component for common actions
 * DO: Limit to 7 plus-minus 2 items per menu level (Miller's Law)
 * DO: Use submenus sparingly for complex action hierarchies
 * NEVER: Primary actions, navigation, more than 2 levels of nesting
 *
 * @example
 * ```tsx
 * <ContextMenu>
 *   <ContextMenu.Trigger>
 *     <div>Right-click me</div>
 *   </ContextMenu.Trigger>
 *   <ContextMenu.Content>
 *     <ContextMenu.Item>Edit</ContextMenu.Item>
 *     <ContextMenu.Item>Duplicate</ContextMenu.Item>
 *     <ContextMenu.Separator />
 *     <ContextMenu.Item>Delete</ContextMenu.Item>
 *   </ContextMenu.Content>
 * </ContextMenu>
 * ```
 */

import * as React from 'react';
import { createPortal } from 'react-dom';
import classy from '../../primitives/classy';
import { onEscapeKeyDown } from '../../primitives/escape-keydown';
import { onPointerDownOutside } from '../../primitives/outside-click';
import { getPortalContainer } from '../../primitives/portal';
import { createRovingFocus } from '../../primitives/roving-focus';
import { createTypeahead } from '../../primitives/typeahead';

// ==================== Types ====================

interface ContextMenuContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string;
  position: { x: number; y: number };
  setPosition: (position: { x: number; y: number }) => void;
}

interface ContextMenuContentContextValue {
  onItemSelect: () => void;
}

interface ContextMenuRadioGroupContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

interface ContextMenuSubContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLDivElement | null>;
  contentId: string;
}

// ==================== Contexts ====================

const ContextMenuContext = React.createContext<ContextMenuContextValue | null>(null);
const ContextMenuContentContext = React.createContext<ContextMenuContentContextValue | null>(null);
const ContextMenuRadioGroupContext = React.createContext<ContextMenuRadioGroupContextValue | null>(
  null,
);
const ContextMenuSubContext = React.createContext<ContextMenuSubContextValue | null>(null);

function useContextMenuContext() {
  const context = React.useContext(ContextMenuContext);
  if (!context) {
    throw new Error('ContextMenu components must be used within ContextMenu');
  }
  return context;
}

function useContextMenuContentContext() {
  const context = React.useContext(ContextMenuContentContext);
  if (!context) {
    throw new Error('ContextMenuItem must be used within ContextMenuContent');
  }
  return context;
}

function useContextMenuRadioGroupContext() {
  const context = React.useContext(ContextMenuRadioGroupContext);
  if (!context) {
    throw new Error('ContextMenuRadioItem must be used within ContextMenuRadioGroup');
  }
  return context;
}

function useContextMenuSubContext() {
  const context = React.useContext(ContextMenuSubContext);
  return context;
}

// ==================== ContextMenu (Root) ====================

export interface ContextMenuProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ContextMenu({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
}: ContextMenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });

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
  const contentId = `context-menu-content-${id}`;

  const contextValue = React.useMemo(
    () => ({
      open,
      onOpenChange: handleOpenChange,
      contentId,
      position,
      setPosition,
    }),
    [open, handleOpenChange, contentId, position],
  );

  return <ContextMenuContext.Provider value={contextValue}>{children}</ContextMenuContext.Provider>;
}

// ==================== ContextMenuTrigger ====================

export interface ContextMenuTriggerProps extends React.HTMLAttributes<HTMLSpanElement> {
  asChild?: boolean;
  disabled?: boolean;
}

export const ContextMenuTrigger = React.forwardRef<HTMLSpanElement, ContextMenuTriggerProps>(
  ({ asChild, disabled, onContextMenu, children, ...props }, ref) => {
    const { onOpenChange, setPosition } = useContextMenuContext();

    const handleContextMenu = (event: React.MouseEvent<HTMLSpanElement>) => {
      if (disabled) return;

      event.preventDefault();
      onContextMenu?.(event);

      setPosition({ x: event.clientX, y: event.clientY });
      onOpenChange(true);
    };

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        ref,
        onContextMenu: handleContextMenu,
        'data-disabled': disabled ? '' : undefined,
        ...props,
      } as Partial<unknown>);
    }

    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: Context menu trigger requires onContextMenu which has no keyboard equivalent by design
      <span
        ref={ref}
        onContextMenu={handleContextMenu}
        data-disabled={disabled ? '' : undefined}
        {...props}
      >
        {children}
      </span>
    );
  },
);

ContextMenuTrigger.displayName = 'ContextMenuTrigger';

// ==================== ContextMenuPortal ====================

export interface ContextMenuPortalProps {
  children: React.ReactNode;
  container?: HTMLElement | null;
  forceMount?: boolean;
}

export function ContextMenuPortal({ children, container, forceMount }: ContextMenuPortalProps) {
  const { open } = useContextMenuContext();
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

// ==================== ContextMenuContent ====================

export interface ContextMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
  forceMount?: boolean;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  onPointerDownOutside?: (event: PointerEvent | TouchEvent) => void;
  loop?: boolean;
  alignOffset?: number;
  avoidCollisions?: boolean;
}

export const ContextMenuContent = React.forwardRef<HTMLDivElement, ContextMenuContentProps>(
  (
    {
      asChild,
      forceMount,
      onEscapeKeyDown: onEscapeKeyDownProp,
      onPointerDownOutside: onPointerDownOutsideProp,
      loop = true,
      alignOffset = 0,
      avoidCollisions = true,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const { open, onOpenChange, contentId, position } = useContextMenuContext();
    const subContext = useContextMenuSubContext();
    const contentRef = React.useRef<HTMLDivElement>(null);
    const [adjustedPosition, setAdjustedPosition] = React.useState<{ x: number; y: number }>({
      x: 0,
      y: 0,
    });

    // Compose refs
    React.useImperativeHandle(ref, () => contentRef.current as HTMLDivElement);

    // Adjust position to avoid collisions with viewport edges
    React.useEffect(() => {
      if (!open || !contentRef.current) return;

      const adjustPosition = () => {
        const content = contentRef.current;
        if (!content) return;

        const rect = content.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let x = position.x;
        let y = position.y;

        if (avoidCollisions) {
          // Adjust horizontal position if menu would overflow right edge
          if (x + rect.width > viewportWidth) {
            x = Math.max(0, viewportWidth - rect.width - 8);
          }

          // Adjust vertical position if menu would overflow bottom edge
          if (y + rect.height > viewportHeight) {
            y = Math.max(0, viewportHeight - rect.height - 8);
          }
        }

        setAdjustedPosition({ x, y: y + alignOffset });
      };

      // Use requestAnimationFrame to ensure content is rendered before measuring
      const frame = requestAnimationFrame(adjustPosition);

      return () => cancelAnimationFrame(frame);
    }, [open, position, alignOffset, avoidCollisions]);

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
        }
      });

      return cleanup;
    }, [open, onOpenChange, onEscapeKeyDownProp]);

    // Outside click handler
    React.useEffect(() => {
      if (!open || !contentRef.current) return;

      const cleanup = onPointerDownOutside(contentRef.current, (event) => {
        onPointerDownOutsideProp?.(event);

        if (!event.defaultPrevented) {
          onOpenChange(false);
        }
      });

      return cleanup;
    }, [open, onOpenChange, onPointerDownOutsideProp]);

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
    }, [onOpenChange]);

    const contentContextValue = React.useMemo(() => ({ onItemSelect }), [onItemSelect]);

    const shouldRender = forceMount || open;

    if (!shouldRender) {
      return null;
    }

    const contentStyle: React.CSSProperties = {
      ...style,
      position: 'fixed',
      left: adjustedPosition.x,
      top: adjustedPosition.y,
    };

    const contentProps = {
      ref: contentRef,
      id: subContext ? subContext.contentId : contentId,
      role: 'menu',
      'aria-orientation': 'vertical' as const,
      'data-state': open ? 'open' : 'closed',
      className: classy(
        'z-depth-dropdown min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        className,
      ),
      style: contentStyle,
      ...props,
    };

    let content: React.ReactNode;

    if (asChild && React.isValidElement(props.children)) {
      content = (
        <ContextMenuContentContext.Provider value={contentContextValue}>
          {React.cloneElement(props.children, contentProps as Partial<unknown>)}
        </ContextMenuContentContext.Provider>
      );
    } else {
      content = (
        <ContextMenuContentContext.Provider value={contentContextValue}>
          <div {...contentProps} />
        </ContextMenuContentContext.Provider>
      );
    }

    const portalContainer = getPortalContainer({ enabled: true });
    if (portalContainer) {
      return createPortal(content, portalContainer);
    }
    return content;
  },
);

ContextMenuContent.displayName = 'ContextMenuContent';

// ==================== ContextMenuGroup ====================

export interface ContextMenuGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

export const ContextMenuGroup = React.forwardRef<HTMLDivElement, ContextMenuGroupProps>(
  ({ ...props }, ref) => {
    // biome-ignore lint/a11y/useSemanticElements: role="group" is correct for menu groups per WAI-ARIA APG
    return <div ref={ref} role="group" {...props} />;
  },
);

ContextMenuGroup.displayName = 'ContextMenuGroup';

// ==================== ContextMenuLabel ====================

export interface ContextMenuLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}

export const ContextMenuLabel = React.forwardRef<HTMLDivElement, ContextMenuLabelProps>(
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

ContextMenuLabel.displayName = 'ContextMenuLabel';

// ==================== ContextMenuItem ====================

export interface ContextMenuItemProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  inset?: boolean;
  disabled?: boolean;
  onSelect?: (event: Event) => void;
}

export const ContextMenuItem = React.forwardRef<HTMLDivElement, ContextMenuItemProps>(
  ({ className, inset, disabled, onSelect, onClick, onKeyDown, ...props }, ref) => {
    const { onItemSelect } = useContextMenuContentContext();

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

ContextMenuItem.displayName = 'ContextMenuItem';

// ==================== ContextMenuCheckboxItem ====================

export interface ContextMenuCheckboxItemProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  checked?: boolean;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onSelect?: (event: Event) => void;
}

export const ContextMenuCheckboxItem = React.forwardRef<
  HTMLDivElement,
  ContextMenuCheckboxItemProps
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
    const { onItemSelect } = useContextMenuContentContext();

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

ContextMenuCheckboxItem.displayName = 'ContextMenuCheckboxItem';

// ==================== ContextMenuRadioGroup ====================

export interface ContextMenuRadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
}

export const ContextMenuRadioGroup = React.forwardRef<HTMLDivElement, ContextMenuRadioGroupProps>(
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
      <ContextMenuRadioGroupContext.Provider value={contextValue}>
        {/* biome-ignore lint/a11y/useSemanticElements: role="group" is correct for menu radio groups per WAI-ARIA APG */}
        <div ref={ref} role="group" {...props} />
      </ContextMenuRadioGroupContext.Provider>
    );
  },
);

ContextMenuRadioGroup.displayName = 'ContextMenuRadioGroup';

// ==================== ContextMenuRadioItem ====================

export interface ContextMenuRadioItemProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  value: string;
  disabled?: boolean;
  onSelect?: (event: Event) => void;
}

export const ContextMenuRadioItem = React.forwardRef<HTMLDivElement, ContextMenuRadioItemProps>(
  ({ className, value, disabled, onSelect, onClick, onKeyDown, children, ...props }, ref) => {
    const { value: selectedValue, onValueChange } = useContextMenuRadioGroupContext();
    const { onItemSelect } = useContextMenuContentContext();

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

ContextMenuRadioItem.displayName = 'ContextMenuRadioItem';

// ==================== ContextMenuSeparator ====================

export interface ContextMenuSeparatorProps extends React.HTMLAttributes<HTMLHRElement> {}

export const ContextMenuSeparator = React.forwardRef<HTMLHRElement, ContextMenuSeparatorProps>(
  ({ className, ...props }, ref) => {
    return (
      <hr ref={ref} className={classy('-mx-1 my-1 h-px border-0 bg-muted', className)} {...props} />
    );
  },
);

ContextMenuSeparator.displayName = 'ContextMenuSeparator';

// ==================== ContextMenuShortcut ====================

export interface ContextMenuShortcutProps extends React.HTMLAttributes<HTMLSpanElement> {}

export function ContextMenuShortcut({ className, ...props }: ContextMenuShortcutProps) {
  return (
    <span className={classy('ml-auto text-xs tracking-widest opacity-60', className)} {...props} />
  );
}

// ==================== ContextMenuSub ====================

export interface ContextMenuSubProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ContextMenuSub({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
}: ContextMenuSubProps) {
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
  const contentId = `context-submenu-content-${id}`;
  const triggerRef = React.useRef<HTMLDivElement | null>(null);

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
    <ContextMenuSubContext.Provider value={contextValue}>{children}</ContextMenuSubContext.Provider>
  );
}

// ==================== ContextMenuSubTrigger ====================

export interface ContextMenuSubTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
  disabled?: boolean;
}

export const ContextMenuSubTrigger = React.forwardRef<HTMLDivElement, ContextMenuSubTriggerProps>(
  (
    { className, inset, disabled, onPointerEnter, onPointerLeave, onKeyDown, children, ...props },
    ref,
  ) => {
    const subContext = useContextMenuSubContext();
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    if (!subContext) {
      throw new Error('ContextMenuSubTrigger must be used within ContextMenuSub');
    }

    const { open, onOpenChange, triggerRef, contentId } = subContext;

    // Compose refs
    const composedRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        triggerRef.current = node;
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

ContextMenuSubTrigger.displayName = 'ContextMenuSubTrigger';

// ==================== ContextMenuSubContent ====================

export interface ContextMenuSubContentProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
  forceMount?: boolean;
  loop?: boolean;
}

export const ContextMenuSubContent = React.forwardRef<HTMLDivElement, ContextMenuSubContentProps>(
  ({ className, forceMount, loop = true, onPointerEnter, onPointerLeave, ...props }, ref) => {
    const subContext = useContextMenuSubContext();
    const parentContext = useContextMenuContext();
    const contentRef = React.useRef<HTMLDivElement>(null);
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const [position, setPosition] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [mounted, setMounted] = React.useState(false);

    // Extract values from context (may be null)
    const open = subContext?.open ?? false;
    const onOpenChange = subContext?.onOpenChange;
    const triggerRef = subContext?.triggerRef;
    const contentId = subContext?.contentId ?? '';

    React.useEffect(() => {
      setMounted(true);
    }, []);

    // Compose refs
    React.useImperativeHandle(ref, () => contentRef.current as HTMLDivElement);

    // Position submenu relative to trigger
    React.useEffect(() => {
      if (!open || !triggerRef || !triggerRef.current || !contentRef.current) return;

      const updatePosition = () => {
        const trigger = triggerRef?.current;
        const content = contentRef.current;
        if (!trigger || !content) return;

        const triggerRect = trigger.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let x = triggerRect.right + 2;
        let y = triggerRect.top - 4;

        // Adjust if submenu would overflow right edge
        if (x + contentRect.width > viewportWidth) {
          x = triggerRect.left - contentRect.width - 2;
        }

        // Adjust if submenu would overflow bottom edge
        if (y + contentRect.height > viewportHeight) {
          y = Math.max(0, viewportHeight - contentRect.height - 8);
        }

        setPosition({ x, y });
      };

      const frame = requestAnimationFrame(updatePosition);

      return () => cancelAnimationFrame(frame);
    }, [open, triggerRef]);

    // Setup roving focus for submenu
    React.useEffect(() => {
      if (!open || !contentRef.current) return;

      const cleanup = createRovingFocus(contentRef.current, {
        orientation: 'vertical',
        loop,
      });

      return cleanup;
    }, [open, loop]);

    // Setup typeahead for submenu
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

    // Focus first item when submenu opens
    React.useEffect(() => {
      if (!open || !contentRef.current) return;

      // Small delay to ensure content is positioned
      const timeoutId = setTimeout(() => {
        const firstItem = contentRef.current?.querySelector<HTMLElement>(
          '[role="menuitem"]:not([disabled]), [role="menuitemcheckbox"]:not([disabled]), [role="menuitemradio"]:not([disabled])',
        );

        if (firstItem) {
          firstItem.focus();
        }
      }, 0);

      return () => clearTimeout(timeoutId);
    }, [open]);

    const handlePointerEnter = (event: React.PointerEvent<HTMLDivElement>) => {
      onPointerEnter?.(event);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };

    const handlePointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
      onPointerLeave?.(event);
      timeoutRef.current = setTimeout(() => {
        onOpenChange?.(false);
      }, 100);
    };

    React.useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    // Provide nested content context for item selection
    // Must be defined before conditional returns to maintain hook order
    const onItemSelect = React.useCallback(() => {
      onOpenChange?.(false);
      parentContext.onOpenChange(false);
    }, [onOpenChange, parentContext]);

    const contentContextValue = React.useMemo(() => ({ onItemSelect }), [onItemSelect]);

    const shouldRender = forceMount || open;

    // Must be used within ContextMenuSub
    if (!subContext) {
      throw new Error('ContextMenuSubContent must be used within ContextMenuSub');
    }

    if (!shouldRender || !mounted) {
      return null;
    }

    const portalContainer = getPortalContainer({ enabled: true });
    if (!portalContainer) {
      return null;
    }

    const contentStyle: React.CSSProperties = {
      position: 'fixed',
      left: position.x,
      top: position.y,
    };

    return createPortal(
      <ContextMenuContentContext.Provider value={contentContextValue}>
        <div
          ref={contentRef}
          id={contentId}
          role="menu"
          aria-orientation="vertical"
          data-state={open ? 'open' : 'closed'}
          className={classy(
            'z-depth-dropdown min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            className,
          )}
          style={contentStyle}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          {...props}
        />
      </ContextMenuContentContext.Provider>,
      portalContainer,
    );
  },
);

ContextMenuSubContent.displayName = 'ContextMenuSubContent';

// ==================== Namespaced Export (shadcn style) ====================

ContextMenu.Trigger = ContextMenuTrigger;
ContextMenu.Portal = ContextMenuPortal;
ContextMenu.Content = ContextMenuContent;
ContextMenu.Group = ContextMenuGroup;
ContextMenu.Label = ContextMenuLabel;
ContextMenu.Item = ContextMenuItem;
ContextMenu.CheckboxItem = ContextMenuCheckboxItem;
ContextMenu.RadioGroup = ContextMenuRadioGroup;
ContextMenu.RadioItem = ContextMenuRadioItem;
ContextMenu.Separator = ContextMenuSeparator;
ContextMenu.Shortcut = ContextMenuShortcut;
ContextMenu.Sub = ContextMenuSub;
ContextMenu.SubTrigger = ContextMenuSubTrigger;
ContextMenu.SubContent = ContextMenuSubContent;

// Re-export root as ContextMenuRoot alias for shadcn compatibility
export { ContextMenu as ContextMenuRoot };
