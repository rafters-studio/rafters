/**
 * Dropdown selection component with search and accessibility features
 *
 * @cognitive-load 5/10 - Option selection with search functionality requires cognitive processing
 * @attention-economics State management: closed=compact display, open=full options, searching=filtered results
 * @trust-building Search functionality, clear selection indication, undo patterns for accidental selections
 * @accessibility Keyboard navigation, screen reader announcements, focus management, option grouping
 * @semantic-meaning Option structure: value=data, label=display, group=categorization, disabled=unavailable choices
 *
 * @usage-patterns
 * DO: Use 3-12 choices for optimal cognitive load
 * DO: Provide clear, descriptive option text
 * DO: Pre-select most common/safe option when appropriate
 * DO: Enable search for 8+ options to reduce cognitive load
 * NEVER: Too many options without grouping, unclear option descriptions
 *
 * @example
 * ```tsx
 * // shadcn-compatible usage (drop-in replacement)
 * import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@rafters/ui';
 *
 * <Select>
 *   <SelectTrigger>
 *     <SelectValue placeholder="Choose option..." />
 *   </SelectTrigger>
 *   <SelectContent>
 *     <SelectItem value="option1">Option 1</SelectItem>
 *     <SelectItem value="option2">Option 2</SelectItem>
 *   </SelectContent>
 * </Select>
 *
 * // Or with namespaced imports
 * <Select>
 *   <Select.Trigger>
 *     <Select.Value placeholder="Choose option..." />
 *   </Select.Trigger>
 *   <Select.Content>
 *     <Select.Item value="option1">Option 1</Select.Item>
 *     <Select.Item value="option2">Option 2</Select.Item>
 *   </Select.Content>
 * </Select>
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

// ==================== Context ====================

interface SelectContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string | undefined;
  onValueChange: (value: string) => void;
  disabled: boolean;
  contentId: string;
  triggerId: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  name: string | undefined;
  highlightedValue: string | undefined;
  onHighlightChange: (value: string | undefined) => void;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext() {
  const context = React.useContext(SelectContext);
  if (!context) {
    throw new Error('Select components must be used within Select');
  }
  return context;
}

// ==================== Select (Root) ====================

export interface SelectProps {
  children: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  name?: string;
}

export function Select({
  children,
  value: controlledValue,
  defaultValue = '',
  onValueChange,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
  name,
}: SelectProps) {
  // Uncontrolled state for value
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const isValueControlled = controlledValue !== undefined;
  const value = isValueControlled ? controlledValue : uncontrolledValue;

  // Uncontrolled state for open
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isOpenControlled = controlledOpen !== undefined;
  const open = isOpenControlled ? controlledOpen : uncontrolledOpen;

  // Highlighted item for keyboard navigation
  const [highlightedValue, setHighlightedValue] = React.useState<string | undefined>(undefined);

  const handleValueChange = React.useCallback(
    (newValue: string) => {
      if (!isValueControlled) {
        setUncontrolledValue(newValue);
      }
      onValueChange?.(newValue);
    },
    [isValueControlled, onValueChange],
  );

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (disabled) return;
      if (!isOpenControlled) {
        setUncontrolledOpen(newOpen);
      }
      onOpenChange?.(newOpen);
      // Reset highlight when closing
      if (!newOpen) {
        setHighlightedValue(undefined);
      }
    },
    [isOpenControlled, onOpenChange, disabled],
  );

  // Generate stable IDs
  const id = React.useId();
  const contentId = `select-content-${id}`;
  const triggerId = `select-trigger-${id}`;

  // Refs
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  const contextValue = React.useMemo(
    () => ({
      open,
      onOpenChange: handleOpenChange,
      value,
      onValueChange: handleValueChange,
      disabled,
      contentId,
      triggerId,
      triggerRef,
      contentRef,
      name,
      highlightedValue,
      onHighlightChange: setHighlightedValue,
    }),
    [
      open,
      handleOpenChange,
      value,
      handleValueChange,
      disabled,
      contentId,
      triggerId,
      name,
      highlightedValue,
    ],
  );

  return <SelectContext.Provider value={contextValue}>{children}</SelectContext.Provider>;
}

// ==================== SelectTrigger ====================

export interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  /** Trigger size variant */
  size?: 'sm' | 'default';
}

export function SelectTrigger({
  className,
  children,
  asChild,
  size = 'default',
  ...props
}: SelectTriggerProps) {
  const {
    open,
    onOpenChange,
    disabled,
    contentId,
    triggerId,
    triggerRef,
    value,
    onHighlightChange,
  } = useSelectContext();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    props.onClick?.(event);
    if (!event.defaultPrevented) {
      onOpenChange(!open);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    props.onKeyDown?.(event);
    if (event.defaultPrevented) return;

    // Open on ArrowDown, ArrowUp, Enter, or Space
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key) && !open) {
      event.preventDefault();
      onOpenChange(true);
      // Highlight current value when opening with keyboard
      if (value) {
        onHighlightChange(value);
      }
    }
  };

  const buttonClassName = classy(
    'flex w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm ring-offset-background',
    'placeholder:text-muted-foreground',
    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    '[&>span]:line-clamp-1',
    size === 'default' && 'h-9 py-2',
    size === 'sm' && 'h-8 py-1.5',
    className,
  );

  const ariaProps = {
    id: triggerId,
    role: 'combobox' as const,
    'aria-expanded': open,
    'aria-haspopup': 'listbox' as const,
    'aria-controls': contentId,
    'data-state': open ? 'open' : 'closed',
    'data-disabled': disabled ? '' : undefined,
    'data-size': size,
  };

  // Chevron icon (included automatically like shadcn)
  const chevronIcon = (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0 opacity-50"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ref: triggerRef,
      ...ariaProps,
      disabled,
      onClick: handleClick,
      onKeyDown: handleKeyDown,
    } as Partial<unknown>);
  }

  return (
    <button
      ref={triggerRef}
      type="button"
      disabled={disabled}
      className={buttonClassName}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...ariaProps}
      {...props}
    >
      {children}
      {chevronIcon}
    </button>
  );
}

// ==================== SelectValue ====================

export interface SelectValueProps extends React.HTMLAttributes<HTMLSpanElement> {
  placeholder?: string;
  asChild?: boolean;
}

export function SelectValue({
  placeholder,
  className,
  asChild,
  children,
  ...props
}: SelectValueProps) {
  const { value } = useSelectContext();

  // Find the selected item's label from context or children
  // For simplicity, we display value or placeholder
  const displayValue = value || placeholder;
  const isPlaceholder = !value;

  const spanClassName = classy(isPlaceholder ? 'text-muted-foreground' : '', className);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      className: spanClassName,
      ...props,
    } as Partial<unknown>);
  }

  return (
    <span className={spanClassName} {...props}>
      {children ?? displayValue}
    </span>
  );
}

// ==================== SelectPortal ====================

export interface SelectPortalProps {
  children: React.ReactNode;
  container?: HTMLElement | null;
}

export function SelectPortal({ children, container }: SelectPortalProps) {
  const { open } = useSelectContext();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const portalContainer = getPortalContainer(
    container !== undefined ? { container, enabled: true } : { enabled: true },
  );

  if (!open || !mounted || !portalContainer) {
    return null;
  }

  return createPortal(children, portalContainer);
}

// ==================== SelectContent ====================

export interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: Side;
  align?: Align;
  sideOffset?: number;
  alignOffset?: number;
  asChild?: boolean;
}

export function SelectContent({
  className,
  children,
  side = 'bottom',
  align = 'start',
  sideOffset = 4,
  alignOffset = 0,
  style,
  asChild,
  ...props
}: SelectContentProps) {
  const {
    open,
    onOpenChange,
    contentId,
    triggerRef,
    contentRef,
    value,
    onValueChange,
    onHighlightChange,
    highlightedValue,
  } = useSelectContext();

  const [positionState, setPositionState] = React.useState<{
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

  // Position the content
  React.useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const anchorElement = triggerRef.current;
      const floatingElement = contentRef.current;

      if (!anchorElement || !floatingElement) return;

      const result = computePosition(anchorElement, floatingElement, {
        side,
        align,
        sideOffset,
        alignOffset,
        avoidCollisions: true,
      });

      setPositionState({
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
  }, [open, side, align, sideOffset, alignOffset, triggerRef, contentRef]);

  // Escape key handler
  React.useEffect(() => {
    if (!open) return;

    const cleanup = onEscapeKeyDown(() => {
      onOpenChange(false);
      triggerRef.current?.focus();
    });

    return cleanup;
  }, [open, onOpenChange, triggerRef]);

  // Outside click handler
  React.useEffect(() => {
    if (!open || !contentRef.current) return;

    const cleanup = onPointerDownOutside(contentRef.current, (event) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) {
        return;
      }
      onOpenChange(false);
    });

    return cleanup;
  }, [open, onOpenChange, triggerRef, contentRef]);

  // Roving focus for keyboard navigation
  React.useEffect(() => {
    if (!open || !contentRef.current) return;

    const cleanup = createRovingFocus(contentRef.current, {
      orientation: 'vertical',
      loop: true,
      onNavigate: (element) => {
        const itemValue = element.getAttribute('data-value');
        if (itemValue) {
          onHighlightChange(itemValue);
        }
      },
    });

    return cleanup;
  }, [open, contentRef, onHighlightChange]);

  // Typeahead search
  React.useEffect(() => {
    if (!open || !contentRef.current) return;

    const cleanup = createTypeahead(contentRef.current, {
      getItems: () =>
        contentRef.current?.querySelectorAll('[role="option"]:not([data-disabled])') ?? [],
      onMatch: (item) => {
        item.focus();
        const itemValue = item.getAttribute('data-value');
        if (itemValue) {
          onHighlightChange(itemValue);
        }
      },
    });

    return cleanup;
  }, [open, contentRef, onHighlightChange]);

  // Focus first item on open
  React.useEffect(() => {
    if (!open || !contentRef.current) return;

    const focusInitialItem = () => {
      const items = contentRef.current?.querySelectorAll<HTMLElement>(
        '[role="option"]:not([data-disabled])',
      );
      if (!items || items.length === 0) return;

      // Focus selected item or first item
      let targetItem: HTMLElement | undefined;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item && item.getAttribute('data-value') === value) {
          targetItem = item;
          break;
        }
      }

      if (!targetItem) {
        targetItem = items[0];
      }

      if (targetItem) {
        targetItem.focus();
        const itemValue = targetItem.getAttribute('data-value');
        if (itemValue) {
          onHighlightChange(itemValue);
        }
      }
    };

    const frame = requestAnimationFrame(focusInitialItem);
    return () => cancelAnimationFrame(frame);
  }, [open, contentRef, value, onHighlightChange]);

  // Handle keyboard selection
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    props.onKeyDown?.(event);
    if (event.defaultPrevented) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (highlightedValue) {
        onValueChange(highlightedValue);
        onOpenChange(false);
        triggerRef.current?.focus();
      }
    }

    if (event.key === 'Tab') {
      event.preventDefault();
    }
  };

  if (!open) {
    return null;
  }

  const contentStyle: React.CSSProperties = {
    ...style,
    position: 'fixed',
    left: 0,
    top: 0,
    transform: `translate(${Math.round(positionState.x)}px, ${Math.round(positionState.y)}px)`,
    minWidth: triggerRef.current?.offsetWidth,
  };

  const contentClassName = classy(
    'z-depth-dropdown max-h-96 min-w-32 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md',
    'data-[state=open]:animate-in data-[state=closed]:animate-out',
    'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
    'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
    'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
    'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
    className,
  );

  const contentProps = {
    ref: contentRef,
    id: contentId,
    role: 'listbox' as const,
    'data-state': open ? 'open' : 'closed',
    'data-side': positionState.side,
    'data-align': positionState.align,
    className: contentClassName,
    style: contentStyle,
    onKeyDown: handleKeyDown,
    ...props,
  };

  const content =
    asChild && React.isValidElement(children) ? (
      React.cloneElement(children, contentProps as Partial<unknown>)
    ) : (
      <div {...contentProps}>
        <div className="p-1">{children}</div>
      </div>
    );

  // Portal to body for proper positioning
  const portalContainer = getPortalContainer({ enabled: true });
  if (portalContainer) {
    return createPortal(content, portalContainer);
  }
  return content;
}

// ==================== SelectViewport ====================

export interface SelectViewportProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

export function SelectViewport({ className, children, asChild, ...props }: SelectViewportProps) {
  const viewportClassName = classy('p-1', className);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      className: viewportClassName,
      ...props,
    } as Partial<unknown>);
  }

  return (
    <div className={viewportClassName} {...props}>
      {children}
    </div>
  );
}

// ==================== SelectGroup ====================

export interface SelectGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

export function SelectGroup({ className, children, asChild, ...props }: SelectGroupProps) {
  const groupClassName = classy('', className);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      className: groupClassName,
      role: 'group',
      ...props,
    } as Partial<unknown>);
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: role="group" is correct for select option groups per WAI-ARIA APG
    <div role="group" className={groupClassName} {...props}>
      {children}
    </div>
  );
}

// ==================== SelectLabel ====================

export interface SelectLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

export function SelectLabel({ className, children, asChild, ...props }: SelectLabelProps) {
  const labelClassName = classy('py-1.5 pl-8 pr-2 text-sm font-semibold', className);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      className: labelClassName,
      ...props,
    } as Partial<unknown>);
  }

  return (
    <div className={labelClassName} {...props}>
      {children}
    </div>
  );
}

// ==================== SelectItem ====================

export interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  disabled?: boolean;
  asChild?: boolean;
}

export function SelectItem({
  className,
  children,
  value: itemValue,
  disabled = false,
  asChild,
  ...props
}: SelectItemProps) {
  const { value, onValueChange, onOpenChange, triggerRef, highlightedValue, onHighlightChange } =
    useSelectContext();

  const isSelected = value === itemValue;
  const isHighlighted = highlightedValue === itemValue;

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    props.onClick?.(event);
    if (event.defaultPrevented || disabled) return;

    onValueChange(itemValue);
    onOpenChange(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    props.onKeyDown?.(event);
    if (event.defaultPrevented || disabled) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onValueChange(itemValue);
      onOpenChange(false);
      triggerRef.current?.focus();
    }
  };

  const handlePointerMove = () => {
    if (!disabled && highlightedValue !== itemValue) {
      onHighlightChange(itemValue);
    }
  };

  const itemClassName = classy(
    'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
    'focus:bg-accent focus:text-accent-foreground',
    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
    className,
  );

  const itemProps = {
    role: 'option' as const,
    'aria-selected': isSelected,
    'data-state': isSelected ? 'checked' : 'unchecked',
    'data-disabled': disabled ? '' : undefined,
    'data-highlighted': isHighlighted ? '' : undefined,
    'data-value': itemValue,
    'data-roving-item': '',
    tabIndex: disabled ? undefined : -1,
    className: itemClassName,
    onClick: handleClick,
    onKeyDown: handleKeyDown,
    onPointerMove: handlePointerMove,
    ...props,
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, itemProps as Partial<unknown>);
  }

  return (
    <div {...itemProps}>
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {isSelected && (
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      {children}
    </div>
  );
}

// ==================== SelectSeparator ====================

export interface SelectSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

export function SelectSeparator({ className, asChild, ...props }: SelectSeparatorProps) {
  const separatorClassName = classy('-mx-1 my-1 h-px bg-muted', className);

  if (asChild && React.isValidElement(props.children)) {
    return React.cloneElement(props.children, {
      className: separatorClassName,
      'aria-hidden': true,
      ...props,
    } as Partial<unknown>);
  }

  return <div aria-hidden="true" className={separatorClassName} {...props} />;
}

// ==================== SelectIcon ====================

export interface SelectIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  asChild?: boolean;
}

/**
 * @deprecated The icon is now included in SelectTrigger automatically.
 * This component is kept for backwards compatibility.
 */
export function SelectIcon({ className, children, asChild, ...props }: SelectIconProps) {
  const iconClassName = classy('ml-auto h-4 w-4 shrink-0 opacity-50', className);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      className: iconClassName,
      ...props,
    } as Partial<unknown>);
  }

  return (
    <span className={iconClassName} {...props}>
      {children ?? (
        <svg
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      )}
    </span>
  );
}

// ==================== SelectScrollUpButton ====================

export interface SelectScrollUpButtonProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

/**
 * Scroll up button for Select dropdown.
 * Shows when content is scrollable and not at top.
 */
export function SelectScrollUpButton({
  className,
  children,
  asChild,
  ...props
}: SelectScrollUpButtonProps) {
  const buttonClassName = classy('flex cursor-default items-center justify-center py-1', className);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      className: buttonClassName,
      'aria-hidden': true,
      ...props,
    } as Partial<unknown>);
  }

  return (
    <div className={buttonClassName} aria-hidden="true" {...props}>
      {children ?? (
        <svg
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
        >
          <path d="m18 15-6-6-6 6" />
        </svg>
      )}
    </div>
  );
}

// ==================== SelectScrollDownButton ====================

export interface SelectScrollDownButtonProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

/**
 * Scroll down button for Select dropdown.
 * Shows when content is scrollable and not at bottom.
 */
export function SelectScrollDownButton({
  className,
  children,
  asChild,
  ...props
}: SelectScrollDownButtonProps) {
  const buttonClassName = classy('flex cursor-default items-center justify-center py-1', className);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      className: buttonClassName,
      'aria-hidden': true,
      ...props,
    } as Partial<unknown>);
  }

  return (
    <div className={buttonClassName} aria-hidden="true" {...props}>
      {children ?? (
        <svg
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      )}
    </div>
  );
}

// ==================== Namespaced Export ====================

Select.Trigger = SelectTrigger;
Select.Value = SelectValue;
Select.Portal = SelectPortal;
Select.Content = SelectContent;
Select.Viewport = SelectViewport;
Select.Group = SelectGroup;
Select.Label = SelectLabel;
Select.Item = SelectItem;
Select.Separator = SelectSeparator;
Select.Icon = SelectIcon;
Select.ScrollUpButton = SelectScrollUpButton;
Select.ScrollDownButton = SelectScrollDownButton;

// Re-export root alias
export { Select as SelectRoot };
