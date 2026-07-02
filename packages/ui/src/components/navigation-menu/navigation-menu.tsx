import * as React from 'react';
import { useBehaviorEffects } from '../../hooks/use-behavior-effects';
import { useMemory } from '../../hooks/use-memory';
import { createBehavior, type KeyInput } from '../../lib/contract';
import type { EffectHost } from '../../lib/effects';
import classy from '../../primitives/classy';
import { mergeProps } from '../../primitives/slot';
import {
  activeItem,
  navContentAria,
  navigationMenu,
  navTriggerAria,
  type NavigationMenuConfig,
  type NavigationMenuState,
} from './navigation-menu.behavior';
import { navigationMenuClasses, type NavigationMenuClassSet } from './navigation-menu.classes';

type NavAction = 'open' | 'hoverOpen' | 'toggle' | 'close';

interface NavigationMenuContextValue {
  config: NavigationMenuConfig;
  state: NavigationMenuState;
  active: string | null;
  baseId: string;
  classes: NavigationMenuClassSet;
  requestItem: (action: NavAction, value?: string) => void;
  setList: (element: HTMLElement | null) => void;
}

const NavigationMenuContext = React.createContext<NavigationMenuContextValue | null>(null);

function useNavigationMenuContext(component: string): NavigationMenuContextValue {
  const context = React.useContext(NavigationMenuContext);
  if (!context) {
    throw new Error(`${component} must be used within <NavigationMenu>`);
  }
  return context;
}

interface NavigationMenuItemContextValue {
  value: string;
  triggerId: string;
  contentId: string;
}

const NavigationMenuItemContext = React.createContext<NavigationMenuItemContextValue | null>(null);

function useItemContext(component: string): NavigationMenuItemContextValue {
  const context = React.useContext(NavigationMenuItemContext);
  if (!context) {
    throw new Error(`${component} must be used within <NavigationMenuItem>`);
  }
  return context;
}

export interface NavigationMenuProps extends React.HTMLAttributes<HTMLElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  delayDuration?: number;
}

export function NavigationMenu({
  value,
  defaultValue = '',
  onValueChange,
  orientation = 'horizontal',
  delayDuration = 200,
  className,
  children,
  onKeyDown,
  ...props
}: NavigationMenuProps) {
  const config: NavigationMenuConfig = { value, defaultValue, orientation, delayDuration };

  const { memory, dispatch } = React.useMemo(() => createBehavior(navigationMenu, config), []);
  const state = useMemory(memory);
  const active = activeItem(state, config);
  const baseId = React.useId();

  const requestItem = (action: NavAction, itemValue?: string) => {
    const before = activeItem(memory.get(), config) ?? '';
    const accepted =
      action === 'close'
        ? dispatch('close', config)
        : itemValue !== undefined && dispatch(action, config, itemValue);
    if (!accepted) return;
    // The requested value is whatever the reducer left in intrinsic state;
    // fire the callback only when the effective value actually moved.
    const next = memory.get().active ?? '';
    if (next !== before) onValueChange?.(next);
  };

  const rootRef = React.useRef<HTMLElement | null>(null);
  const listRef = React.useRef<HTMLElement | null>(null);
  const latestRequestItem = React.useRef(requestItem);
  React.useEffect(() => {
    latestRequestItem.current = requestItem;
  });
  const hostRef = React.useRef<EffectHost | null>(null);
  hostRef.current ??= {
    getPart: (part) =>
      part === 'root' ? rootRef.current : part === 'list' ? listRef.current : null,
    dispatch: (action, payload) =>
      latestRequestItem.current(
        action as NavAction,
        typeof payload === 'string' ? payload : undefined,
      ),
  };

  useBehaviorEffects(navigationMenu.effects(state, config), hostRef.current);

  const ids = { root: baseId, list: `${baseId}-list`, trigger: '', content: '' };
  const aria = navigationMenu.aria(state, config, ids);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const target = event.target as HTMLElement;
    const trigger = target.closest<HTMLElement>('[data-part="trigger"]');
    const part = trigger ? 'trigger' : 'root';
    const input: KeyInput = {
      key: event.key,
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
    };
    const action = navigationMenu.keymap(input, state, part, config);
    if (!action) return;
    // Native <button> triggers convert Enter/Space to click; the click
    // handler dispatches toggle (Spec 01 rule 5).
    if (action === 'toggle') return;
    if (action === 'open') {
      const itemValue = trigger?.dataset['value'];
      if (!itemValue) return;
      event.preventDefault();
      requestItem('open', itemValue);
      return;
    }
    if (action === 'close') {
      if (active === null) return;
      event.preventDefault();
      const openTrigger = rootRef.current?.querySelector<HTMLElement>(
        `[data-part="trigger"][data-value="${active}"]`,
      );
      requestItem('close');
      openTrigger?.focus();
    }
  };

  const setList = React.useCallback((element: HTMLElement | null) => {
    listRef.current = element;
  }, []);

  const contextValue: NavigationMenuContextValue = {
    config,
    state,
    active,
    baseId,
    classes: navigationMenuClasses(config, state),
    requestItem,
    setList,
  };

  return (
    <NavigationMenuContext.Provider value={contextValue}>
      <nav
        ref={(node) => {
          rootRef.current = node;
        }}
        data-part="root"
        id={ids.root}
        className={classy(contextValue.classes.root, className)}
        {...aria.root}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {children}
      </nav>
    </NavigationMenuContext.Provider>
  );
}

export type NavigationMenuListProps = React.HTMLAttributes<HTMLUListElement>;

export function NavigationMenuList({ className, ...props }: NavigationMenuListProps) {
  const { config, state, classes, baseId, setList } =
    useNavigationMenuContext('NavigationMenuList');
  const ids = { root: baseId, list: `${baseId}-list`, trigger: '', content: '' };
  const aria = navigationMenu.aria(state, config, ids);
  return (
    <ul
      data-part="list"
      id={ids.list}
      ref={setList}
      className={classy(classes.list, className)}
      {...aria.list}
      {...props}
    />
  );
}

export interface NavigationMenuItemProps extends React.LiHTMLAttributes<HTMLLIElement> {
  value: string;
}

export function NavigationMenuItem({ value, className, ...props }: NavigationMenuItemProps) {
  const { baseId, classes } = useNavigationMenuContext('NavigationMenuItem');
  const itemContext: NavigationMenuItemContextValue = {
    value,
    triggerId: `${baseId}-trigger-${value}`,
    contentId: `${baseId}-content-${value}`,
  };
  return (
    <NavigationMenuItemContext.Provider value={itemContext}>
      <li className={classy(classes.item, className)} {...props} />
    </NavigationMenuItemContext.Provider>
  );
}

export type NavigationMenuTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function NavigationMenuTrigger({
  className,
  children,
  onClick,
  ...props
}: NavigationMenuTriggerProps) {
  const { config, state, classes, requestItem } = useNavigationMenuContext('NavigationMenuTrigger');
  const { value, triggerId, contentId } = useItemContext('NavigationMenuTrigger');
  const aria = navTriggerAria(value, state, config, { contentId });

  return (
    <button
      type="button"
      id={triggerId}
      data-part="trigger"
      data-value={value}
      data-roving-item
      className={classy(classes.trigger, className)}
      {...aria}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        requestItem('toggle', value);
      }}
      {...props}
    >
      {children}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={classes.triggerChevron}
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  );
}

export type NavigationMenuContentProps = React.HTMLAttributes<HTMLDivElement>;

export function NavigationMenuContent({ className, ...props }: NavigationMenuContentProps) {
  const { config, state, classes } = useNavigationMenuContext('NavigationMenuContent');
  const { value, triggerId, contentId } = useItemContext('NavigationMenuContent');
  const aria = navContentAria(value, state, config, { triggerId });

  return (
    <div
      id={contentId}
      data-part="content"
      data-value={value}
      className={classy(classes.content, className)}
      {...aria}
      {...props}
    />
  );
}

export interface NavigationMenuLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  asChild?: boolean;
  active?: boolean;
}

export function NavigationMenuLink({
  asChild,
  active,
  className,
  children,
  ...props
}: NavigationMenuLinkProps) {
  const { classes } = useNavigationMenuContext('NavigationMenuLink');
  const cls = classy(classes.link, className);

  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as Record<string, unknown>;
    const parentProps = { className: cls, 'data-active': active || undefined, ...props };
    return React.cloneElement(children, mergeProps(parentProps, childProps) as React.Attributes);
  }

  return (
    <a className={cls} data-active={active || undefined} {...props}>
      {children}
    </a>
  );
}
