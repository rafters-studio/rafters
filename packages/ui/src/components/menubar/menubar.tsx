/**
 * Menubar component for application-style horizontal command menus
 *
 * @cognitive-load 5/10 - decision 1, information 2, interaction 1, disruption 0,
 * learning 1. The user picks a category, then an action inside it: two small
 * decisions made one at a time. Information is the heavy dimension -- every menu
 * is a list to scan, and the bar exists to hold many commands. Interaction is one
 * point because the keyboard model spans two axes (across the bar, down a menu).
 * Nothing is seized: menus anchor under their trigger and the page stays put. The
 * File/Edit/View bar is a long-learned desktop idiom, so learning costs little.
 * @attention-economics Persistent and quiet: the bar is always visible but spends
 * no attention until a trigger is chosen, and only one menu is ever open, so at
 * most one list competes for attention. Moving between menus while one is open
 * lets the user browse categories without re-committing each time.
 * @trust-building Predictable and reversible: exactly one menu opens at a time,
 * Escape and an outside click close it without acting, and activating an item
 * closes the menu and hands focus back to the trigger it came from. Keyboard
 * shortcuts shown beside items build confidence in the command set.
 * @accessibility role="menubar" (horizontal) on the root; each trigger is a
 * role="menuitem" menu button (aria-haspopup="menu", aria-expanded,
 * aria-controls while open); each menu is role="menu" (vertical) named by its
 * trigger. ArrowLeft/Right rove the triggers, ArrowDown/Enter/Space open a menu
 * and land focus on its first item, ArrowUp/Down and Home/End rove the items,
 * typing jumps to a matching item, ArrowLeft/Right inside a menu move to the
 * neighbouring menu, Escape closes and returns focus to the trigger.
 * @semantic-meaning Application command bar: Menu=command category,
 * Item=action, CheckboxItem=toggle, RadioItem=exclusive choice,
 * Shortcut=keyboard hint, Separator=group boundary
 *
 * @usage-patterns
 * DO: Use for application-level commands grouped by category (File, Edit, View, Help)
 * DO: Group related actions within each menu, separated by Separator
 * DO: Show keyboard shortcuts with Shortcut for frequent actions
 * DO: Keep the bar to a handful of menus (5-8) and each menu to 7 plus or minus 2 items
 * NEVER: Primary site navigation (use NavigationMenu), a single menu (use DropdownMenu), mobile-first layouts
 *
 * @example
 * ```tsx
 * <Menubar>
 *   <Menubar.Menu value="file">
 *     <Menubar.Trigger>File</Menubar.Trigger>
 *     <Menubar.Content>
 *       <Menubar.Item>New Tab <Menubar.Shortcut>Cmd+T</Menubar.Shortcut></Menubar.Item>
 *       <Menubar.Separator />
 *       <Menubar.Item>Print</Menubar.Item>
 *     </Menubar.Content>
 *   </Menubar.Menu>
 *   <Menubar.Menu value="edit">
 *     <Menubar.Trigger>Edit</Menubar.Trigger>
 *     <Menubar.Content>
 *       <Menubar.Item>Undo <Menubar.Shortcut>Cmd+Z</Menubar.Shortcut></Menubar.Item>
 *     </Menubar.Content>
 *   </Menubar.Menu>
 * </Menubar>
 * ```
 */
import * as React from 'react';
import { createPortal } from 'react-dom';
import { createBehavior, type PayloadArgs } from '../../lib/contract';
import { keyInputOf } from '../../hooks/key-input';
import { useMemory } from '../../hooks/use-memory';
import classy from '../../primitives/classy';
import { mergeProps } from '../../primitives/slot';
import {
  activeMenu,
  focusMenu,
  menubar,
  menubarInstanceAria,
  menubarValues,
  startMenubarBar,
  startMenubarMenu,
  type MenubarActions,
  type MenubarConfig,
  type MenubarPart,
  type MenubarState,
} from './menubar.behavior';
import { menubarClasses, type MenubarClassSet } from './menubar.classes';

interface MenubarContextValue {
  state: MenubarState;
  config: MenubarConfig;
  active: string | null;
  request: <K extends keyof MenubarActions>(
    action: K,
    ...payload: PayloadArgs<MenubarActions[K]>
  ) => boolean;
  /** Close the open menu and return focus to its trigger. */
  closeToTrigger: () => void;
  /** The effective open menu at event time (a pointer crossing may have
   *  switched it since the last render). */
  currentActive: () => string | null;
  instanceId: (part: MenubarPart, value: string) => string;
  /** The portal target for the menus, once mounted. */
  menuHost: HTMLElement | null;
  classes: MenubarClassSet;
}

const MenubarContext = React.createContext<MenubarContextValue | null>(null);

function useMenubarContext(component: string): MenubarContextValue {
  const context = React.useContext(MenubarContext);
  if (!context) {
    throw new Error(`${component} must be used within <Menubar>`);
  }
  return context;
}

interface MenubarMenuContextValue {
  value: string;
  triggerId: string;
  contentId: string;
}

const MenubarMenuContext = React.createContext<MenubarMenuContextValue | null>(null);

function useMenuContext(component: string): MenubarMenuContextValue {
  const context = React.useContext(MenubarMenuContext);
  if (!context) {
    throw new Error(`${component} must be used within <MenubarMenu>`);
  }
  return context;
}

/** Consumer-controlled checked state for a radio group (the score owns only
 *  which menu is open). */
interface MenubarRadioContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const MenubarRadioContext = React.createContext<MenubarRadioContextValue | null>(null);

export interface MenubarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue'> {
  /** Controlled open menu ('' = none). */
  value?: string;
  /** Uncontrolled seed. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Wrap at the ends of the trigger row. Default true. */
  loop?: boolean;
}

export function Menubar({
  value,
  defaultValue = '',
  onValueChange,
  loop = true,
  className,
  children,
  onKeyDown,
  ...props
}: MenubarProps) {
  const config: MenubarConfig = { value, defaultValue, loop };

  const { memory, dispatch } = React.useMemo(() => createBehavior(menubar, config), []);
  const state = useMemory(memory);
  const active = activeMenu(state, config);

  const uid = React.useId();
  const instanceId = React.useCallback(
    (part: MenubarPart, key: string) => `${uid}-${part}-${key}`,
    [uid],
  );
  const byId = React.useCallback(
    (part: MenubarPart, key: string): HTMLElement | null =>
      typeof document === 'undefined' ? null : document.getElementById(instanceId(part, key)),
    [instanceId],
  );

  const rootRef = React.useRef<HTMLDivElement>(null);
  // Where the menus portal to: a host rendered right after the bar, so each
  // menu is out of the bar (see MenubarContent) but inside whatever landmark
  // holds it. Known only after mount; until then each menu renders in place.
  const [menuHost, setMenuHost] = React.useState<HTMLElement | null>(null);

  // Effect-initiated dispatches (focus/pointer follow, outside dismissal) must
  // read the CURRENT config and callback, so those ride in a ref.
  const latest = React.useRef({ config, onValueChange });
  latest.current = { config, onValueChange };
  const request = React.useCallback(
    <K extends keyof MenubarActions>(
      action: K,
      ...payload: PayloadArgs<MenubarActions[K]>
    ): boolean => {
      const { config: cfg, onValueChange: cb } = latest.current;
      // Effective before vs INTRINSIC after: a controlled menubar's effective
      // value never moves, but the callback must still report the next value.
      const before = activeMenu(memory.get(), cfg) ?? '';
      if (!dispatch(action, cfg, ...payload)) return false;
      const next = memory.get().active ?? '';
      if (next !== before) cb?.(next);
      return true;
    },
    [memory, dispatch],
  );

  const currentActive = React.useCallback(
    () => activeMenu(memory.get(), latest.current.config),
    [memory],
  );

  const closeToTrigger = React.useCallback(() => {
    const open = currentActive();
    if (!request('close')) return;
    if (open !== null) byId('trigger', open)?.focus();
  }, [currentActive, request, byId]);

  // The bar: roving across the triggers, and the open menu following focus or
  // the pointer onto another trigger. Once per mount.
  React.useEffect(() => {
    const bar = rootRef.current;
    if (!bar) return;
    return startMenubarBar({
      bar,
      loop,
      current: currentActive,
      onFollow: (next, pointer) =>
        void (pointer
          ? request('follow', { value: next, from: currentActive() })
          : request('open', next)),
    });
  }, [loop, currentActive, request]);

  // The open menu: dropdown-menu's open-menu trio over it, restarted whenever
  // the open menu changes (or the host first mounts the menus); then focus
  // lands inside it.
  React.useEffect(() => {
    const bar = rootRef.current;
    if (active === null || !bar || !menuHost) return;
    const trigger = byId('trigger', active);
    const content = byId('content', active);
    if (!trigger || !content) return;
    const stop = startMenubarMenu({
      bar,
      trigger,
      content,
      onDismiss: () => void request('close'),
    });
    focusMenu(content);
    return stop;
  }, [active, menuHost, byId, request]);

  // One root keydown handler drives the score for the triggers AND the portaled
  // menus (React events bubble through the portal), so the part wrappers stay
  // pure click adapters.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const partEl = (event.target as HTMLElement).closest<HTMLElement>('[data-part]');
    const part = partEl?.dataset['part'] as MenubarPart | undefined;
    if (!partEl || !part) return;

    const item = partEl.closest<HTMLElement>('[data-part="item"]');
    if (item && (event.key === 'Enter' || event.key === ' ')) {
      if (item.getAttribute('aria-disabled') === 'true') return;
      event.preventDefault();
      item.click();
      return;
    }

    const action = menubar.keymap(keyInputOf(event), state, part, config);
    if (!action) return;
    event.preventDefault();
    if (action === 'open') {
      const next = partEl.dataset['value'];
      if (next === undefined) return;
      request('open', next);
      // Already open (focus sat on its trigger): the key still enters the menu.
      focusMenu(byId('content', next));
      return;
    }
    if (action === 'close') {
      closeToTrigger();
      return;
    }
    const bar = rootRef.current;
    if (!bar) return;
    request(action, { values: menubarValues(bar), from: currentActive(), loop });
  };

  const classes = menubarClasses(config, state);
  const aria = menubar.aria(state, config, { root: '', trigger: '', content: '', item: '' });

  const contextValue: MenubarContextValue = {
    state,
    config,
    active,
    request,
    closeToTrigger,
    currentActive,
    instanceId,
    menuHost,
    classes,
  };

  return (
    <MenubarContext.Provider value={contextValue}>
      <div
        ref={rootRef}
        data-part="root"
        className={classy(classes.root, className)}
        {...aria.root}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {children}
      </div>
      <div ref={setMenuHost} className={classes.menuHost} />
    </MenubarContext.Provider>
  );
}

export interface MenubarMenuProps {
  /** Identifies the menu (the controlled `value` names it). Generated when
   *  omitted. */
  value?: string;
  children: React.ReactNode;
}

export function MenubarMenu({ value, children }: MenubarMenuProps) {
  const { instanceId } = useMenubarContext('MenubarMenu');
  const generated = React.useId();
  const menuValue = value ?? generated;
  const contextValue = React.useMemo<MenubarMenuContextValue>(
    () => ({
      value: menuValue,
      triggerId: instanceId('trigger', menuValue),
      contentId: instanceId('content', menuValue),
    }),
    [menuValue, instanceId],
  );
  return <MenubarMenuContext.Provider value={contextValue}>{children}</MenubarMenuContext.Provider>;
}

export interface MenubarTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function MenubarTrigger({
  className,
  children,
  asChild,
  onClick,
  ...props
}: MenubarTriggerProps) {
  const { state, config, request, currentActive, classes } = useMenubarContext('MenubarTrigger');
  const { value, triggerId, contentId } = useMenuContext('MenubarTrigger');
  const aria = menubarInstanceAria('trigger', value, state, config, {
    trigger: triggerId,
    content: contentId,
  });

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    request('toggle', { value, from: currentActive() });
    // The press moved focus onto the trigger; an open menu takes it back (a
    // menu that only just opened is focused by the open-menu effect instead).
    if (currentActive() === value) focusMenu(document.getElementById(contentId));
  };

  const partProps = {
    'data-part': 'trigger',
    'data-value': value,
    id: triggerId,
    ...aria,
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

/** Kept for shadcn drop-in compatibility. MenubarContent already portals out
 *  of the bar, so this is a pass-through that preserves the API. */
export function MenubarPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export interface MenubarContentProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

/**
 * The menu. Portaled out of the bar: the trigger rove is roving-focus over the
 * bar, which collects every `role="menuitem"` beneath it, so a menu left inside
 * would pour its items into the trigger row. It lands in the host Menubar
 * renders right after the bar, inside the same landmark (in place, hidden,
 * until that host mounts). Present but inert while closed: the closed pose is
 * CSS off data-state, so the exit can play.
 */
export function MenubarContent({ className, children, asChild, ...props }: MenubarContentProps) {
  const { state, config, active, menuHost, classes } = useMenubarContext('MenubarContent');
  const { value, triggerId, contentId } = useMenuContext('MenubarContent');
  const aria = menubarInstanceAria('content', value, state, config, {
    trigger: triggerId,
    content: contentId,
  });

  // Inline (before the host mounts) the menu is always closed: it sits in the
  // bar there, unpositioned, so it is markup for the server and the hydration
  // pass, never something to show.
  const shown = menuHost !== null && active === value;
  const partProps = {
    'data-part': 'content',
    'data-value': value,
    id: contentId,
    ...aria,
    'data-state': shown ? 'open' : 'closed',
    // Closed, the menu stays rendered so its exit can play; inert keeps it out
    // of the accessibility tree and the tab order. Never `hidden`: display:
    // none would stop the transition.
    inert: !shown,
  };

  const content =
    asChild && React.isValidElement(children) ? (
      React.cloneElement(
        children,
        mergeProps(partProps, children.props as Record<string, unknown>) as React.Attributes,
      )
    ) : (
      <div className={classy(classes.content, className)} {...partProps} {...props}>
        {children}
      </div>
    );

  // Until the host exists -- the server render and the hydration pass -- the
  // menu renders in place, so React server HTML carries every menu (as the
  // Astro performance does) and hydration matches it. The host's ref callback
  // runs in the first commit and its synchronous re-render moves the menu out
  // of the bar before any input can reach the bar rove.
  return menuHost ? createPortal(content, menuHost) : content;
}

export type MenubarGroupProps = React.HTMLAttributes<HTMLDivElement>;

export function MenubarGroup({ className, ...props }: MenubarGroupProps) {
  const { classes } = useMenubarContext('MenubarGroup');
  // biome-ignore lint/a11y/useSemanticElements: role="group" is correct for menu groups per WAI-ARIA APG
  return <div role="group" className={classy(classes.group, className)} {...props} />;
}

export interface MenubarLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}

export function MenubarLabel({ className, inset, ...props }: MenubarLabelProps) {
  const { classes } = useMenubarContext('MenubarLabel');
  return <div className={classy(classes.label, inset && classes.inset, className)} {...props} />;
}

/** The shared select-then-close path: fire a cancelable `select` event and,
 *  unless the consumer vetoes it, run the side effect, close the menu, and
 *  return focus to its trigger. */
function useItemSelect(disabled: boolean, onSelect?: (event: Event) => void) {
  const { closeToTrigger } = useMenubarContext('MenubarItem');
  return React.useCallback(
    (before?: () => void): boolean => {
      if (disabled) return false;
      const event = new Event('select', { cancelable: true });
      onSelect?.(event);
      if (event.defaultPrevented) return false;
      before?.();
      closeToTrigger();
      return true;
    },
    [disabled, onSelect, closeToTrigger],
  );
}

export interface MenubarItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  inset?: boolean;
  disabled?: boolean;
  asChild?: boolean;
  onSelect?: (event: Event) => void;
}

export function MenubarItem({
  className,
  children,
  inset,
  disabled = false,
  asChild,
  onSelect,
  onClick,
  ...props
}: MenubarItemProps) {
  const { classes } = useMenubarContext('MenubarItem');
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
    <div
      className={classy(classes.item, inset && classes.inset, className)}
      {...partProps}
      {...props}
    >
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

export interface MenubarCheckboxItemProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onSelect'
> {
  checked?: boolean;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onSelect?: (event: Event) => void;
}

export function MenubarCheckboxItem({
  className,
  children,
  checked = false,
  disabled = false,
  onCheckedChange,
  onSelect,
  onClick,
  ...props
}: MenubarCheckboxItemProps) {
  const { classes } = useMenubarContext('MenubarCheckboxItem');
  const select = useItemSelect(disabled, onSelect);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    // Checked state is consumer-controlled; the score owns only the open menu.
    select(() => onCheckedChange?.(!checked));
  };

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
      {React.createElement(
        'span',
        { className: classes.itemIndicator, 'aria-hidden': 'true' },
        checked ? <CheckIcon className={classes.checkIcon} /> : null,
      )}
      {children}
    </div>
  );
}

export interface MenubarRadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
}

export function MenubarRadioGroup({
  value = '',
  onValueChange,
  className,
  children,
  ...props
}: MenubarRadioGroupProps) {
  const { classes } = useMenubarContext('MenubarRadioGroup');
  const contextValue = React.useMemo<MenubarRadioContextValue>(
    () => ({ value, onValueChange: (next: string) => onValueChange?.(next) }),
    [value, onValueChange],
  );
  return (
    <MenubarRadioContext.Provider value={contextValue}>
      {/* biome-ignore lint/a11y/useSemanticElements: role="group" is correct for menu radio groups per WAI-ARIA APG */}
      <div role="group" className={classy(classes.group, className)} {...props}>
        {children}
      </div>
    </MenubarRadioContext.Provider>
  );
}

export interface MenubarRadioItemProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onSelect'
> {
  value: string;
  disabled?: boolean;
  onSelect?: (event: Event) => void;
}

export function MenubarRadioItem({
  className,
  children,
  value: itemValue,
  disabled = false,
  onSelect,
  onClick,
  ...props
}: MenubarRadioItemProps) {
  const { classes } = useMenubarContext('MenubarRadioItem');
  const radio = React.useContext(MenubarRadioContext);
  if (!radio) {
    throw new Error('MenubarRadioItem must be used within MenubarRadioGroup');
  }
  const select = useItemSelect(disabled, onSelect);
  const checked = radio.value === itemValue;

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    select(() => radio.onValueChange(itemValue));
  };

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
      {React.createElement(
        'span',
        { className: classes.itemIndicator, 'aria-hidden': 'true' },
        checked
          ? React.createElement('span', { className: classes.radioDot, 'aria-hidden': 'true' })
          : null,
      )}
      {children}
    </div>
  );
}

export type MenubarSeparatorProps = React.HTMLAttributes<HTMLHRElement>;

export function MenubarSeparator({ className, ...props }: MenubarSeparatorProps) {
  const { classes } = useMenubarContext('MenubarSeparator');
  return <hr className={classy(classes.separator, className)} {...props} />;
}

export type MenubarShortcutProps = React.HTMLAttributes<HTMLSpanElement>;

export function MenubarShortcut({ className, ...props }: MenubarShortcutProps) {
  const { classes } = useMenubarContext('MenubarShortcut');
  return React.createElement('span', { className: classy(classes.shortcut, className), ...props });
}

Menubar.Menu = MenubarMenu;
Menubar.Trigger = MenubarTrigger;
Menubar.Portal = MenubarPortal;
Menubar.Content = MenubarContent;
Menubar.Group = MenubarGroup;
Menubar.Label = MenubarLabel;
Menubar.Item = MenubarItem;
Menubar.CheckboxItem = MenubarCheckboxItem;
Menubar.RadioGroup = MenubarRadioGroup;
Menubar.RadioItem = MenubarRadioItem;
Menubar.Separator = MenubarSeparator;
Menubar.Shortcut = MenubarShortcut;

export { Menubar as MenubarRoot };
