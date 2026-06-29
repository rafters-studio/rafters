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
import type { Memory } from '../../primitives/memory';
import { onPointerDownOutside } from '../../primitives/outside-click';
import { getPortalContainer } from '../../primitives/portal';
import { createRovingFocus } from '../../primitives/roving-focus';
import type { SelectionGroupState } from '../../primitives/selection-group';
import { mergeProps } from '../../primitives/slot';
import { createTypeahead } from '../../primitives/typeahead';
import type { Align, Side } from '../../primitives/types';
import {
  selectChevronClasses,
  selectContentAnimateClasses,
  selectContentBaseClasses,
  selectContentFadeClasses,
  selectContentPaddingClasses,
  selectContentSlideClasses,
  selectContentZoomClasses,
  selectIconClasses,
  selectItemBaseClasses,
  selectItemDisabledClasses,
  selectItemFocusClasses,
  selectItemIndicatorClasses,
  selectLabelClasses,
  selectScrollButtonClasses,
  selectScrollIconClasses,
  selectSeparatorClasses,
  selectTriggerBaseClasses,
  selectTriggerDisabledClasses,
  selectTriggerFocusClasses,
  selectTriggerLineClampClasses,
  selectTriggerPlaceholderClasses,
  selectValuePlaceholderClasses,
  selectViewportClasses,
} from './select.classes';
import { createSelect, type SelectCellState, type SelectController } from './select.controller';

// ==================== Slice subscription ====================

// Subscribe a component to one slice of a Memory cell. Re-renders only when the
// selected slice changes (useSyncExternalStore bails out via Object.is), so an
// open consumer never re-renders on a labelVersion bump and vice versa.
function useMemorySlice<T, S>(memory: Memory<T>, selector: (value: T) => S): S {
  const subscribe = React.useCallback(
    (onStoreChange: () => void) => memory.subscribe(() => onStoreChange()),
    [memory],
  );
  const getSnapshot = React.useCallback(() => selector(memory.get()), [memory, selector]);
  return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

const selectOpen = (state: SelectCellState): boolean => state.open;
const selectHighlighted = (state: SelectCellState): string | undefined => state.highlightedValue;
const selectLabelVersion = (state: SelectCellState): number => state.labelVersion;
const selectFirstValue = (state: SelectionGroupState): string | undefined => state.selected[0];

// ==================== Context ====================

// Context carries the framework-free controller plus the static plumbing (ids, refs,
// disabled, name). Reactive state (open / value / highlight / labels) is read by each
// leaf via useMemorySlice, so a label registration re-renders SelectValue without
// churning the open/highlight consumers.
interface SelectContextValue {
  controller: SelectController;
  disabled: boolean;
  contentId: string;
  triggerId: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  name: string | undefined;
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
  const isValueControlled = controlledValue !== undefined;
  const isOpenControlled = controlledOpen !== undefined;

  // Capture the initial value/open once; the controller owns state thereafter.
  const initialValueRef = React.useRef(isValueControlled ? controlledValue : defaultValue);
  const initialOpenRef = React.useRef(isOpenControlled ? controlledOpen : defaultOpen);

  // Keep the latest callbacks reachable without re-creating the controller.
  const onValueChangeRef = React.useRef(onValueChange);
  const onOpenChangeRef = React.useRef(onOpenChange);
  React.useEffect(() => {
    onValueChangeRef.current = onValueChange;
    onOpenChangeRef.current = onOpenChange;
  });

  // The framework-free controller is the single source of truth for state. Lazily
  // created once (no DOM root needed - roving/typeahead are wired as effects below).
  const controllerRef = React.useRef<SelectController | null>(null);
  if (controllerRef.current === null) {
    controllerRef.current = createSelect({
      // Empty string means "no selection" - omit so the group starts empty.
      ...(initialValueRef.current === '' ? {} : { initialValue: initialValueRef.current }),
      initialOpen: initialOpenRef.current,
      onValueChange: (next) => onValueChangeRef.current?.(next),
      onOpenChange: (next) => onOpenChangeRef.current?.(next),
    });
  }
  const controller = controllerRef.current;

  React.useEffect(() => () => controller.destroy(), [controller]);

  // Controlled value: mirror the prop into the group (no callback re-fire).
  React.useEffect(() => {
    if (!isValueControlled) return;
    const next = controlledValue ?? '';
    if (controller.group.get()[0] !== next) {
      controller.setValue(next);
    }
  }, [isValueControlled, controlledValue, controller]);

  // Controlled open: mirror the prop into the cell directly (no onOpenChange re-fire),
  // preserving the close-clears-highlight reset.
  React.useEffect(() => {
    if (!isOpenControlled) return;
    const next = controlledOpen ?? false;
    if (controller.cell.get().open !== next) {
      controller.cell.patch(next ? { open: true } : { open: false, highlightedValue: undefined });
    }
  }, [isOpenControlled, controlledOpen, controller]);

  // Generate stable IDs
  const id = React.useId();
  const contentId = `select-content-${id}`;
  const triggerId = `select-trigger-${id}`;

  // Refs
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  const contextValue = React.useMemo(
    () => ({
      controller,
      disabled,
      contentId,
      triggerId,
      triggerRef,
      contentRef,
      name,
    }),
    [controller, disabled, contentId, triggerId, name],
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
  const { controller, disabled, contentId, triggerId, triggerRef } = useSelectContext();
  const open = useMemorySlice(controller.cell, selectOpen);
  const value = useMemorySlice(controller.group.memory, selectFirstValue);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    props.onClick?.(event);
    if (!event.defaultPrevented && !disabled) {
      controller.setOpen(!open);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    props.onKeyDown?.(event);
    if (event.defaultPrevented || disabled) return;

    // Open on ArrowDown, ArrowUp, Enter, or Space
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key) && !open) {
      event.preventDefault();
      controller.setOpen(true);
      // Highlight current value when opening with keyboard
      if (value) {
        controller.setHighlighted(value);
      }
    }
  };

  const buttonClassName = classy(
    selectTriggerBaseClasses,
    selectTriggerPlaceholderClasses,
    selectTriggerFocusClasses,
    selectTriggerDisabledClasses,
    selectTriggerLineClampClasses,
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
      className={selectChevronClasses}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>;
    const childProps = (child.props ?? {}) as Record<string, unknown>;
    const merged = mergeProps(
      {
        ref: triggerRef,
        ...ariaProps,
        disabled,
        onClick: handleClick,
        onKeyDown: handleKeyDown,
      } as Partial<unknown>,
      childProps,
    );
    return React.cloneElement(child, merged as Partial<Record<string, unknown>>);
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
  const { controller } = useSelectContext();
  const value = useMemorySlice(controller.group.memory, selectFirstValue);
  // Re-render when labels are (re)registered without churning open/highlight consumers.
  useMemorySlice(controller.cell, selectLabelVersion);

  // Look up the human-readable label registered by the selected SelectItem.
  // Falls back to the raw value if no label has been registered yet.
  const hasValue = value !== undefined && value !== '';
  const label = hasValue ? controller.getLabel(value) : undefined;
  const displayValue = label ?? (hasValue ? value : placeholder);
  const isPlaceholder = !hasValue;

  const spanClassName = classy(isPlaceholder ? selectValuePlaceholderClasses : '', className);

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>;
    const childProps = (child.props ?? {}) as Record<string, unknown>;
    const merged = mergeProps(
      {
        className: spanClassName,
        ...props,
      } as Partial<unknown>,
      childProps,
    );
    return React.cloneElement(child, merged as Partial<Record<string, unknown>>);
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
  const { controller } = useSelectContext();
  const open = useMemorySlice(controller.cell, selectOpen);
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
  const { controller, contentId, triggerRef, contentRef } = useSelectContext();
  const open = useMemorySlice(controller.cell, selectOpen);
  const highlightedValue = useMemorySlice(controller.cell, selectHighlighted);
  const value = useMemorySlice(controller.group.memory, selectFirstValue);

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
      controller.setOpen(false);
      triggerRef.current?.focus();
    });

    return cleanup;
  }, [open, controller, triggerRef]);

  // Outside click handler
  React.useEffect(() => {
    if (!open || !contentRef.current) return;

    const cleanup = onPointerDownOutside(contentRef.current, (event) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) {
        return;
      }
      controller.setOpen(false);
    });

    return cleanup;
  }, [open, controller, triggerRef, contentRef]);

  // Roving focus for keyboard navigation
  React.useEffect(() => {
    if (!open || !contentRef.current) return;

    const cleanup = createRovingFocus(contentRef.current, {
      orientation: 'vertical',
      loop: true,
      onNavigate: (element) => {
        const itemValue = element.getAttribute('data-value');
        if (itemValue) {
          controller.setHighlighted(itemValue);
        }
      },
    });

    return cleanup;
  }, [open, contentRef, controller]);

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
          controller.setHighlighted(itemValue);
        }
      },
    });

    return cleanup;
  }, [open, contentRef, controller]);

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
          controller.setHighlighted(itemValue);
        }
      }
    };

    const frame = requestAnimationFrame(focusInitialItem);
    return () => cancelAnimationFrame(frame);
  }, [open, contentRef, value, controller]);

  // Handle keyboard selection
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    props.onKeyDown?.(event);
    if (event.defaultPrevented) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (highlightedValue) {
        // selectValue replaces the value, fires onValueChange, and closes.
        controller.selectValue(highlightedValue);
        triggerRef.current?.focus();
      }
    }

    if (event.key === 'Tab') {
      event.preventDefault();
    }
  };

  if (!open) {
    // Render children in a hidden container so SelectItem effects run
    // and register labels. This lets SelectValue show the correct label
    // text on initial render before the dropdown has been opened.
    return (
      <div hidden aria-hidden="true" style={{ display: 'none' }}>
        {children}
      </div>
    );
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
    selectContentBaseClasses,
    selectContentAnimateClasses,
    selectContentFadeClasses,
    selectContentZoomClasses,
    selectContentSlideClasses,
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
      (() => {
        const ch = children as React.ReactElement<Record<string, unknown>>;
        const cp = (ch.props ?? {}) as Record<string, unknown>;
        return React.cloneElement(
          ch,
          mergeProps(contentProps, cp) as Partial<Record<string, unknown>>,
        );
      })()
    ) : (
      <div {...contentProps}>
        <div className={selectContentPaddingClasses}>{children}</div>
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
  const viewportClassName = classy(selectViewportClasses, className);

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>;
    const childProps = (child.props ?? {}) as Record<string, unknown>;
    const merged = mergeProps(
      {
        className: viewportClassName,
        ...props,
      } as Partial<unknown>,
      childProps,
    );
    return React.cloneElement(child, merged as Partial<Record<string, unknown>>);
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
  const groupClassName = classy(className);

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>;
    const childProps = (child.props ?? {}) as Record<string, unknown>;
    const merged = mergeProps(
      {
        className: groupClassName,
        role: 'group',
        ...props,
      } as Partial<unknown>,
      childProps,
    );
    return React.cloneElement(child, merged as Partial<Record<string, unknown>>);
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
  const labelClassName = classy(selectLabelClasses, className);

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>;
    const childProps = (child.props ?? {}) as Record<string, unknown>;
    const merged = mergeProps(
      {
        className: labelClassName,
        ...props,
      } as Partial<unknown>,
      childProps,
    );
    return React.cloneElement(child, merged as Partial<Record<string, unknown>>);
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
  const { controller, triggerRef } = useSelectContext();
  const value = useMemorySlice(controller.group.memory, selectFirstValue);
  const highlightedValue = useMemorySlice(controller.cell, selectHighlighted);

  const isSelected = value === itemValue;
  const isHighlighted = highlightedValue === itemValue;

  // Register the label text so SelectValue can display it instead of the raw value.
  const labelTextRef = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    if (labelTextRef.current) {
      const text = labelTextRef.current.textContent?.trim();
      if (text) {
        controller.registerLabel(itemValue, text);
      }
    }
  });

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    props.onClick?.(event);
    if (event.defaultPrevented || disabled) return;

    // selectValue replaces the value, fires onValueChange, and closes.
    controller.selectValue(itemValue);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    props.onKeyDown?.(event);
    if (event.defaultPrevented || disabled) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      controller.selectValue(itemValue);
      triggerRef.current?.focus();
    }
  };

  const handlePointerMove = () => {
    if (!disabled && highlightedValue !== itemValue) {
      controller.setHighlighted(itemValue);
    }
  };

  const itemClassName = classy(
    selectItemBaseClasses,
    selectItemFocusClasses,
    selectItemDisabledClasses,
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
    const child = children as React.ReactElement<Record<string, unknown>>;
    const childProps = (child.props ?? {}) as Record<string, unknown>;
    const merged = mergeProps(itemProps as Partial<unknown>, childProps);
    return React.cloneElement(child, merged as Partial<Record<string, unknown>>);
  }

  return (
    <div {...itemProps}>
      <span className={selectItemIndicatorClasses}>
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
      <span ref={labelTextRef}>{children}</span>
    </div>
  );
}

// ==================== SelectSeparator ====================

export interface SelectSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

export function SelectSeparator({ className, asChild, ...props }: SelectSeparatorProps) {
  const separatorClassName = classy(selectSeparatorClasses, className);

  if (asChild && React.isValidElement(props.children)) {
    const child = props.children as React.ReactElement<Record<string, unknown>>;
    const childProps = (child.props ?? {}) as Record<string, unknown>;
    const merged = mergeProps(
      {
        className: separatorClassName,
        'aria-hidden': true,
        ...props,
      } as Partial<unknown>,
      childProps,
    );
    return React.cloneElement(child, merged as Partial<Record<string, unknown>>);
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
  const iconClassName = classy(selectIconClasses, className);

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>;
    const childProps = (child.props ?? {}) as Record<string, unknown>;
    const merged = mergeProps(
      {
        className: iconClassName,
        ...props,
      } as Partial<unknown>,
      childProps,
    );
    return React.cloneElement(child, merged as Partial<Record<string, unknown>>);
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
  const buttonClassName = classy(selectScrollButtonClasses, className);

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>;
    const childProps = (child.props ?? {}) as Record<string, unknown>;
    const merged = mergeProps(
      {
        className: buttonClassName,
        'aria-hidden': true,
        ...props,
      } as Partial<unknown>,
      childProps,
    );
    return React.cloneElement(child, merged as Partial<Record<string, unknown>>);
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
          className={selectScrollIconClasses}
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
  const buttonClassName = classy(selectScrollButtonClasses, className);

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>;
    const childProps = (child.props ?? {}) as Record<string, unknown>;
    const merged = mergeProps(
      {
        className: buttonClassName,
        'aria-hidden': true,
        ...props,
      } as Partial<unknown>,
      childProps,
    );
    return React.cloneElement(child, merged as Partial<Record<string, unknown>>);
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
          className={selectScrollIconClasses}
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

// ==================== Display Names ====================

Select.displayName = 'Select';
SelectTrigger.displayName = 'SelectTrigger';
SelectValue.displayName = 'SelectValue';
SelectPortal.displayName = 'SelectPortal';
SelectContent.displayName = 'SelectContent';
SelectViewport.displayName = 'SelectViewport';
SelectGroup.displayName = 'SelectGroup';
SelectLabel.displayName = 'SelectLabel';
SelectItem.displayName = 'SelectItem';
SelectSeparator.displayName = 'SelectSeparator';
SelectIcon.displayName = 'SelectIcon';
SelectScrollUpButton.displayName = 'SelectScrollUpButton';
SelectScrollDownButton.displayName = 'SelectScrollDownButton';

// Re-export root alias
export { Select as SelectRoot };
