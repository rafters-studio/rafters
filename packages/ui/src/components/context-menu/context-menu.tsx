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
import { keyInputOf } from '../../hooks/key-input';
import { useMemory } from '../../hooks/use-memory';
import { usePresence } from '../../hooks/use-presence';
import { createBehavior, type AriaAttrs, type PartIds, type PayloadArgs } from '../../lib/contract';
import { getPortalContainer } from '../../primitives/portal';
import classy from '../../primitives/classy';
import { mergeProps } from '../../primitives/slot';
import {
  contextMenu,
  contextSubMenu,
  isContextMenuOpen,
  isSubMenuOpen,
  MENU_ITEM_SELECTOR,
  positionContextMenuContent,
  positionSubContent,
  startContextMenuEffects,
  startContextSubMenuEffects,
  type ContextMenuActions,
  type ContextMenuConfig,
  type ContextMenuPart,
  type ContextMenuState,
  type ContextSubMenuActions,
  type ContextSubMenuConfig,
  type ContextSubMenuPart,
  type ContextSubMenuState,
} from './context-menu.behavior';
import { contextMenuClasses, type ContextMenuClassSet } from './context-menu.classes';

interface ContextMenuContextValue {
  state: ContextMenuState;
  ids: PartIds<ContextMenuPart>;
  aria: Partial<Record<ContextMenuPart, AriaAttrs>>;
  request: <K extends keyof ContextMenuActions>(
    action: K,
    ...payload: PayloadArgs<ContextMenuActions[K]>
  ) => boolean;
  getPart: (part: string) => HTMLElement | null;
  config: ContextMenuConfig;
  effectiveOpen: boolean;
  classes: ContextMenuClassSet;
}

const ContextMenuCtx = React.createContext<ContextMenuContextValue | null>(null);

function useContextMenuCtx(component: string): ContextMenuContextValue {
  const context = React.useContext(ContextMenuCtx);
  if (!context) {
    throw new Error(`${component} must be used within <ContextMenu>`);
  }
  return context;
}

/** Radio-group scope: the selected value and the change callback. */
interface RadioGroupContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const RadioGroupCtx = React.createContext<RadioGroupContextValue | null>(null);

export interface ContextMenuProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  loop?: boolean;
  avoidCollisions?: boolean;
}

export function ContextMenu({
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  loop = true,
  avoidCollisions = true,
}: ContextMenuProps) {
  const config: ContextMenuConfig = { open, defaultOpen, loop, avoidCollisions };

  // The controller composes the score with the substrate -- no useBehavior.
  const { memory, dispatch } = React.useMemo(() => createBehavior(contextMenu, config), []);
  const state = useMemory(memory);
  const effectiveOpen = isContextMenuOpen(state, config);

  const uid = React.useId();
  const ids = React.useMemo(() => {
    const out = {} as PartIds<ContextMenuPart>;
    for (const part of Object.keys(contextMenu.parts) as ContextMenuPart[]) {
      out[part] = `${uid}-${part}`;
    }
    return out;
  }, [uid]);

  // Content portals to document.body with a stable id, so getPart resolves by
  // id -- the roving/typeahead/dismiss trio and the positioner find it there.
  const getPart = React.useCallback(
    (part: string): HTMLElement | null =>
      typeof document === 'undefined' ? null : document.getElementById(`${uid}-${part}`),
    [uid],
  );

  const latest = React.useRef({ config, onOpenChange });
  latest.current = { config, onOpenChange };
  const request = React.useCallback(
    <K extends keyof ContextMenuActions>(
      action: K,
      ...payload: PayloadArgs<ContextMenuActions[K]>
    ): boolean => {
      const { config: cfg, onOpenChange: cb } = latest.current;
      if (!dispatch(action, cfg, ...payload)) return false;
      cb?.(action === 'openAt');
      return true;
    },
    [dispatch],
  );

  // The roving/typeahead/dismiss trio, composed directly on the open transition
  // (replacing the effects runner). Level-triggered via the dependency array;
  // the closed->open edge also moves focus into the menu.
  React.useEffect(() => {
    if (!effectiveOpen) return;
    const content = getPart('content');
    if (!content) return;
    const stop = startContextMenuEffects({
      content,
      loop,
      onDismiss: () => request('close'),
    });
    content.querySelector<HTMLElement>(MENU_ITEM_SELECTOR)?.focus();
    return stop;
  }, [effectiveOpen, loop, getPart, request]);

  // Place the menu at the cursor point whenever it opens or the point moves.
  // Depends on the primitive avoidCollisions, not the per-render config object,
  // so it re-runs only when the point (or that flag) actually changes.
  React.useEffect(() => {
    if (!effectiveOpen) return;
    const content = getPart('content');
    if (content)
      positionContextMenuContent(content, { x: state.x, y: state.y }, { avoidCollisions });
  }, [effectiveOpen, state.x, state.y, getPart, avoidCollisions]);

  // Restore focus to the trigger on the open->close edge.
  const wasOpen = React.useRef(effectiveOpen);
  React.useEffect(() => {
    if (wasOpen.current && !effectiveOpen) getPart('trigger')?.focus();
    wasOpen.current = effectiveOpen;
  }, [effectiveOpen, getPart]);

  const aria = contextMenu.aria(state, config, ids);

  const contextValue: ContextMenuContextValue = {
    state,
    ids,
    aria,
    request,
    getPart,
    config,
    effectiveOpen,
    classes: contextMenuClasses(config, state),
  };

  return <ContextMenuCtx.Provider value={contextValue}>{children}</ContextMenuCtx.Provider>;
}

export interface ContextMenuTriggerProps extends React.HTMLAttributes<HTMLSpanElement> {
  asChild?: boolean;
  disabled?: boolean;
}

export function ContextMenuTrigger({
  asChild,
  disabled,
  onContextMenu,
  className,
  children,
  ...props
}: ContextMenuTriggerProps) {
  const { ids, aria, request, classes } = useContextMenuCtx('ContextMenuTrigger');

  const handleContextMenu = (event: React.MouseEvent<HTMLSpanElement>) => {
    onContextMenu?.(event);
    if (disabled || event.defaultPrevented) return;
    event.preventDefault();
    request('openAt', { x: event.clientX, y: event.clientY });
  };

  const partProps = {
    'data-part': 'trigger',
    id: ids.trigger,
    // Focusable only programmatically (-1): Escape/select restores focus here
    // when the menu closes, without adding the region to the Tab sequence.
    tabIndex: -1,
    className: classy(classes.trigger, className),
    'data-disabled': disabled ? '' : undefined,
    ...aria.trigger,
    onContextMenu: handleContextMenu,
  };

  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as Record<string, unknown>;
    return React.cloneElement(children, mergeProps(partProps, childProps) as React.Attributes);
  }

  // biome-ignore lint/a11y/noStaticElementInteractions: a context-menu trigger requires onContextMenu, a pointer gesture with no keyboard equivalent by design.
  return React.createElement('span', { ...partProps, ...props }, children);
}

export interface ContextMenuPortalProps {
  children: React.ReactNode;
  container?: HTMLElement | null;
  forceMount?: boolean;
}

/** Passthrough for Radix-style composition. Content already brings its own
 *  portal, so this simply renders its children in place. */
export function ContextMenuPortal({ children }: ContextMenuPortalProps) {
  return <>{children}</>;
}

export interface ContextMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  forceMount?: boolean;
  container?: HTMLElement | null;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
}

export function ContextMenuContent({
  forceMount,
  container,
  onEscapeKeyDown,
  className,
  children,
  onKeyDown,
  ...props
}: ContextMenuContentProps) {
  const { config, state, effectiveOpen, ids, aria, classes, request } =
    useContextMenuCtx('ContextMenuContent');
  // Presence (wave 0-B): keep the content mounted through its exit animation.
  // With no exit animation it releases immediately, so behavior is unchanged.
  const { present, ref: presenceRef } = usePresence(effectiveOpen);

  if (!(forceMount || present)) return null;
  if (typeof document === 'undefined') return null;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const action = contextMenu.keymap(keyInputOf(event), state, 'content', config);
    if (action !== 'close') return;
    onEscapeKeyDown?.(event.nativeEvent);
    if (event.nativeEvent.defaultPrevented) return;
    event.preventDefault();
    request('close');
  };

  const content = (
    <div
      data-part="content"
      id={ids.content}
      ref={presenceRef}
      role="menu"
      tabIndex={-1}
      className={classy(classes.content, className)}
      {...aria.content}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {children}
    </div>
  );

  const target = getPortalContainer(
    container !== undefined ? { container, enabled: true } : { enabled: true },
  );
  if (!target) return content;
  return createPortal(content, target);
}

export type ContextMenuGroupProps = React.HTMLAttributes<HTMLDivElement>;

export function ContextMenuGroup({ className, ...props }: ContextMenuGroupProps) {
  const { classes } = useContextMenuCtx('ContextMenuGroup');
  // biome-ignore lint/a11y/useSemanticElements: role="group" is the WAI-ARIA menu grouping element.
  return <div role="group" className={classy(classes.group, className)} {...props} />;
}

export interface ContextMenuLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}

export function ContextMenuLabel({ className, inset, ...props }: ContextMenuLabelProps) {
  const { classes } = useContextMenuCtx('ContextMenuLabel');
  return <div className={classy(classes.label, inset ? 'pl-8' : '', className)} {...props} />;
}

/** Shared select-and-close for every item variant. Runs the consumer's select
 *  hook first; unless vetoed, applies the variant's extra effect and closes the
 *  menu (the menu-collection contract). */
function useItemSelect(disabled: boolean | undefined, onSelect?: (event: Event) => void) {
  const { request } = useContextMenuCtx('ContextMenuItem');
  return React.useCallback(
    (extra?: () => void): void => {
      if (disabled) return;
      const event = new Event('select', { cancelable: true });
      onSelect?.(event);
      if (event.defaultPrevented) return;
      extra?.();
      request('close');
    },
    [disabled, onSelect, request],
  );
}

/** The absolute-positioned check/dot slot. className is pre-declared in a props
 *  object so the span carries no literal className attribute. */
function ItemIndicator({ children }: { children?: React.ReactNode }) {
  const { classes } = useContextMenuCtx('ContextMenuItemIndicator');
  const spanProps = { className: classes.itemIndicator };
  return React.createElement('span', spanProps, children);
}

export interface ContextMenuItemProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onSelect'
> {
  inset?: boolean;
  disabled?: boolean;
  onSelect?: (event: Event) => void;
}

export function ContextMenuItem({
  className,
  inset,
  disabled,
  onSelect,
  onClick,
  onKeyDown,
  ...props
}: ContextMenuItemProps) {
  const { classes } = useContextMenuCtx('ContextMenuItem');
  const select = useItemSelect(disabled, onSelect);

  return (
    <div
      // biome-ignore lint/a11y/useSemanticElements: role="menuitem" is the WAI-ARIA menu item, not a native element.
      role="menuitem"
      tabIndex={disabled ? undefined : -1}
      aria-disabled={disabled || undefined}
      data-disabled={disabled ? '' : undefined}
      className={classy(classes.item, inset ? 'pl-8' : '', className)}
      onClick={(event: React.MouseEvent<HTMLDivElement>) => {
        onClick?.(event);
        select();
      }}
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(event);
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          select();
        }
      }}
      {...props}
    />
  );
}

export interface ContextMenuCheckboxItemProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onSelect'
> {
  checked?: boolean;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onSelect?: (event: Event) => void;
}

export function ContextMenuCheckboxItem({
  className,
  checked = false,
  disabled,
  onCheckedChange,
  onSelect,
  onClick,
  onKeyDown,
  children,
  ...props
}: ContextMenuCheckboxItemProps) {
  const { classes } = useContextMenuCtx('ContextMenuCheckboxItem');
  const select = useItemSelect(disabled, onSelect);
  const toggle = () => select(() => onCheckedChange?.(!checked));

  return (
    <div
      // biome-ignore lint/a11y/useSemanticElements: role="menuitemcheckbox" is the WAI-ARIA menu checkbox item.
      role="menuitemcheckbox"
      aria-checked={checked}
      tabIndex={disabled ? undefined : -1}
      aria-disabled={disabled || undefined}
      data-disabled={disabled ? '' : undefined}
      data-state={checked ? 'checked' : 'unchecked'}
      className={classy(classes.checkboxItem, className)}
      onClick={(event: React.MouseEvent<HTMLDivElement>) => {
        onClick?.(event);
        toggle();
      }}
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(event);
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggle();
        }
      }}
      {...props}
    >
      <ItemIndicator>
        {checked ? (
          <svg
            className={classes.checkIcon}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : null}
      </ItemIndicator>
      {children}
    </div>
  );
}

export interface ContextMenuRadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
}

export function ContextMenuRadioGroup({
  value = '',
  onValueChange,
  className,
  ...props
}: ContextMenuRadioGroupProps) {
  const { classes } = useContextMenuCtx('ContextMenuRadioGroup');
  const contextValue = React.useMemo<RadioGroupContextValue>(
    () => ({ value, onValueChange: (next: string) => onValueChange?.(next) }),
    [value, onValueChange],
  );
  return (
    <RadioGroupCtx.Provider value={contextValue}>
      {/* biome-ignore lint/a11y/useSemanticElements: role="group" is the WAI-ARIA menu radio grouping element. */}
      <div role="group" className={classy(classes.group, className)} {...props} />
    </RadioGroupCtx.Provider>
  );
}

export interface ContextMenuRadioItemProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onSelect'
> {
  value: string;
  disabled?: boolean;
  onSelect?: (event: Event) => void;
}

export function ContextMenuRadioItem({
  className,
  value,
  disabled,
  onSelect,
  onClick,
  onKeyDown,
  children,
  ...props
}: ContextMenuRadioItemProps) {
  const { classes } = useContextMenuCtx('ContextMenuRadioItem');
  const group = React.useContext(RadioGroupCtx);
  if (!group) {
    throw new Error('ContextMenuRadioItem must be used within <ContextMenu.RadioGroup>');
  }
  const checked = group.value === value;
  const select = useItemSelect(disabled, onSelect);
  const pick = () => select(() => group.onValueChange(value));

  const dotProps = { className: classes.radioDot, 'aria-hidden': 'true' as const };

  return (
    <div
      // biome-ignore lint/a11y/useSemanticElements: role="menuitemradio" is the WAI-ARIA menu radio item.
      role="menuitemradio"
      aria-checked={checked}
      tabIndex={disabled ? undefined : -1}
      aria-disabled={disabled || undefined}
      data-disabled={disabled ? '' : undefined}
      data-state={checked ? 'checked' : 'unchecked'}
      className={classy(classes.radioItem, className)}
      onClick={(event: React.MouseEvent<HTMLDivElement>) => {
        onClick?.(event);
        pick();
      }}
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(event);
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          pick();
        }
      }}
      {...props}
    >
      <ItemIndicator>{checked ? React.createElement('span', dotProps) : null}</ItemIndicator>
      {children}
    </div>
  );
}

export type ContextMenuSeparatorProps = React.HTMLAttributes<HTMLHRElement>;

export function ContextMenuSeparator({ className, ...props }: ContextMenuSeparatorProps) {
  const { classes } = useContextMenuCtx('ContextMenuSeparator');
  return <hr className={classy(classes.separator, className)} {...props} />;
}

export type ContextMenuShortcutProps = React.HTMLAttributes<HTMLSpanElement>;

export function ContextMenuShortcut({ className, ...props }: ContextMenuShortcutProps) {
  const { classes } = useContextMenuCtx('ContextMenuShortcut');
  const spanProps = { className: classy(classes.shortcut, className), ...props };
  return React.createElement('span', spanProps);
}

// ==================== Submenu ====================

interface SubMenuContextValue {
  state: ContextSubMenuState;
  config: ContextSubMenuConfig;
  ids: PartIds<ContextSubMenuPart>;
  aria: Partial<Record<ContextSubMenuPart, AriaAttrs>>;
  request: (action: keyof ContextSubMenuActions, source?: 'pointer' | 'discrete') => boolean;
  effectiveOpen: boolean;
}

const SubMenuCtx = React.createContext<SubMenuContextValue | null>(null);

function useSubMenuCtx(component: string): SubMenuContextValue {
  const context = React.useContext(SubMenuCtx);
  if (!context) {
    throw new Error(`${component} must be used within <ContextMenu.Sub>`);
  }
  return context;
}

export interface ContextMenuSubProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  loop?: boolean;
  avoidCollisions?: boolean;
}

export function ContextMenuSub({
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  loop = true,
  avoidCollisions = true,
}: ContextMenuSubProps) {
  const config: ContextSubMenuConfig = { open, defaultOpen, loop, avoidCollisions };

  const { memory, dispatch } = React.useMemo(() => createBehavior(contextSubMenu, config), []);
  const state = useMemory(memory);
  const effectiveOpen = isSubMenuOpen(state, config);

  const uid = React.useId();
  const ids = React.useMemo(
    () => ({ subTrigger: `${uid}-sub-trigger`, subContent: `${uid}-sub-content` }),
    [uid],
  );
  const getPart = React.useCallback(
    (part: string): HTMLElement | null =>
      typeof document === 'undefined' ? null : document.getElementById(`${uid}-${part}`),
    [uid],
  );

  const latest = React.useRef({ config, onOpenChange });
  latest.current = { config, onOpenChange };
  // Hover open/close dispatches `request` directly, with no JS timer (#2152):
  // the hover-intent delay the submenu's `closed -> open` cell assigns is a
  // CSS `transition-delay` on `subContent` (context-menu.classes.ts, consuming
  // `--rafters-delay-hover-intent`), not a value this component reads or sets.
  // `source` (only meaningful for 'open') is that delay's disambiguator: the
  // score projects it as `data-open-source`, and the CSS scopes the delay to
  // `'pointer'` so a click or keyboard open (marked 'discrete' by its caller
  // below) resolves through the un-delayed cell instead -- keyboard
  // navigation stays exactly as fast as before this issue. Defaults to
  // 'discrete' so a caller that forgets to pass one fails safe.
  const request = React.useCallback(
    (action: keyof ContextSubMenuActions, source?: 'pointer' | 'discrete'): boolean => {
      const { config: cfg, onOpenChange: cb } = latest.current;
      const ok =
        action === 'open' ? dispatch('open', cfg, source ?? 'discrete') : dispatch('close', cfg);
      if (!ok) return false;
      cb?.(action === 'open');
      return true;
    },
    [dispatch],
  );

  // Position + roving/typeahead + focus-first on the open transition. The
  // sub-content portals to body, so the parent's roving never sees its items.
  React.useEffect(() => {
    if (!effectiveOpen) return;
    const subContent = getPart('sub-content');
    if (!subContent) return;
    const subTrigger = getPart('sub-trigger');
    if (subTrigger) positionSubContent(subTrigger, subContent, { avoidCollisions });
    const stop = startContextSubMenuEffects(subContent, loop);
    subContent.querySelector<HTMLElement>(MENU_ITEM_SELECTOR)?.focus();
    return stop;
  }, [effectiveOpen, loop, avoidCollisions, getPart]);

  // Restore focus to the sub-trigger on the open->close edge.
  const wasOpen = React.useRef(effectiveOpen);
  React.useEffect(() => {
    if (wasOpen.current && !effectiveOpen) getPart('sub-trigger')?.focus();
    wasOpen.current = effectiveOpen;
  }, [effectiveOpen, getPart]);

  const aria = contextSubMenu.aria(state, config, ids);
  const value: SubMenuContextValue = {
    state,
    config,
    ids,
    aria,
    request,
    effectiveOpen,
  };

  return <SubMenuCtx.Provider value={value}>{children}</SubMenuCtx.Provider>;
}

export interface ContextMenuSubTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
  disabled?: boolean;
}

export function ContextMenuSubTrigger({
  className,
  inset,
  disabled,
  onPointerEnter,
  onPointerLeave,
  onKeyDown,
  onClick,
  children,
  ...props
}: ContextMenuSubTriggerProps) {
  const { classes } = useContextMenuCtx('ContextMenuSubTrigger');
  const sub = useSubMenuCtx('ContextMenuSubTrigger');

  return (
    <div
      // biome-ignore lint/a11y/useSemanticElements: role="menuitem" is the WAI-ARIA menu item that discloses a submenu.
      role="menuitem"
      data-part="sub-trigger"
      id={sub.ids.subTrigger}
      tabIndex={disabled ? undefined : -1}
      aria-disabled={disabled || undefined}
      data-disabled={disabled ? '' : undefined}
      className={classy(classes.subTrigger, inset ? 'pl-8' : '', className)}
      {...sub.aria.subTrigger}
      onPointerEnter={(event: React.PointerEvent<HTMLDivElement>) => {
        onPointerEnter?.(event);
        if (!disabled) sub.request('open', 'pointer');
      }}
      onPointerLeave={(event: React.PointerEvent<HTMLDivElement>) => {
        onPointerLeave?.(event);
        sub.request('close');
      }}
      onClick={(event: React.MouseEvent<HTMLDivElement>) => {
        onClick?.(event);
        if (!disabled) sub.request('open', 'discrete');
      }}
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(event);
        if (disabled) return;
        const action = contextSubMenu.keymap(
          keyInputOf(event),
          sub.state,
          'subTrigger',
          sub.config,
        );
        if (action === 'open') {
          event.preventDefault();
          sub.request('open', 'discrete');
        }
      }}
      {...props}
    >
      {children}
      <svg
        className={classes.subTriggerChevron}
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
}

export interface ContextMenuSubContentProps extends React.HTMLAttributes<HTMLDivElement> {
  forceMount?: boolean;
  container?: HTMLElement | null;
}

export function ContextMenuSubContent({
  forceMount,
  container,
  className,
  children,
  onKeyDown,
  ...props
}: ContextMenuSubContentProps) {
  const { classes } = useContextMenuCtx('ContextMenuSubContent');
  const sub = useSubMenuCtx('ContextMenuSubContent');
  const { present, ref: presenceRef } = usePresence(sub.effectiveOpen);

  if (!(forceMount || present)) return null;
  if (typeof document === 'undefined') return null;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const action = contextSubMenu.keymap(keyInputOf(event), sub.state, 'subContent', sub.config);
    if (action !== 'close') return;
    event.preventDefault();
    sub.request('close');
  };

  const content = (
    <div
      data-part="sub-content"
      id={sub.ids.subContent}
      ref={presenceRef}
      role="menu"
      tabIndex={-1}
      className={classy(classes.subContent, className)}
      {...sub.aria.subContent}
      onPointerEnter={() => sub.request('open', 'pointer')}
      onPointerLeave={() => sub.request('close')}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {children}
    </div>
  );

  const target = getPortalContainer(
    container !== undefined ? { container, enabled: true } : { enabled: true },
  );
  if (!target) return content;
  return createPortal(content, target);
}

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

export { ContextMenu as ContextMenuRoot };
