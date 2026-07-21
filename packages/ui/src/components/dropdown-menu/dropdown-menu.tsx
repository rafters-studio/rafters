/**
 * Dropdown menu: an anchored action menu disclosed by a trigger.
 *
 * @cognitive-load 4/10 - familiarity low (universal menu pattern), choice count
 *   moderate (7 plus/minus 2 items per level), visual complexity low (a single
 *   list), interaction depth low (open, arrow/type, activate), recovery high
 *   (Escape closes, focus returns to the trigger).
 * @attention-economics Contextual actions on demand: the menu is compact when
 *   closed and reveals a focused option list only when summoned; typeahead
 *   narrows attention to the matching item.
 * @trust-building Keyboard-first navigation, a visible focus ring on the active
 *   item, and focus returned to the trigger on activate or dismiss keep the
 *   user oriented and in control.
 * @accessibility Menu-button APG pattern: trigger aria-haspopup="menu" +
 *   aria-expanded + aria-controls, content role="menu" aria-orientation, roving
 *   focus across menuitem/menuitemcheckbox/menuitemradio, type-to-search,
 *   Escape closes and restores focus.
 *
 * The React performance is a DECORATOR over dropdown-menu.behavior.ts: it adds
 * only the view (dropdown-menu.classes.ts) and React wiring (useMemory + a
 * useEffect that composes startDropdownMenuEffects + the dispatch protocol).
 * Every decision -- the open/close reducer, aria, keymap, the open-menu effect
 * trio -- lives in the score. The shadcn drop-in surface (Trigger, Portal,
 * Content, Group, Label, Item, CheckboxItem, RadioGroup, RadioItem, Separator,
 * Shortcut) plus the `DropdownMenu.*` namespace is preserved; each extra is a
 * thin view wrapper. Submenus (Sub/SubTrigger/SubContent) are dropped -- see the
 * component doc's oracle dispositions.
 *
 * Indicator/shortcut inline spans are built with React.createElement, the same
 * documented escape hatch card/alert/select use for raw inline tags.
 *
 * @example
 * ```tsx
 * import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@rafters/ui';
 *
 * <DropdownMenu>
 *   <DropdownMenuTrigger>Options</DropdownMenuTrigger>
 *   <DropdownMenuContent>
 *     <DropdownMenuItem onSelect={edit}>Edit</DropdownMenuItem>
 *     <DropdownMenuSeparator />
 *     <DropdownMenuItem onSelect={remove}>Delete</DropdownMenuItem>
 *   </DropdownMenuContent>
 * </DropdownMenu>
 * ```
 */
import * as React from 'react';
import { createBehavior, type AriaAttrs, type PartIds } from '../../lib/contract';
import { keyInputOf } from '../../hooks/key-input';
import { useMemory } from '../../hooks/use-memory';
import classy from '../../primitives/classy';
import { mergeProps } from '../../primitives/slot';
import {
  dropdownMenu,
  focusFirstItem,
  isOpen,
  startDropdownMenuEffects,
  type DropdownMenuActions,
  type DropdownMenuConfig,
  type DropdownMenuPart,
} from './dropdown-menu.behavior';
import { dropdownMenuClasses, type DropdownMenuClassSet } from './dropdown-menu.classes';

interface DropdownMenuContextValue {
  ids: PartIds<DropdownMenuPart>;
  aria: Partial<Record<DropdownMenuPart, AriaAttrs>>;
  request: (action: keyof DropdownMenuActions) => boolean;
  getPart: (part: string) => HTMLElement | null;
  effectiveOpen: boolean;
  classes: DropdownMenuClassSet;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenuContext(component: string): DropdownMenuContextValue {
  const context = React.useContext(DropdownMenuContext);
  if (!context) {
    throw new Error(`${component} must be used within <DropdownMenu>`);
  }
  return context;
}

/** Consumer-controlled checked state for the radio group is carried in a
 *  separate context (the score owns only open/close). */
interface DropdownMenuRadioContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const DropdownMenuRadioContext = React.createContext<DropdownMenuRadioContextValue | null>(null);

export interface DropdownMenuProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DropdownMenu({
  children,
  open,
  defaultOpen = false,
  onOpenChange,
}: DropdownMenuProps) {
  const config: DropdownMenuConfig = { open, defaultOpen };

  // The controller composes the score with the substrate -- no useBehavior.
  const { memory, dispatch } = React.useMemo(() => createBehavior(dropdownMenu, config), []);
  const state = useMemory(memory);
  const effectiveOpen = isOpen(state, config);

  const uid = React.useId();
  const ids = React.useMemo(() => {
    const out = {} as PartIds<DropdownMenuPart>;
    for (const part of Object.keys(dropdownMenu.parts) as DropdownMenuPart[])
      out[part] = `${uid}-${part}`;
    return out;
  }, [uid]);

  const rootRef = React.useRef<HTMLDivElement>(null);
  const getPart = React.useCallback(
    (part: string): HTMLElement | null =>
      part === 'root'
        ? rootRef.current
        : (rootRef.current?.querySelector<HTMLElement>(`[data-part="${part}"]`) ?? null),
    [],
  );

  // Effect-initiated dispatches (outside dismissal) must read the CURRENT config
  // and callback, so those ride in a ref rather than captured stale.
  const latest = React.useRef({ config, onOpenChange });
  latest.current = { config, onOpenChange };
  const request = React.useCallback(
    (action: keyof DropdownMenuActions): boolean => {
      const { config: cfg, onOpenChange: cb } = latest.current;
      if (!dispatch(action, cfg)) return false;
      cb?.(action === 'open');
      return true;
    },
    [dispatch],
  );

  // The open-menu effect trio, composed directly on the open transition
  // (replacing the retired effects runner): roving focus, typeahead, and outside
  // dismissal sparing the trigger. Level-triggered via the dependency array;
  // declared ABOVE the open-focus effect so roving sets the roving tabindex
  // before focusFirstItem lands focus.
  React.useEffect(() => {
    if (!effectiveOpen) return;
    const content = getPart('content');
    if (!content) return;
    return startDropdownMenuEffects({
      content,
      getTrigger: () => getPart('trigger'),
      onDismiss: () => {
        request('close');
      },
    });
  }, [effectiveOpen, getPart, request]);

  // Open-focus: land on the first item when the menu opens and focus is not
  // already inside it -- the same rule bindDropdownMenu runs.
  React.useEffect(() => {
    if (!effectiveOpen) return;
    const content = getPart('content');
    if (content && !content.contains(document.activeElement)) {
      focusFirstItem(content);
    }
  }, [effectiveOpen, getPart]);

  // One root-level keydown handler resolves the focused part and drives the
  // score, mirroring bindDropdownMenu -- so the trigger/item view wrappers stay
  // pure click adapters with no keymap logic of their own.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented) return;
    const partEl = (event.target as HTMLElement).closest<HTMLElement>('[data-part]');
    const part = partEl?.dataset['part'] as DropdownMenuPart | undefined;
    if (!part) return;

    // Enter/Space on a menu item activate it -- the div-as-button affordance,
    // routed through the item's own click path (which runs onSelect and closes).
    const item = partEl?.closest<HTMLElement>('[data-part="item"]');
    if (item && (event.key === 'Enter' || event.key === ' ')) {
      if (item.getAttribute('aria-disabled') === 'true') return;
      event.preventDefault();
      item.click();
      return;
    }

    const action = dropdownMenu.keymap(keyInputOf(event), state, part, config);
    if (!action) return;
    // preventDefault suppresses the native button click Enter/Space would
    // otherwise fire on the trigger (which would toggle back closed).
    event.preventDefault();
    if (action === 'open') {
      request('open');
      return;
    }
    if (action === 'close') {
      request('close');
      getPart('trigger')?.focus();
    }
  };

  const aria = dropdownMenu.aria(state, config, ids);

  const contextValue: DropdownMenuContextValue = {
    ids,
    aria,
    request,
    getPart,
    effectiveOpen,
    classes: dropdownMenuClasses(config, state),
  };

  return (
    <DropdownMenuContext.Provider value={contextValue}>
      <div ref={rootRef} data-part="root" id={ids.root} {...aria.root} onKeyDown={handleKeyDown}>
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
}

export interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function DropdownMenuTrigger({
  className,
  children,
  asChild,
  onClick,
  ...props
}: DropdownMenuTriggerProps) {
  const { ids, aria, request, effectiveOpen, classes } =
    useDropdownMenuContext('DropdownMenuTrigger');

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    request(effectiveOpen ? 'close' : 'open');
  };

  const partProps = {
    'data-part': 'trigger',
    id: ids.trigger,
    ...aria.trigger,
    onClick: handleClick,
  };

  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as Record<string, unknown>;
    return React.cloneElement(children, mergeProps(partProps, childProps) as React.Attributes);
  }

  return (
    <button type="button" className={classy(classes.trigger, className)} {...partProps} {...props}>
      {children}
    </button>
  );
}

/** Kept for shadcn drop-in compatibility. In the behavior-layer model the menu
 *  lives in light DOM (present-but-hidden), so there is no portal to open; this
 *  is a pass-through that preserves the API. */
export function DropdownMenuPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

export function DropdownMenuContent({
  className,
  children,
  asChild,
  ...props
}: DropdownMenuContentProps) {
  const { ids, aria, effectiveOpen, classes } = useDropdownMenuContext('DropdownMenuContent');

  const partProps = {
    'data-part': 'content',
    id: ids.content,
    hidden: effectiveOpen ? undefined : true,
    ...aria.content,
  };

  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as Record<string, unknown>;
    return React.cloneElement(children, mergeProps(partProps, childProps) as React.Attributes);
  }

  return (
    <div className={classy(classes.content, className)} {...partProps} {...props}>
      {children}
    </div>
  );
}

export type DropdownMenuGroupProps = React.HTMLAttributes<HTMLDivElement>;

export function DropdownMenuGroup({ className, ...props }: DropdownMenuGroupProps) {
  const { classes } = useDropdownMenuContext('DropdownMenuGroup');
  // biome-ignore lint/a11y/useSemanticElements: role="group" is correct for menu groups per WAI-ARIA APG
  return <div role="group" className={classy(classes.group, className)} {...props} />;
}

export interface DropdownMenuLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}

export function DropdownMenuLabel({ className, inset, ...props }: DropdownMenuLabelProps) {
  const { classes } = useDropdownMenuContext('DropdownMenuLabel');
  return <div className={classy(classes.label, inset && 'pl-8', className)} {...props} />;
}

/** The shared select-then-close path: fire a cancelable `select` event, and
 *  unless the consumer vetoes it, run an optional side effect (a checked/value
 *  change), close the menu, and return focus to the trigger. Mirrors the
 *  oracle's handleSelect. */
function useItemSelect(disabled: boolean, onSelect?: (event: Event) => void) {
  const { request, getPart } = useDropdownMenuContext('DropdownMenuItem');
  return React.useCallback(
    (before?: () => void): boolean => {
      if (disabled) return false;
      const event = new Event('select', { cancelable: true });
      onSelect?.(event);
      if (event.defaultPrevented) return false;
      before?.();
      request('close');
      getPart('trigger')?.focus();
      return true;
    },
    [disabled, onSelect, request, getPart],
  );
}

export interface DropdownMenuItemProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onSelect'
> {
  inset?: boolean;
  disabled?: boolean;
  asChild?: boolean;
  onSelect?: (event: Event) => void;
}

export function DropdownMenuItem({
  className,
  children,
  inset,
  disabled = false,
  asChild,
  onSelect,
  onClick,
  ...props
}: DropdownMenuItemProps) {
  const { classes } = useDropdownMenuContext('DropdownMenuItem');
  const select = useItemSelect(disabled, onSelect);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    select();
  };

  const partProps = {
    'data-part': 'item',
    role: 'menuitem',
    'data-roving-item': '',
    tabIndex: disabled ? undefined : -1,
    'aria-disabled': disabled || undefined,
    'data-disabled': disabled ? '' : undefined,
    onClick: handleClick,
  };

  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as Record<string, unknown>;
    return React.cloneElement(children, mergeProps(partProps, childProps) as React.Attributes);
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: role="menuitem" is the menu APG pattern
    <div className={classy(classes.item, inset && 'pl-8', className)} {...partProps} {...props}>
      {children}
    </div>
  );
}

function CheckIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export interface DropdownMenuCheckboxItemProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onSelect'
> {
  checked?: boolean;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onSelect?: (event: Event) => void;
}

export function DropdownMenuCheckboxItem({
  className,
  children,
  checked = false,
  disabled = false,
  onCheckedChange,
  onSelect,
  onClick,
  ...props
}: DropdownMenuCheckboxItemProps) {
  const { classes } = useDropdownMenuContext('DropdownMenuCheckboxItem');
  const select = useItemSelect(disabled, onSelect);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    // Checked state is consumer-controlled; the score owns only open/close.
    select(() => onCheckedChange?.(!checked));
  };

  const indicator = React.createElement(
    'span',
    { className: classes.itemIndicator, 'aria-hidden': 'true' },
    checked ? <CheckIcon className={classes.checkIcon} /> : null,
  );

  return (
    // biome-ignore lint/a11y/useSemanticElements: role="menuitemcheckbox" is the menu APG pattern
    <div
      data-part="item"
      role="menuitemcheckbox"
      data-roving-item=""
      aria-checked={checked}
      tabIndex={disabled ? undefined : -1}
      aria-disabled={disabled ? 'true' : undefined}
      data-disabled={disabled ? '' : undefined}
      data-state={checked ? 'checked' : 'unchecked'}
      className={classy(classes.checkboxItem, className)}
      onClick={handleClick}
      {...props}
    >
      {indicator}
      {children}
    </div>
  );
}

export interface DropdownMenuRadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
}

export function DropdownMenuRadioGroup({
  value = '',
  onValueChange,
  className,
  children,
  ...props
}: DropdownMenuRadioGroupProps) {
  const { classes } = useDropdownMenuContext('DropdownMenuRadioGroup');
  const contextValue = React.useMemo<DropdownMenuRadioContextValue>(
    () => ({ value, onValueChange: (next: string) => onValueChange?.(next) }),
    [value, onValueChange],
  );
  return (
    <DropdownMenuRadioContext.Provider value={contextValue}>
      {/* biome-ignore lint/a11y/useSemanticElements: role="group" is correct for menu radio groups per WAI-ARIA APG */}
      <div role="group" className={classy(classes.group, className)} {...props}>
        {children}
      </div>
    </DropdownMenuRadioContext.Provider>
  );
}

export interface DropdownMenuRadioItemProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onSelect'
> {
  value: string;
  disabled?: boolean;
  onSelect?: (event: Event) => void;
}

export function DropdownMenuRadioItem({
  className,
  children,
  value: itemValue,
  disabled = false,
  onSelect,
  onClick,
  ...props
}: DropdownMenuRadioItemProps) {
  const { classes } = useDropdownMenuContext('DropdownMenuRadioItem');
  const radio = React.useContext(DropdownMenuRadioContext);
  if (!radio) {
    throw new Error('DropdownMenuRadioItem must be used within DropdownMenuRadioGroup');
  }
  const select = useItemSelect(disabled, onSelect);
  const checked = radio.value === itemValue;

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    select(() => radio.onValueChange(itemValue));
  };

  const indicator = React.createElement(
    'span',
    { className: classes.itemIndicator, 'aria-hidden': 'true' },
    checked
      ? React.createElement('span', { className: classes.radioDot, 'aria-hidden': 'true' })
      : null,
  );

  return (
    // biome-ignore lint/a11y/useSemanticElements: role="menuitemradio" is the menu APG pattern
    <div
      data-part="item"
      role="menuitemradio"
      data-value={itemValue}
      data-roving-item=""
      aria-checked={checked}
      tabIndex={disabled ? undefined : -1}
      aria-disabled={disabled ? 'true' : undefined}
      data-disabled={disabled ? '' : undefined}
      data-state={checked ? 'checked' : 'unchecked'}
      className={classy(classes.radioItem, className)}
      onClick={handleClick}
      {...props}
    >
      {indicator}
      {children}
    </div>
  );
}

export type DropdownMenuSeparatorProps = React.HTMLAttributes<HTMLHRElement>;

export function DropdownMenuSeparator({ className, ...props }: DropdownMenuSeparatorProps) {
  const { classes } = useDropdownMenuContext('DropdownMenuSeparator');
  return <hr className={classy(classes.separator, className)} {...props} />;
}

export type DropdownMenuShortcutProps = React.HTMLAttributes<HTMLSpanElement>;

export function DropdownMenuShortcut({ className, ...props }: DropdownMenuShortcutProps) {
  const { classes } = useDropdownMenuContext('DropdownMenuShortcut');
  return React.createElement('span', { className: classy(classes.shortcut, className), ...props });
}

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

export { DropdownMenu as DropdownMenuRoot };
