/**
 * Navigation menu component for site-level navigation with expandable sections
 *
 * Behavior (which menu is open, arrow-key navigation across triggers, roving tabindex,
 * hover-intent open/close, Escape + outside-click dismiss, and ARIA / visibility
 * reflection) lives in the framework-agnostic createNavigationMenu controller, which
 * composes the shared primitives (selection-group + roving-focus + dismissable-layer).
 * React renders structural markup and delegates via a callback ref - the same controller
 * the Astro and web-component wrappers use, so behavior cannot drift between frameworks.
 *
 * Trigger and Content render NO open-derived attributes that the controller owns once
 * mounted (it reflects aria-expanded / data-state / hidden before paint); they render
 * only a static, non-reactive initial state for SSR so the server HTML is correct and
 * re-renders cannot clobber the controller. The decorative Viewport and Indicator are
 * the exception: they subscribe to the controller's open value to size / position
 * themselves, since that chrome has no server-rendered markup to drive it.
 *
 * All Tailwind utilities live in navigation-menu.classes.ts; active / open styling is
 * driven off data-state / data-active set by the controller, not inline utilities.
 *
 * @cognitive-load 5/10 - Navigation requires scanning and decision-making but with predictable patterns
 * @attention-economics Primary navigation: visible structure, expandable sections reveal content on demand
 * @trust-building Predictable hover/click behavior, clear visual indicators, smooth transitions
 * @accessibility Full keyboard support (arrows, escape), proper ARIA navigation role, focus management
 * @semantic-meaning Site navigation with expandable sections for mega-menu style content organization
 *
 * @usage-patterns
 * DO: Use for primary site navigation with grouped content
 * DO: Keep top-level items to 7 or fewer (Miller's Law)
 * DO: Provide clear visual indicator for active/current item
 * DO: Ensure content panels are logically organized
 * DO: Support both hover and click interactions for accessibility
 * NEVER: Use for contextual actions (use DropdownMenu instead)
 * NEVER: Nest more than 2 levels deep
 * NEVER: Hide critical navigation behind expandable sections only
 *
 * @example
 * ```tsx
 * <NavigationMenu>
 *   <NavigationMenu.List>
 *     <NavigationMenu.Item value="products">
 *       <NavigationMenu.Trigger>Products</NavigationMenu.Trigger>
 *       <NavigationMenu.Content>
 *         <NavigationMenu.Link href="/products/widgets">Widgets</NavigationMenu.Link>
 *         <NavigationMenu.Link href="/products/gadgets">Gadgets</NavigationMenu.Link>
 *       </NavigationMenu.Content>
 *     </NavigationMenu.Item>
 *     <NavigationMenu.Item>
 *       <NavigationMenu.Link href="/about">About</NavigationMenu.Link>
 *     </NavigationMenu.Item>
 *   </NavigationMenu.List>
 *   <NavigationMenu.Viewport />
 * </NavigationMenu>
 * ```
 */

import * as React from 'react';
import classy from '../../primitives/classy';
import { mergeProps } from '../../primitives/slot';
import {
  navigationMenuContentActiveClasses,
  navigationMenuContentClasses,
  navigationMenuIndicatorActiveClasses,
  navigationMenuIndicatorArrowClasses,
  navigationMenuIndicatorClasses,
  navigationMenuItemClasses,
  navigationMenuLinkClasses,
  navigationMenuListClasses,
  navigationMenuRootClasses,
  navigationMenuTriggerChevronClasses,
  navigationMenuTriggerClasses,
  navigationMenuViewportActiveClasses,
  navigationMenuViewportClasses,
  navigationMenuViewportWrapperClasses,
} from './navigation-menu.classes';
import { createNavigationMenu, type NavigationMenuController } from './navigation-menu.controller';

// ==================== Contexts ====================

// Root context carries only stable, non-reactive data for ARIA relationships and the
// SSR-initial open value. All behavior lives in the controller. Viewport / Indicator
// read live open state through subscribe (they are decorative chrome).
interface NavigationMenuContextValue {
  baseId: string;
  orientation: 'horizontal' | 'vertical';
  /** The value open at mount - used only for SSR-initial attributes, never reactive. */
  initialValue: string;
  /** Subscribe to the controller's live open value (for Viewport / Indicator). */
  subscribe: (listener: (value: string) => void) => () => void;
  /** Current open value at call time (for first paint of decorative chrome). */
  getValue: () => string;
}

// Item context carries the item's value only; ids are derived from baseId + value.
interface NavigationMenuItemContextValue {
  value: string;
}

const NavigationMenuContext = React.createContext<NavigationMenuContextValue | null>(null);
const NavigationMenuItemContext = React.createContext<NavigationMenuItemContextValue | null>(null);

function useNavigationMenuContext() {
  const context = React.useContext(NavigationMenuContext);
  if (!context) {
    throw new Error('NavigationMenu components must be used within NavigationMenu');
  }
  return context;
}

function useNavigationMenuItemContext() {
  const context = React.useContext(NavigationMenuItemContext);
  if (!context) {
    throw new Error('NavigationMenuTrigger/Content must be used within NavigationMenuItem');
  }
  return context;
}

/** Subscribe a component to the controller's open value. */
function useOpenValue(): string {
  const { subscribe, getValue } = useNavigationMenuContext();
  return React.useSyncExternalStore(subscribe, getValue, getValue);
}

// ==================== NavigationMenu (Root) ====================

export interface NavigationMenuProps extends React.HTMLAttributes<HTMLElement> {
  /** Controlled value - the item currently open */
  value?: string;
  /** Default value for uncontrolled usage */
  defaultValue?: string;
  /** Callback when value changes */
  onValueChange?: (value: string) => void;
  /** Orientation of the menu */
  orientation?: 'horizontal' | 'vertical';
  /** Delay before opening on hover (ms) */
  delayDuration?: number;
}

export function NavigationMenu({
  value: controlledValue,
  defaultValue = '',
  onValueChange,
  orientation = 'horizontal',
  delayDuration = 200,
  className,
  children,
  ...props
}: NavigationMenuProps) {
  const isControlled = controlledValue !== undefined;
  const baseId = React.useId();

  // Capture the initial open value once; the controller owns state thereafter.
  const initialRef = React.useRef(isControlled ? controlledValue : defaultValue);
  const onChangeRef = React.useRef(onValueChange);
  React.useEffect(() => {
    onChangeRef.current = onValueChange;
  });

  const controllerRef = React.useRef<NavigationMenuController | null>(null);

  // A tiny store mirrors the controller's open value so decorative chrome (Viewport /
  // Indicator) can subscribe without forcing the structural Trigger/Content to re-render.
  const openValueRef = React.useRef(initialRef.current);
  const listenersRef = React.useRef(new Set<(value: string) => void>());
  const subscribe = React.useCallback((listener: (value: string) => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);
  const getValue = React.useCallback(() => openValueRef.current, []);

  // Mount the controller via a callback ref: runs during commit (before paint), so the
  // initial open state is reflected with no flash, and React renders no open-derived
  // attributes that the controller owns, so re-renders cannot clobber it.
  const setRoot = React.useCallback(
    (node: HTMLElement | null) => {
      if (!node) return;
      const controller = createNavigationMenu(node, {
        orientation,
        delayDuration,
        initial: initialRef.current,
        onChange: (value) => {
          onChangeRef.current?.(value);
        },
      });
      controllerRef.current = controller;
      // Mirror the controller's open value into the local store.
      const unsubscribe = controller.group.subscribe((selected) => {
        openValueRef.current = selected[0] ?? '';
        for (const listener of listenersRef.current) listener(openValueRef.current);
      });
      return () => {
        unsubscribe();
        controller.destroy();
        controllerRef.current = null;
      };
    },
    [orientation, delayDuration],
  );

  // Controlled mode: mirror the prop into the controller.
  React.useEffect(() => {
    if (isControlled && controlledValue !== undefined) {
      controllerRef.current?.setValue(controlledValue);
    }
  }, [isControlled, controlledValue]);

  const contextValue = React.useMemo(
    () => ({
      baseId,
      orientation,
      initialValue: initialRef.current,
      subscribe,
      getValue,
    }),
    [baseId, orientation, subscribe, getValue],
  );

  return (
    <NavigationMenuContext.Provider value={contextValue}>
      <nav
        ref={setRoot}
        aria-label="Main navigation"
        data-orientation={orientation}
        className={classy(navigationMenuRootClasses, className)}
        {...props}
      >
        {children}
      </nav>
    </NavigationMenuContext.Provider>
  );
}

NavigationMenu.displayName = 'NavigationMenu';

// ==================== NavigationMenuList ====================

export interface NavigationMenuListProps extends React.HTMLAttributes<HTMLUListElement> {}

export const NavigationMenuList = React.forwardRef<HTMLUListElement, NavigationMenuListProps>(
  ({ className, ...props }, ref) => {
    const { orientation } = useNavigationMenuContext();

    return (
      <ul
        ref={ref}
        data-orientation={orientation}
        className={classy(navigationMenuListClasses, className)}
        {...props}
      />
    );
  },
);

NavigationMenuList.displayName = 'NavigationMenuList';

// ==================== NavigationMenuItem ====================

export interface NavigationMenuItemProps extends React.HTMLAttributes<HTMLLIElement> {
  /** Unique value for this item */
  value?: string;
}

export const NavigationMenuItem = React.forwardRef<HTMLLIElement, NavigationMenuItemProps>(
  ({ value: propValue, className, children, ...props }, ref) => {
    const generatedId = React.useId();
    const value = propValue ?? generatedId;

    const itemContextValue = React.useMemo(() => ({ value }), [value]);

    return (
      <NavigationMenuItemContext.Provider value={itemContextValue}>
        <li ref={ref} className={classy(navigationMenuItemClasses, className)} {...props}>
          {children}
        </li>
      </NavigationMenuItemContext.Provider>
    );
  },
);

NavigationMenuItem.displayName = 'NavigationMenuItem';

// ==================== NavigationMenuTrigger ====================

export interface NavigationMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const NavigationMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  NavigationMenuTriggerProps
>(({ className, children, ...props }, ref) => {
  const { baseId, initialValue } = useNavigationMenuContext();
  const { value } = useNavigationMenuItemContext();

  const triggerId = `${baseId}-trigger-${value}`;
  const contentId = `${baseId}-content-${value}`;

  // SSR-initial open state only. The controller reflects aria-expanded / data-state and
  // owns click / keyboard / hover via root-level delegation, so there is no onClick /
  // onKeyDown / onPointerEnter here. data-nav-trigger + data-value form the markup
  // contract; data-roving-item lets roving-focus include this trigger.
  const open = initialValue === value;

  return (
    <button
      ref={ref}
      id={triggerId}
      type="button"
      aria-controls={contentId}
      aria-haspopup="menu"
      aria-expanded={open}
      data-state={open ? 'open' : 'closed'}
      data-nav-trigger
      data-roving-item
      data-value={value}
      className={classy(navigationMenuTriggerClasses, className)}
      {...props}
    >
      {children}
      <ChevronDown className={classy(navigationMenuTriggerChevronClasses)} aria-hidden="true" />
    </button>
  );
});

NavigationMenuTrigger.displayName = 'NavigationMenuTrigger';

// ==================== NavigationMenuContent ====================

export interface NavigationMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const NavigationMenuContent = React.forwardRef<HTMLDivElement, NavigationMenuContentProps>(
  ({ className, children, ...props }, ref) => {
    const { baseId, initialValue } = useNavigationMenuContext();
    const { value } = useNavigationMenuItemContext();

    const contentId = `${baseId}-content-${value}`;
    const triggerId = `${baseId}-trigger-${value}`;

    // Always mounted; the controller toggles hidden / data-state / aria-hidden before
    // paint. SSR renders the static initial state (closed content keeps visibility:hidden
    // so it is correct before hydration). initialValue is non-reactive, so re-renders
    // cannot clobber the controller. The visibility/height/overflow are inline because
    // they are dynamic hide-state, not a static design utility.
    const open = initialValue === value;

    return (
      // biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-labelledby is appropriate for navigation menu content labeled by its trigger
      <div
        ref={ref}
        id={contentId}
        aria-labelledby={triggerId}
        aria-hidden={!open}
        hidden={!open}
        data-state={open ? 'open' : 'closed'}
        data-nav-content
        data-value={value}
        className={classy(
          navigationMenuContentClasses,
          open && navigationMenuContentActiveClasses,
          className,
        )}
        style={open ? undefined : { visibility: 'hidden', height: 0, overflow: 'hidden' }}
        {...props}
      >
        {children}
      </div>
    );
  },
);

NavigationMenuContent.displayName = 'NavigationMenuContent';

// ==================== NavigationMenuLink ====================

export interface NavigationMenuLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Render as child element (asChild pattern) */
  asChild?: boolean;
  /** Whether this link is currently active */
  active?: boolean;
}

export const NavigationMenuLink = React.forwardRef<HTMLAnchorElement, NavigationMenuLinkProps>(
  ({ asChild, active, className, children, ...props }, ref) => {
    // Active styling is driven by the data-active attribute (see navigationMenuLinkClasses),
    // not an inline utility, so the system owns the visual value.
    const cls = classy(navigationMenuLinkClasses, className);

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<
        Record<string, unknown>,
        string | React.JSXElementConstructor<unknown>
      >;
      const childPropsTyped = child.props as Record<string, unknown>;

      const parentProps = {
        ref,
        className: cls,
        'data-active': active || undefined,
        ...props,
      };

      const mergedProps = mergeProps(
        parentProps as Parameters<typeof mergeProps>[0],
        childPropsTyped,
      );

      return React.cloneElement(child, mergedProps as Partial<Record<string, unknown>>);
    }

    return (
      <a
        ref={ref}
        href={props.href ?? '#'}
        className={cls}
        data-active={active || undefined}
        {...props}
      >
        {children}
      </a>
    );
  },
);

NavigationMenuLink.displayName = 'NavigationMenuLink';

// ==================== NavigationMenuViewport ====================

export interface NavigationMenuViewportProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Force mount the viewport (for animations) */
  forceMount?: boolean;
}

export const NavigationMenuViewport = React.forwardRef<HTMLDivElement, NavigationMenuViewportProps>(
  ({ forceMount, className, ...props }, ref) => {
    const value = useOpenValue();
    const isOpen = Boolean(value);
    const shouldRender = forceMount || isOpen;

    // Inline hide-state (dynamic), not a design utility.
    const hiddenStyle = !shouldRender
      ? { visibility: 'hidden' as const, height: 0, overflow: 'hidden' as const }
      : {};

    return (
      <div className={navigationMenuViewportWrapperClasses} style={hiddenStyle}>
        <div
          ref={ref}
          data-nav-viewport
          data-state={isOpen ? 'open' : 'closed'}
          aria-hidden={!shouldRender}
          className={classy(
            navigationMenuViewportClasses,
            isOpen && navigationMenuViewportActiveClasses,
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);

NavigationMenuViewport.displayName = 'NavigationMenuViewport';

// ==================== NavigationMenuIndicator ====================

export interface NavigationMenuIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Force mount the indicator (for animations) */
  forceMount?: boolean;
}

export const NavigationMenuIndicator = React.forwardRef<
  HTMLDivElement,
  NavigationMenuIndicatorProps
>(({ forceMount, className, ...props }, ref) => {
  const value = useOpenValue();
  const isVisible = Boolean(value);
  const shouldRender = forceMount || isVisible;

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      ref={ref}
      data-state={isVisible ? 'visible' : 'hidden'}
      className={classy(
        navigationMenuIndicatorClasses,
        isVisible && navigationMenuIndicatorActiveClasses,
        className,
      )}
      aria-hidden="true"
      {...props}
    >
      <div className={navigationMenuIndicatorArrowClasses} />
    </div>
  );
});

NavigationMenuIndicator.displayName = 'NavigationMenuIndicator';

// ==================== Internal Icons ====================

function ChevronDown({ className }: { className?: string }) {
  return (
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
      className={className}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

// ==================== Namespaced Export ====================

NavigationMenu.List = NavigationMenuList;
NavigationMenu.Item = NavigationMenuItem;
NavigationMenu.Trigger = NavigationMenuTrigger;
NavigationMenu.Content = NavigationMenuContent;
NavigationMenu.Link = NavigationMenuLink;
NavigationMenu.Viewport = NavigationMenuViewport;
NavigationMenu.Indicator = NavigationMenuIndicator;

// Re-export root as NavigationMenuRoot alias for compatibility
export { NavigationMenu as NavigationMenuRoot };
