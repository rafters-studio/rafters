/**
 * Combobox component for searchable selection with typeahead filtering
 *
 * @cognitive-load 6/10 - Combines input + dropdown; requires typing and visual scanning
 * @attention-economics Medium-high attention: keyboard input, list scanning, selection confirmation
 * @trust-building Immediate filtering feedback, clear match highlighting, keyboard accessible
 * @accessibility Full ARIA combobox pattern, listbox role, option roles, live region announcements
 * @semantic-meaning Filtered selection: choosing from large datasets, typeahead search
 *
 * @usage-patterns
 * DO: Use for selection from large option sets (>10 items)
 * DO: Provide clear empty state and no-results messaging
 * DO: Support both mouse and keyboard selection
 * DO: Highlight matching text in filtered results
 * DO: Allow clearing the selection
 * NEVER: Use for small option sets (<5 items) - use Select instead
 * NEVER: Require exact match when approximate would help
 * NEVER: Hide the clear button when a selection exists
 *
 * @example
 * ```tsx
 * <Combobox value={value} onValueChange={setValue}>
 *   <Combobox.Input placeholder="Select framework..." />
 *   <Combobox.Content>
 *     <Combobox.Empty>No framework found.</Combobox.Empty>
 *     <Combobox.Group>
 *       <Combobox.Item value="react">React</Combobox.Item>
 *       <Combobox.Item value="vue">Vue</Combobox.Item>
 *       <Combobox.Item value="angular">Angular</Combobox.Item>
 *     </Combobox.Group>
 *   </Combobox.Content>
 * </Combobox>
 * ```
 */

import * as React from 'react';
import { createPortal } from 'react-dom';
import { useMemory } from '../../hooks/use-memory';
import classy from '../../primitives/classy';
import { computePosition } from '../../primitives/collision-detector';
import { onEscapeKeyDown } from '../../primitives/escape-keydown';
import { onPointerDownOutside } from '../../primitives/outside-click';
import { getPortalContainer } from '../../primitives/portal';
import type { Align, Side } from '../../primitives/types';
import { type ComboboxController, createCombobox } from './combobox.controller';

// ==================== Context ====================

// All combobox state lives in the framework-free controller (createSelectionGroup
// for the value + a createMemory cell for open/inputValue/activeIndex/optionsVersion,
// options in a ref). Context carries only the controller plus view-local refs/ids.
interface ComboboxContextValue {
  controller: ComboboxController;
  disabled: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  listboxId: string;
  inputId: string;
}

const ComboboxContext = React.createContext<ComboboxContextValue | null>(null);

function useComboboxContext() {
  const context = React.useContext(ComboboxContext);
  if (!context) {
    throw new Error('Combobox components must be used within Combobox');
  }
  return context;
}

// ==================== Combobox (Root) ====================

export interface ComboboxProps {
  children: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
}

export function Combobox({
  children,
  value: controlledValue,
  defaultValue = '',
  onValueChange,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
}: ComboboxProps) {
  const isValueControlled = controlledValue !== undefined;
  const isOpenControlled = controlledOpen !== undefined;

  // Keep the latest callbacks reachable without re-creating the controller.
  const onValueChangeRef = React.useRef(onValueChange);
  const onOpenChangeRef = React.useRef(onOpenChange);
  React.useEffect(() => {
    onValueChangeRef.current = onValueChange;
    onOpenChangeRef.current = onOpenChange;
  });

  // The controller owns all combobox state; it is created once and stays stable.
  const [controller] = React.useState<ComboboxController>(() =>
    createCombobox({
      initialValue: isValueControlled ? controlledValue : defaultValue,
      initialOpen: isOpenControlled ? controlledOpen : defaultOpen,
      onValueChange: (next) => onValueChangeRef.current?.(next),
      onOpenChange: (next) => onOpenChangeRef.current?.(next),
    }),
  );

  React.useEffect(() => () => controller.destroy(), [controller]);

  // Controlled value: mirror the prop into the controller silently (no callback).
  React.useEffect(() => {
    if (isValueControlled && controlledValue !== undefined) {
      controller.setValue(controlledValue);
    }
  }, [isValueControlled, controlledValue, controller]);

  // Controlled open: mirror the prop into the cell silently (patch, not setOpen,
  // so the parent's own prop change does not echo back through onOpenChange).
  React.useEffect(() => {
    if (
      isOpenControlled &&
      controlledOpen !== undefined &&
      controller.cell.get().open !== controlledOpen
    ) {
      controller.cell.patch(controlledOpen ? { open: true, activeIndex: -1 } : { open: false });
    }
  }, [isOpenControlled, controlledOpen, controller]);

  // Refs and ids stay view-local.
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const id = React.useId();
  const listboxId = `combobox-listbox-${id}`;
  const inputId = `combobox-input-${id}`;

  const contextValue = React.useMemo<ComboboxContextValue>(
    () => ({ controller, disabled, inputRef, contentRef, listboxId, inputId }),
    [controller, disabled, listboxId, inputId],
  );

  return <ComboboxContext.Provider value={contextValue}>{children}</ComboboxContext.Provider>;
}

// ==================== ComboboxInput ====================

export interface ComboboxInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange'
> {}

export function ComboboxInput({
  className,
  onKeyDown,
  onFocus,
  onBlur,
  ...props
}: ComboboxInputProps) {
  const { controller, disabled, inputRef, listboxId, inputId } = useComboboxContext();
  const { open, inputValue, activeIndex } = useMemory(controller.cell);
  const filteredOptions = controller.filteredOptions();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) {
          if (!disabled) controller.setOpen(true);
        } else {
          controller.setActiveIndex(Math.min(activeIndex + 1, filteredOptions.length - 1));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (open) {
          controller.setActiveIndex(Math.max(activeIndex - 1, 0));
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (open && activeIndex >= 0 && filteredOptions[activeIndex]) {
          controller.selectOption(filteredOptions[activeIndex].value);
          inputRef.current?.focus();
        }
        break;
      case 'Escape':
        if (open) {
          e.preventDefault();
          controller.setOpen(false);
        }
        break;
      case 'Tab':
        if (open) {
          controller.setOpen(false);
        }
        break;
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    onFocus?.(e);
    // Optionally open on focus
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    onBlur?.(e);
    // Don't close immediately - let click handlers work
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // When disabled, update the query text but never open (mirrors prior behavior).
    if (disabled) {
      controller.cell.patch({ inputValue: e.target.value, activeIndex: -1 });
      return;
    }
    controller.setInputValue(e.target.value);
  };

  const activeOptionId =
    activeIndex >= 0 && filteredOptions[activeIndex]
      ? `${listboxId}-option-${filteredOptions[activeIndex].value}`
      : undefined;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={activeOptionId}
        aria-haspopup="listbox"
        autoComplete="off"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        data-state={open ? 'open' : 'closed'}
        className={classy(
          'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm',
          'transition-colors placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'md:text-sm',
          className,
        )}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => {
          if (!disabled) controller.setOpen(!open);
        }}
        className={classy(
          'absolute right-0 top-0 flex h-full items-center px-2',
          'text-muted-foreground hover:text-foreground',
        )}
        aria-label={open ? 'Close' : 'Open'}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={classy('transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    </div>
  );
}

// ==================== ComboboxContent ====================

export interface ComboboxContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: Side;
  align?: Align;
  sideOffset?: number;
  alignOffset?: number;
}

export function ComboboxContent({
  children,
  className,
  side = 'bottom',
  align = 'start',
  sideOffset = 4,
  alignOffset = 0,
  style,
  ...props
}: ComboboxContentProps) {
  const { controller, inputRef, contentRef, listboxId } = useComboboxContext();
  const { open } = useMemory(controller.cell);
  const [mounted, setMounted] = React.useState(false);
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

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Position the content
  React.useEffect(() => {
    if (!open || !inputRef.current || !contentRef.current) return;

    const updatePosition = () => {
      const anchor = inputRef.current;
      const floating = contentRef.current;

      if (!anchor || !floating) return;

      const result = computePosition(anchor, floating, {
        side,
        align,
        sideOffset,
        alignOffset,
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
  }, [open, side, align, sideOffset, alignOffset, inputRef, contentRef]);

  // Escape key handler
  React.useEffect(() => {
    if (!open) return;

    return onEscapeKeyDown(() => {
      controller.setOpen(false);
      inputRef.current?.focus();
    });
  }, [open, controller, inputRef]);

  // Outside click handler
  React.useEffect(() => {
    if (!open || !contentRef.current) return;

    return onPointerDownOutside(contentRef.current, (event) => {
      const target = event.target as Node;
      // Don't close if clicking the input
      if (inputRef.current?.contains(target)) return;
      // Don't close if clicking the toggle button (inside input wrapper)
      if (inputRef.current?.parentElement?.contains(target)) return;

      controller.setOpen(false);
    });
  }, [open, controller, inputRef, contentRef]);

  if (!open || !mounted) return null;

  const portalContainer = getPortalContainer({ enabled: true });
  if (!portalContainer) return null;

  const contentStyle: React.CSSProperties = {
    ...style,
    position: 'fixed',
    left: 0,
    top: 0,
    transform: `translate(${Math.round(position.x)}px, ${Math.round(position.y)}px)`,
    minWidth: inputRef.current?.offsetWidth,
  };

  return createPortal(
    <div
      ref={contentRef}
      id={listboxId}
      role="listbox"
      data-state="open"
      data-side={position.side}
      data-align={position.align}
      className={classy(
        'z-depth-dropdown max-h-60 overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        className,
      )}
      style={contentStyle}
      {...props}
    >
      {children}
    </div>,
    portalContainer,
  );
}

// ==================== ComboboxEmpty ====================

export interface ComboboxEmptyProps extends React.HTMLAttributes<HTMLDivElement> {}

export function ComboboxEmpty({ className, children, ...props }: ComboboxEmptyProps) {
  const { controller } = useComboboxContext();
  // Re-derive when inputValue or the registry version changes.
  useMemory(controller.cell);
  const filteredOptions = controller.filteredOptions();

  // Only show if no results
  if (filteredOptions.length > 0) return null;

  return (
    <div className={classy('py-6 text-center text-sm text-muted-foreground', className)} {...props}>
      {children}
    </div>
  );
}

// ==================== ComboboxGroup ====================

export interface ComboboxGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  heading?: string;
}

export function ComboboxGroup({ heading, className, children, ...props }: ComboboxGroupProps) {
  const headingId = React.useId();

  return (
    // biome-ignore lint/a11y/useSemanticElements: role="group" is the correct ARIA role for grouping related options in a combobox
    <div
      role="group"
      aria-labelledby={heading ? headingId : undefined}
      className={classy('overflow-hidden', className)}
      {...props}
    >
      {heading && (
        <div id={headingId} className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          {heading}
        </div>
      )}
      {children}
    </div>
  );
}

// ==================== ComboboxItem ====================

export interface ComboboxItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  disabled?: boolean;
}

export function ComboboxItem({
  value: itemValue,
  disabled = false,
  className,
  children,
  ...props
}: ComboboxItemProps) {
  const { controller, inputRef, listboxId } = useComboboxContext();
  const { inputValue, activeIndex } = useMemory(controller.cell);
  const { selected } = useMemory(controller.group.memory);
  const selectedValue = selected[0];

  // Get label from children
  const label = typeof children === 'string' ? children : itemValue;

  // Register option
  React.useEffect(() => {
    controller.registerOption({ value: itemValue, label, disabled });
    return () => controller.unregisterOption(itemValue);
  }, [itemValue, label, disabled, controller]);

  // Filter check - derived from this item's own label/value to avoid the
  // first-render registration race (the registry is populated in an effect).
  const isFiltered = React.useMemo(() => {
    if (!inputValue) return false;
    const lower = inputValue.toLowerCase();
    return !label.toLowerCase().includes(lower) && !itemValue.toLowerCase().includes(lower);
  }, [inputValue, label, itemValue]);

  // Don't render if filtered out
  if (isFiltered) return null;

  // Find index among the controller's filtered options (drives the highlight).
  const index = controller.filteredOptions().findIndex((o) => o.value === itemValue);
  const isActive = index === activeIndex;
  const isSelected = selectedValue === itemValue;

  const handleClick = () => {
    if (!disabled) {
      controller.selectOption(itemValue);
      // Focus stays imperative at the boundary (controller does not touch the DOM).
      inputRef.current?.focus();
    }
  };

  const handleMouseEnter = () => {
    if (!disabled) {
      controller.setActiveIndex(index);
    }
  };

  return (
    // biome-ignore lint/a11y/useFocusableInteractive: Options in a combobox listbox are navigated via keyboard on the input, not individually focusable
    // biome-ignore lint/a11y/useKeyWithClickEvents: Keyboard navigation is handled by the parent combobox input element
    <div
      id={`${listboxId}-option-${itemValue}`}
      role="option"
      aria-selected={isSelected}
      aria-disabled={disabled}
      data-value={itemValue}
      data-selected={isSelected || undefined}
      data-highlighted={isActive || undefined}
      data-disabled={disabled || undefined}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      className={classy(
        'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
        className,
      )}
      {...props}
    >
      <span
        className={classy(
          'mr-2 flex h-4 w-4 items-center justify-center',
          !isSelected && 'opacity-0',
        )}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      {children}
    </div>
  );
}

// ==================== ComboboxSeparator ====================

export interface ComboboxSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

export function ComboboxSeparator({ className, ...props }: ComboboxSeparatorProps) {
  return <div className={classy('-mx-1 my-1 h-px bg-border', className)} {...props} />;
}

// ==================== Namespaced Export ====================

Combobox.Input = ComboboxInput;
Combobox.Content = ComboboxContent;
Combobox.Empty = ComboboxEmpty;
Combobox.Group = ComboboxGroup;
Combobox.Item = ComboboxItem;
Combobox.Separator = ComboboxSeparator;
