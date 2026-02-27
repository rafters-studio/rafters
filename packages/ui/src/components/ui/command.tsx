/**
 * Command component for keyboard-driven command palettes and search interfaces
 *
 * @cognitive-load 6/10 - Command-based interface; requires learning shortcuts but fast once known
 * @attention-economics High initial attention, low ongoing: power users benefit from muscle memory
 * @trust-building Immediate search feedback, keyboard navigable, clear action consequences
 * @accessibility Full keyboard navigation, ARIA combobox pattern, screen reader announcements
 * @semantic-meaning Command execution: quick actions, navigation, search, command palettes
 *
 * @usage-patterns
 * DO: Use for power-user features and keyboard shortcuts
 * DO: Provide instant search/filter feedback
 * DO: Group related commands logically
 * DO: Support both mouse and keyboard navigation
 * DO: Show keyboard shortcut hints
 * NEVER: Use for simple forms or data entry
 * NEVER: Require mouse-only interaction
 * NEVER: Hide without clear dismissal method
 *
 * @example
 * ```tsx
 * <Command>
 *   <Command.Input placeholder="Type a command or search..." />
 *   <Command.List>
 *     <Command.Empty>No results found.</Command.Empty>
 *     <Command.Group heading="Suggestions">
 *       <Command.Item onSelect={() => {}}>Calendar</Command.Item>
 *       <Command.Item onSelect={() => {}}>Search</Command.Item>
 *     </Command.Group>
 *   </Command.List>
 * </Command>
 * ```
 */

import * as React from 'react';
import classy from '../../primitives/classy';

// ==================== Context ====================

interface CommandContextValue {
  value: string;
  onValueChange: (value: string) => void;
  selectedValue: string;
  onSelect: (value: string) => void;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  items: string[];
  registerItem: (value: string) => void;
  unregisterItem: (value: string) => void;
  listId: string;
  inputId: string;
  getItemId: (value: string) => string;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

const CommandContext = React.createContext<CommandContextValue | null>(null);

function useCommandContext(): CommandContextValue {
  const context = React.useContext(CommandContext);
  if (!context) {
    throw new Error('Command components must be used within Command');
  }
  return context;
}

// ==================== Command (Root) ====================

export interface CommandProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
}

export function Command({
  value: controlledValue,
  onValueChange,
  className,
  children,
  ...props
}: CommandProps): React.JSX.Element {
  // Search input value
  const [uncontrolledValue, setUncontrolledValue] = React.useState('');
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  // Selected/highlighted item
  const [selectedValue, setSelectedValue] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(-1);

  // Registered items
  const [items, setItems] = React.useState<string[]>([]);

  // Refs
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  // IDs
  const id = React.useId();
  const listId = `command-list-${id}`;
  const inputId = `command-input-${id}`;

  const handleValueChange = React.useCallback(
    (newValue: string) => {
      if (!isControlled) {
        setUncontrolledValue(newValue);
      }
      onValueChange?.(newValue);
      // Reset active index when search changes
      setActiveIndex(-1);
    },
    [isControlled, onValueChange],
  );

  const handleSelect = React.useCallback((itemValue: string) => {
    setSelectedValue(itemValue);
  }, []);

  const registerItem = React.useCallback((itemValue: string) => {
    setItems((prev) => {
      if (prev.includes(itemValue)) return prev;
      return [...prev, itemValue];
    });
  }, []);

  const unregisterItem = React.useCallback((itemValue: string) => {
    setItems((prev) => prev.filter((v) => v !== itemValue));
  }, []);

  const getItemId = React.useCallback(
    (itemValue: string) => `${listId}-item-${itemValue.replace(/\s+/g, '-')}`,
    [listId],
  );

  const contextValue = React.useMemo<CommandContextValue>(
    () => ({
      value,
      onValueChange: handleValueChange,
      selectedValue,
      onSelect: handleSelect,
      activeIndex,
      setActiveIndex,
      items,
      registerItem,
      unregisterItem,
      listId,
      inputId,
      getItemId,
      inputRef,
    }),
    [
      value,
      handleValueChange,
      selectedValue,
      handleSelect,
      activeIndex,
      items,
      registerItem,
      unregisterItem,
      listId,
      inputId,
      getItemId,
    ],
  );

  return (
    <CommandContext.Provider value={contextValue}>
      <div
        data-command=""
        className={classy(
          'flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </CommandContext.Provider>
  );
}

// ==================== CommandDialog ====================

export interface CommandDialogProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CommandDialog({
  open,
  onOpenChange,
  className,
  children,
  ...props
}: CommandDialogProps): React.JSX.Element | null {
  // Handle escape to close
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange?.(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        className="fixed inset-0 z-depth-overlay bg-foreground/80 cursor-default"
        onClick={() => onOpenChange?.(false)}
        aria-label="Close command palette"
      />
      {/* Dialog */}
      <div
        data-command-dialog=""
        className={classy(
          'fixed left-1/2 top-1/2 z-depth-modal w-full max-w-lg -translate-x-1/2 -translate-y-1/2',
          'rounded-lg border bg-popover shadow-lg',
          className,
        )}
        {...props}
      >
        <Command className="[&_[data-command-input-wrapper]]:border-b">{children}</Command>
      </div>
    </>
  );
}

// ==================== CommandInput ====================

export interface CommandInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {}

export function CommandInput({
  className,
  onKeyDown,
  ...props
}: CommandInputProps): React.JSX.Element {
  const {
    value,
    onValueChange,
    activeIndex,
    setActiveIndex,
    items,
    onSelect,
    listId,
    inputId,
    getItemId,
    inputRef,
  } = useCommandContext();

  // Get visible items (for keyboard navigation)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(Math.min(activeIndex + 1, items.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(Math.max(activeIndex - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && items[activeIndex]) {
          onSelect(items[activeIndex]);
        }
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(items.length - 1);
        break;
    }
  };

  const activeItemId =
    activeIndex >= 0 && items[activeIndex] ? getItemId(items[activeIndex]) : undefined;

  return (
    <div data-command-input-wrapper="" className="flex items-center border-b px-3">
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
        className="mr-2 shrink-0 opacity-50"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded="true"
        aria-controls={listId}
        aria-activedescendant={activeItemId}
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={handleKeyDown}
        data-command-input=""
        className={classy(
          'flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none',
          'placeholder:text-muted-foreground',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    </div>
  );
}

// ==================== CommandList ====================

export interface CommandListProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CommandList({
  className,
  children,
  ...props
}: CommandListProps): React.JSX.Element {
  const { listId } = useCommandContext();

  return (
    <div
      id={listId}
      role="listbox"
      data-command-list=""
      className={classy('max-h-80 overflow-y-auto overflow-x-hidden', className)}
      {...props}
    >
      {children}
    </div>
  );
}

// ==================== CommandEmpty ====================

export interface CommandEmptyProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CommandEmpty({
  className,
  children,
  ...props
}: CommandEmptyProps): React.JSX.Element | null {
  const { items, value } = useCommandContext();

  // Calculate visible items (those that match the search)
  const visibleItems = React.useMemo(() => {
    if (!value) return items;
    const lower = value.toLowerCase();
    return items.filter((item) => item.toLowerCase().includes(lower));
  }, [items, value]);

  // Only show when there are no visible items and there's a search value
  if (visibleItems.length > 0 || !value) return null;

  return (
    <div data-command-empty="" className={classy('py-6 text-center text-sm', className)} {...props}>
      {children}
    </div>
  );
}

// ==================== CommandGroup ====================

export interface CommandGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  heading?: string;
}

export function CommandGroup({
  heading,
  className,
  children,
  ...props
}: CommandGroupProps): React.JSX.Element {
  const headingId = React.useId();

  return (
    // biome-ignore lint/a11y/useSemanticElements: role="group" is the correct ARIA role for grouping related command items
    <div
      role="group"
      aria-labelledby={heading ? headingId : undefined}
      data-command-group=""
      className={classy('overflow-hidden p-1 text-foreground', className)}
      {...props}
    >
      {heading && (
        <div
          id={headingId}
          data-command-group-heading=""
          className="px-2 py-1.5 text-xs font-medium text-muted-foreground"
        >
          {heading}
        </div>
      )}
      {children}
    </div>
  );
}

// ==================== CommandItem ====================

export interface CommandItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  value?: string;
  disabled?: boolean;
  onSelect?: (value: string) => void;
}

export function CommandItem({
  value: itemValue,
  disabled = false,
  onSelect,
  className,
  children,
  ...props
}: CommandItemProps): React.JSX.Element | null {
  const {
    value: searchValue,
    activeIndex,
    setActiveIndex,
    items,
    registerItem,
    unregisterItem,
    getItemId,
    onSelect: contextOnSelect,
  } = useCommandContext();

  // Use children text as value if not provided
  const computedValue = itemValue ?? (typeof children === 'string' ? children : '');

  // Register item
  React.useEffect(() => {
    if (!disabled) {
      registerItem(computedValue);
      return () => unregisterItem(computedValue);
    }
    return undefined;
  }, [computedValue, disabled, registerItem, unregisterItem]);

  // Filter check
  const isFiltered = React.useMemo(() => {
    if (!searchValue) return false;
    const lower = searchValue.toLowerCase();
    return !computedValue.toLowerCase().includes(lower);
  }, [searchValue, computedValue]);

  // Don't render if filtered out
  if (isFiltered) return null;

  // Find index
  const index = items.indexOf(computedValue);
  const isActive = index === activeIndex;

  const handleClick = () => {
    if (!disabled) {
      onSelect?.(computedValue);
      contextOnSelect(computedValue);
    }
  };

  const handleMouseEnter = () => {
    if (!disabled) {
      setActiveIndex(index);
    }
  };

  return (
    // biome-ignore lint/a11y/useFocusableInteractive: Options in a command listbox are navigated via keyboard on the input, not individually focusable
    // biome-ignore lint/a11y/useKeyWithClickEvents: Keyboard navigation is handled by the parent command input element
    <div
      id={getItemId(computedValue)}
      role="option"
      aria-selected={isActive}
      aria-disabled={disabled}
      data-command-item=""
      data-value={computedValue}
      data-selected={isActive || undefined}
      data-disabled={disabled || undefined}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      className={classy(
        'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        'data-[selected]:bg-accent data-[selected]:text-accent-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ==================== CommandSeparator ====================

export interface CommandSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CommandSeparator({
  className,
  ...props
}: CommandSeparatorProps): React.JSX.Element {
  return (
    <div
      data-command-separator=""
      className={classy('-mx-1 h-px bg-border', className)}
      {...props}
    />
  );
}

// ==================== CommandShortcut ====================

export interface CommandShortcutProps extends React.HTMLAttributes<HTMLSpanElement> {}

export function CommandShortcut({ className, ...props }: CommandShortcutProps): React.JSX.Element {
  return (
    <span
      data-command-shortcut=""
      className={classy('ml-auto text-xs tracking-widest text-muted-foreground', className)}
      {...props}
    />
  );
}

// ==================== Namespaced Export ====================

Command.Dialog = CommandDialog;
Command.Input = CommandInput;
Command.List = CommandList;
Command.Empty = CommandEmpty;
Command.Group = CommandGroup;
Command.Item = CommandItem;
Command.Separator = CommandSeparator;
Command.Shortcut = CommandShortcut;
