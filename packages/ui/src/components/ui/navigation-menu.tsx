/**
 * Navigation menu component for site-level navigation with expandable sections
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
 *     <NavigationMenu.Item>
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
import { onEscapeKeyDown } from '../../primitives/escape-keydown';
import { onPointerDownOutside } from '../../primitives/outside-click';
import { mergeProps } from '../../primitives/slot';
import {
  navigationMenuContentActiveClasses,
  navigationMenuContentClasses,
  navigationMenuIndicatorActiveClasses,
  navigationMenuIndicatorArrowClasses,
  navigationMenuIndicatorClasses,
  navigationMenuLinkClasses,
  navigationMenuListClasses,
  navigationMenuRootClasses,
  navigationMenuTriggerChevronClasses,
  navigationMenuTriggerClasses,
  navigationMenuViewportActiveClasses,
  navigationMenuViewportClasses,
} from './navigation-menu.classes';

// ==================== Types ====================

interface NavigationMenuContextValue {
  value: string;
  onValueChange: (value: string) => void;
  baseId: string;
  orientation: 'horizontal' | 'vertical';
  delayDuration: number;
  skipDelayDuration: number;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  triggerRefs: React.MutableRefObject<Map<string, HTMLButtonElement | null>>;
  contentRefs: React.MutableRefObject<Map<string, HTMLDivElement | null>>;
  closeTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | undefined>;
}

interface NavigationMenuItemContextValue {
  value: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  isActive: boolean;
}

// ==================== Contexts ====================

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
  /** Delay between moving from one item to another (ms) */
  skipDelayDuration?: number;
}

export function NavigationMenu({
  value: controlledValue,
  defaultValue = '',
  onValueChange,
  orientation = 'horizontal',
  delayDuration = 200,
  skipDelayDuration = 300,
  className,
  children,
  ...props
}: NavigationMenuProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  const handleValueChange = React.useCallback(
    (newValue: string) => {
      if (!isControlled) {
        setUncontrolledValue(newValue);
      }
      onValueChange?.(newValue);
    },
    [isControlled, onValueChange],
  );

  const baseId = React.useId();
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const triggerRefs = React.useRef<Map<string, HTMLButtonElement | null>>(new Map());
  const contentRefs = React.useRef<Map<string, HTMLDivElement | null>>(new Map());
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Close on escape
  React.useEffect(() => {
    if (!value) return;

    const cleanup = onEscapeKeyDown((event) => {
      if (!event.defaultPrevented) {
        handleValueChange('');
        // Focus the trigger that was open
        const trigger = triggerRefs.current.get(value);
        trigger?.focus();
      }
    });

    return cleanup;
  }, [value, handleValueChange]);

  // Close on outside click
  React.useEffect(() => {
    if (!value || !viewportRef.current) return;

    const cleanup = onPointerDownOutside(viewportRef.current, (event) => {
      // Check if click was on any trigger
      let clickedOnTrigger = false;
      for (const trigger of triggerRefs.current.values()) {
        if (trigger?.contains(event.target as Node)) {
          clickedOnTrigger = true;
          break;
        }
      }

      if (!clickedOnTrigger && !event.defaultPrevented) {
        handleValueChange('');
      }
    });

    return cleanup;
  }, [value, handleValueChange]);

  const contextValue = React.useMemo(
    () => ({
      value,
      onValueChange: handleValueChange,
      baseId,
      orientation,
      delayDuration,
      skipDelayDuration,
      viewportRef,
      triggerRefs,
      contentRefs,
      closeTimerRef,
    }),
    [value, handleValueChange, baseId, orientation, delayDuration, skipDelayDuration],
  );

  return (
    <NavigationMenuContext.Provider value={contextValue}>
      <nav
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
    const context = useNavigationMenuContext();
    const generatedId = React.useId();
    const value = propValue ?? generatedId;

    const triggerRef = React.useRef<HTMLButtonElement | null>(null);
    const contentRef = React.useRef<HTMLDivElement | null>(null);

    const isActive = context.value === value;

    const itemContextValue = React.useMemo(
      () => ({
        value,
        triggerRef,
        contentRef,
        isActive,
      }),
      [value, isActive],
    );

    return (
      <NavigationMenuItemContext.Provider value={itemContextValue}>
        <li ref={ref} className={classy('relative', className)} {...props}>
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
>(({ className, children, onPointerEnter, onPointerLeave, onClick, onKeyDown, ...props }, ref) => {
  const context = useNavigationMenuContext();
  const itemContext = useNavigationMenuItemContext();
  const openTimerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { value, onValueChange, baseId, delayDuration, triggerRefs, closeTimerRef } = context;
  const { value: itemValue, isActive } = itemContext;

  // Compose refs
  const composedRef = React.useCallback(
    (node: HTMLButtonElement | null) => {
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
      itemContext.triggerRef.current = node;
      triggerRefs.current.set(itemValue, node);
    },
    [ref, itemContext.triggerRef, triggerRefs, itemValue],
  );

  // Clear open timer on unmount (close timer is shared via context)
  React.useEffect(() => {
    return () => {
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
    };
  }, []);

  const handlePointerEnter = (event: React.PointerEvent<HTMLButtonElement>) => {
    onPointerEnter?.(event);

    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = undefined;
    }

    // If already open somewhere, switch immediately
    if (value && value !== itemValue) {
      onValueChange(itemValue);
    } else if (!isActive) {
      openTimerRef.current = setTimeout(() => {
        onValueChange(itemValue);
      }, delayDuration);
    }
  };

  const handlePointerLeave = (event: React.PointerEvent<HTMLButtonElement>) => {
    onPointerLeave?.(event);

    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = undefined;
    }

    // Don't close immediately - let the content handle hover
    closeTimerRef.current = setTimeout(() => {
      if (isActive) {
        onValueChange('');
      }
    }, delayDuration);
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);

    // Toggle on click
    if (isActive) {
      onValueChange('');
    } else {
      onValueChange(itemValue);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(event);

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (isActive) {
        onValueChange('');
      } else {
        onValueChange(itemValue);
      }
    }

    // Arrow down opens the menu
    if (event.key === 'ArrowDown' && !isActive) {
      event.preventDefault();
      onValueChange(itemValue);
    }
  };

  const triggerId = `${baseId}-trigger-${itemValue}`;
  const contentId = `${baseId}-content-${itemValue}`;

  return (
    <button
      ref={composedRef}
      id={triggerId}
      type="button"
      aria-expanded={isActive}
      aria-controls={contentId}
      aria-haspopup="menu"
      data-state={isActive ? 'open' : 'closed'}
      className={classy(navigationMenuTriggerClasses, isActive && 'bg-accent-subtle', className)}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {children}
      <ChevronDown
        className={classy(navigationMenuTriggerChevronClasses)}
        style={{ transform: isActive ? 'rotate(180deg)' : undefined }}
        aria-hidden="true"
      />
    </button>
  );
});

NavigationMenuTrigger.displayName = 'NavigationMenuTrigger';

// ==================== NavigationMenuContent ====================

export interface NavigationMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Force mount the content (for animations) */
  forceMount?: boolean;
}

export const NavigationMenuContent = React.forwardRef<HTMLDivElement, NavigationMenuContentProps>(
  ({ forceMount, className, onPointerEnter, onPointerLeave, children, ...props }, ref) => {
    const context = useNavigationMenuContext();
    const itemContext = useNavigationMenuItemContext();

    const { onValueChange, baseId, delayDuration, contentRefs, closeTimerRef } = context;
    const { value: itemValue, isActive } = itemContext;

    // Compose refs
    const composedRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
        itemContext.contentRef.current = node;
        contentRefs.current.set(itemValue, node);
      },
      [ref, itemContext.contentRef, contentRefs, itemValue],
    );

    const handlePointerEnter = (event: React.PointerEvent<HTMLDivElement>) => {
      onPointerEnter?.(event);

      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = undefined;
      }
    };

    const handlePointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
      onPointerLeave?.(event);

      closeTimerRef.current = setTimeout(() => {
        onValueChange('');
      }, delayDuration);
    };

    const contentId = `${baseId}-content-${itemValue}`;
    const triggerId = `${baseId}-trigger-${itemValue}`;

    const shouldRender = forceMount || isActive;

    return (
      // biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-labelledby is appropriate for navigation menu content that is labeled by its trigger
      <div
        ref={composedRef}
        id={contentId}
        aria-labelledby={triggerId}
        aria-hidden={!shouldRender}
        data-state={isActive ? 'open' : 'closed'}
        className={classy(
          navigationMenuContentClasses,
          isActive && navigationMenuContentActiveClasses,
          className,
        )}
        style={{
          position: 'absolute',
          ...(!shouldRender && {
            visibility: 'hidden' as const,
            height: 0,
            overflow: 'hidden' as const,
          }),
        }}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
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
    const context = React.useContext(NavigationMenuContext);

    const handleSelect = React.useCallback(() => {
      // Close menu after selection
      context?.onValueChange('');
    }, [context]);

    const cls = classy(navigationMenuLinkClasses, active && 'bg-accent-subtle', className);

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<
        Record<string, unknown>,
        string | React.JSXElementConstructor<unknown>
      >;
      const childPropsTyped = child.props as Record<string, unknown>;

      const parentProps = {
        ref,
        className: cls,
        onClick: handleSelect,
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
        onClick={handleSelect}
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
  ({ forceMount, className, onPointerEnter, onPointerLeave, ...props }, ref) => {
    const context = useNavigationMenuContext();
    const { value, viewportRef, contentRefs, closeTimerRef, onValueChange, delayDuration } =
      context;

    // Compose refs
    const composedRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
        viewportRef.current = node;
      },
      [ref, viewportRef],
    );

    const isOpen = Boolean(value);
    const shouldRender = forceMount || isOpen;

    // Get the active content for sizing
    const activeContent = value ? contentRefs.current.get(value) : null;
    const [size, setSize] = React.useState({ width: 0, height: 0 });

    React.useEffect(() => {
      if (activeContent) {
        setSize({
          width: activeContent.offsetWidth,
          height: activeContent.offsetHeight,
        });
      }
    }, [activeContent]);

    const handleViewportPointerEnter = (event: React.PointerEvent<HTMLDivElement>) => {
      onPointerEnter?.(event);
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = undefined;
      }
    };

    const handleViewportPointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
      onPointerLeave?.(event);
      closeTimerRef.current = setTimeout(() => {
        onValueChange('');
      }, delayDuration);
    };

    const hiddenStyle = !shouldRender
      ? { visibility: 'hidden' as const, height: 0, overflow: 'hidden' as const }
      : {};

    return (
      <div
        className="left-0 top-full"
        style={{ position: 'absolute', ...hiddenStyle }}
        onPointerEnter={handleViewportPointerEnter}
        onPointerLeave={handleViewportPointerLeave}
      >
        <div
          ref={composedRef}
          data-state={isOpen ? 'open' : 'closed'}
          aria-hidden={!shouldRender}
          className={classy(
            navigationMenuViewportClasses,
            isOpen && navigationMenuViewportActiveClasses,
            className,
          )}
          style={{
            position: 'relative',
            width: size.width || undefined,
            height: size.height || undefined,
          }}
          {...props}
        >
          {/* Render all contents but only show active one */}
          {Array.from(contentRefs.current.entries()).map(([itemValue, content]) => {
            if (!content) return null;
            const contentIsActive = value === itemValue;
            return (
              <div
                key={itemValue}
                data-state={contentIsActive ? 'open' : 'closed'}
                style={{ display: contentIsActive ? 'block' : 'none' }}
              >
                {/* Content is rendered in NavigationMenuContent, this just positions it */}
              </div>
            );
          })}
        </div>
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
  const context = useNavigationMenuContext();
  const { value, triggerRefs } = context;

  const [position, setPosition] = React.useState({ left: 0, width: 0 });
  const isVisible = Boolean(value);

  // Update position based on active trigger
  React.useEffect(() => {
    if (value) {
      const trigger = triggerRefs.current.get(value);
      if (trigger) {
        const rect = trigger.getBoundingClientRect();
        const parentRect = trigger.parentElement?.getBoundingClientRect();
        if (parentRect) {
          setPosition({
            left: rect.left - parentRect.left,
            width: rect.width,
          });
        }
      }
    }
  }, [value, triggerRefs]);

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
      style={{
        position: 'absolute',
        left: position.left,
        width: position.width,
      }}
      aria-hidden="true"
      {...props}
    >
      <div className={navigationMenuIndicatorArrowClasses} style={{ position: 'relative' }} />
    </div>
  );
});

NavigationMenuIndicator.displayName = 'NavigationMenuIndicator';

// ==================== Internal Icons ====================

function ChevronDown({ className, style }: { className?: string; style?: React.CSSProperties }) {
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
      style={style}
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
