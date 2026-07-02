import * as React from 'react';
import { keyInputOf, useBehavior, type BehaviorBinding } from '../../hooks/use-behavior';
import classy from '../../primitives/classy';
import { mergeProps } from '../../primitives/slot';
import {
  activeItem,
  navContentAria,
  navigationMenu,
  navTriggerAria,
  type NavigationMenuActions,
  type NavigationMenuConfig,
  type NavigationMenuPart,
  type NavigationMenuState,
} from './navigation-menu.behavior';
import { navigationMenuClasses, type NavigationMenuClassSet } from './navigation-menu.classes';

interface NavigationMenuContextValue extends BehaviorBinding<
  NavigationMenuState,
  NavigationMenuActions,
  NavigationMenuPart
> {
  config: NavigationMenuConfig;
  active: string | null;
  classes: NavigationMenuClassSet;
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

  const binding = useBehavior(navigationMenu, config, {
    // Consumer callback fires only when the effective value actually moved:
    // absorbed post-hover clicks and same-value opens stay silent.
    onAccepted: (_action, before, after) => {
      const beforeEffective = activeItem(before, config) ?? '';
      const next = after.active ?? '';
      if (next !== beforeEffective) onValueChange?.(next);
    },
  });
  const { state, ids, aria, request, setPart, getPart } = binding;
  const active = activeItem(state, config);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const target = event.target as HTMLElement;
    const trigger = target.closest<HTMLElement>('[data-part="trigger"]');
    const action = navigationMenu.keymap(
      keyInputOf(event),
      state,
      trigger ? 'trigger' : 'root',
      config,
    );
    if (!action) return;
    // Native <button> triggers convert Enter/Space to click; the click
    // handler dispatches toggle (Spec 01 rule 5).
    if (action === 'toggle') return;
    if (action === 'open') {
      const itemValue = trigger?.dataset['value'];
      if (!itemValue) return;
      event.preventDefault();
      request('open', itemValue);
      return;
    }
    if (action === 'close' && active !== null) {
      event.preventDefault();
      const openTrigger = getPart('root')?.querySelector<HTMLElement>(
        `[data-part="trigger"][data-value="${active}"]`,
      );
      request('close');
      openTrigger?.focus();
    }
  };

  const contextValue: NavigationMenuContextValue = {
    ...binding,
    config,
    active,
    classes: navigationMenuClasses(config, state),
  };

  return (
    <NavigationMenuContext.Provider value={contextValue}>
      <nav
        ref={setPart('root')}
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
  const { ids, aria, classes, setPart } = useNavigationMenuContext('NavigationMenuList');
  return (
    <ul
      data-part="list"
      id={ids.list}
      ref={setPart('list')}
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
  const { ids, classes } = useNavigationMenuContext('NavigationMenuItem');
  const itemContext: NavigationMenuItemContextValue = {
    value,
    triggerId: `${ids.root}-trigger-${value}`,
    contentId: `${ids.root}-content-${value}`,
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
  const { config, state, classes, request } = useNavigationMenuContext('NavigationMenuTrigger');
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
        request('toggle', value);
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
