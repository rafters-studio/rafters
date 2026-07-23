import * as React from 'react';
import { createBehavior, type PartIds, type PayloadArgs } from '@/lib/contract';
import { keyInputOf } from '@/hooks/key-input';
import { useMemory } from '@/hooks/use-memory';
import classy from '@/lib/primitives/classy';
import { mergeProps } from '@/lib/primitives/slot';
import {
  activeItem,
  navInstanceAria,
  navigationMenu,
  startNavigationMenuEffects,
  type NavigationMenuActions,
  type NavigationMenuConfig,
  type NavigationMenuPart,
  type NavigationMenuState,
} from '@/components/ui/navigation-menu.behavior';
import {
  navigationMenuClasses,
  type NavigationMenuClassSet,
} from '@/components/ui/navigation-menu.classes';

export { navigationMenuTriggerStyle } from '@/components/ui/navigation-menu.classes';

interface NavigationMenuContextValue {
  state: NavigationMenuState;
  ids: PartIds<NavigationMenuPart>;
  aria: Partial<Record<NavigationMenuPart, Record<string, string | boolean | undefined>>>;
  request: <K extends keyof NavigationMenuActions>(
    action: K,
    ...payload: PayloadArgs<NavigationMenuActions[K]>
  ) => boolean;
  getPart: (part: string) => HTMLElement | null;
  instanceId: (part: NavigationMenuPart, key: string) => string;
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

  // The controller composes the score with the substrate -- no useBehavior.
  // createBehavior is the model instance (memory + canDispatch-gated
  // dispatch); useMemory subscribes React to it; a mount effect composes the
  // score's roving/hover/dismiss primitives directly. The rest is only what
  // React itself needs: ids (useId) and the dispatch call.
  const { memory, dispatch } = React.useMemo(() => createBehavior(navigationMenu, config), []);
  const state = useMemory(memory);
  const active = activeItem(state, config);

  const uid = React.useId();
  const ids = React.useMemo(() => {
    const out = {} as PartIds<NavigationMenuPart>;
    for (const part of Object.keys(navigationMenu.parts) as NavigationMenuPart[]) {
      out[part] = `${uid}-${part}`;
    }
    return out;
  }, [uid]);
  const instanceId = (part: NavigationMenuPart, key: string) => `${uid}-${part}-${key}`;

  // getPart resolves a part to its element by querying under the root: the
  // DOM is the registry, so there is no ref bookkeeping to keep.
  const rootRef = React.useRef<HTMLElement>(null);
  const getPart = React.useCallback(
    (part: string): HTMLElement | null =>
      part === 'root'
        ? rootRef.current
        : (rootRef.current?.querySelector<HTMLElement>(`[data-part="${part}"]`) ?? null),
    [],
  );

  // Effect-initiated dispatches (hover intent resolves after the render that
  // started it) must read the CURRENT config and callback, so those two ride
  // in a ref rather than being captured stale.
  const latest = React.useRef({ config, onValueChange });
  latest.current = { config, onValueChange };
  const request = React.useCallback(
    <K extends keyof NavigationMenuActions>(
      action: K,
      ...payload: PayloadArgs<NavigationMenuActions[K]>
    ): boolean => {
      const { config: cfg, onValueChange: cb } = latest.current;
      // Effective value before vs the INTRINSIC value after: a controlled
      // menu's effective value never moves (config shadows it), but the
      // consumer callback must still report the value it should set next.
      const before = activeItem(memory.get(), cfg) ?? '';
      if (!dispatch(action, cfg, ...payload)) return false;
      const next = memory.get().active ?? '';
      if (next !== before) cb?.(next);
      return true;
    },
    [memory, dispatch],
  );

  // Compose the roving/hover/dismiss trio directly, once per mount (rebuilt
  // only when orientation or delay change). Hover reads the open state live
  // from memory, so open/close needs no dependency and roving/hover are not
  // torn down per render. getPart, memory, and request are stable.
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return startNavigationMenuEffects({
      root,
      list: getPart('list'),
      orientation,
      delay: delayDuration,
      isOpen: () => activeItem(memory.get(), latest.current.config) !== null,
      onHoverOpen: (value) => void request('hoverOpen', value),
      onClose: () => void request('close'),
    });
  }, [orientation, delayDuration, getPart, memory, request]);

  const aria = navigationMenu.aria(state, config, ids);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const trigger = (event.target as HTMLElement).closest<HTMLElement>('[data-part="trigger"]');
    const action = navigationMenu.keymap(
      keyInputOf(event),
      state,
      trigger ? 'trigger' : 'root',
      config,
    );
    if (!action || action === 'toggle') return; // native button click dispatches toggle
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
    state,
    ids,
    aria,
    request,
    getPart,
    instanceId,
    config,
    active,
    classes: navigationMenuClasses(config, state),
  };

  return (
    <NavigationMenuContext.Provider value={contextValue}>
      <nav
        ref={rootRef}
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
  const { ids, aria, classes } = useNavigationMenuContext('NavigationMenuList');
  return (
    <ul
      data-part="list"
      id={ids.list}
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
  const { instanceId, classes } = useNavigationMenuContext('NavigationMenuItem');
  const itemContext: NavigationMenuItemContextValue = {
    value,
    // Instance ids derived from the root uid -- never hand-templated per call site.
    triggerId: instanceId('trigger', value),
    contentId: instanceId('content', value),
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
  const aria = navInstanceAria('trigger', value, state, config, {
    trigger: triggerId,
    content: contentId,
  });

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
  const aria = navInstanceAria('content', value, state, config, {
    trigger: triggerId,
    content: contentId,
  });

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

export interface NavigationMenuViewportProps extends React.HTMLAttributes<HTMLDivElement> {
  forceMount?: boolean;
}

export function NavigationMenuViewport({
  forceMount,
  className,
  ...props
}: NavigationMenuViewportProps) {
  const { active, ids, aria, classes } = useNavigationMenuContext('NavigationMenuViewport');
  const open = active !== null;
  if (!(forceMount || open)) return null;
  return (
    <div className={classes.viewportWrapper} hidden={open ? undefined : true}>
      <div
        data-part="viewport"
        id={ids.viewport}
        className={classy(classes.viewport, className)}
        {...aria.viewport}
        {...props}
      />
    </div>
  );
}

export interface NavigationMenuIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  forceMount?: boolean;
}

export function NavigationMenuIndicator({
  forceMount,
  className,
  ...props
}: NavigationMenuIndicatorProps) {
  const { active, ids, aria, classes } = useNavigationMenuContext('NavigationMenuIndicator');
  const open = active !== null;
  if (!(forceMount || open)) return null;
  return (
    <div
      data-part="indicator"
      id={ids.indicator}
      hidden={open ? undefined : true}
      className={classy(classes.indicator, className)}
      {...aria.indicator}
      {...props}
    >
      <div className={classes.indicatorArrow} />
    </div>
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
