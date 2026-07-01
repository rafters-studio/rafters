/**
 * Generic list item component for menus, lists, and selection interfaces
 *
 * @cognitive-load 3/10 - Familiar list pattern with clear visual states and predictable behavior
 * @attention-economics Secondary selection: Selected state draws focus, disabled reduces prominence. Icon slot provides visual anchoring for quick scanning.
 * @trust-building Consistent hover/focus/selected states build predictable interaction patterns. Clear disabled state prevents user confusion.
 * @accessibility Proper aria-selected for selection, aria-disabled for disabled state, keyboard navigation support, focus-visible for keyboard users
 * @semantic-meaning Building block for: menu items (navigation/actions), list items (content/data), option items (selection interfaces)
 *
 * @usage-patterns
 * DO: Use as building block for menu items, list items, selection options
 * DO: Include icons on the left for quick visual scanning
 * DO: Add description for secondary information or context
 * DO: Use selected state for current/active items in navigation
 * DO: Use disabled state for unavailable options with clear visual feedback
 * NEVER: Use for primary actions (use Button instead)
 * NEVER: Nest interactive elements within Item
 * NEVER: Use Item without a container (list, menu, etc.)
 *
 * @example
 * ```tsx
 * // Basic list item
 * <Item>Settings</Item>
 *
 * // With icon and description
 * <Item
 *   icon={<UserIcon className="h-4 w-4" />}
 *   description="Manage your account settings"
 * >
 *   Profile
 * </Item>
 *
 * // Selected state for navigation
 * <Item selected icon={<HomeIcon className="h-4 w-4" />}>
 *   Dashboard
 * </Item>
 *
 * // Disabled option
 * <Item disabled icon={<LockIcon className="h-4 w-4" />}>
 *   Admin Panel
 * </Item>
 *
 * // Interactive item with handler
 * <Item onClick={handleSelect} icon={<SettingsIcon className="h-4 w-4" />}>
 *   Settings
 * </Item>
 * ```
 */
import * as React from 'react';
import classy from '../../primitives/classy';
import {
  itemBaseClasses,
  itemContentClasses,
  itemDescriptionClasses,
  itemFocusClasses,
  itemIconClasses,
  itemLabelClasses,
  itemMotionClasses,
  itemSizeClasses,
} from './item.classes';

export interface ItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Icon element displayed before the item content */
  icon?: React.ReactNode;
  /** Secondary description text displayed below the main content */
  description?: React.ReactNode;
  /** Whether the item is in a selected/active state */
  selected?: boolean;
  /** Whether the item is disabled and non-interactive */
  disabled?: boolean;
  /** Visual size variant */
  size?: 'default' | 'sm' | 'lg';
}

export const Item = React.forwardRef<HTMLDivElement, ItemProps>(
  (
    {
      icon,
      description,
      selected = false,
      disabled = false,
      size = 'default',
      className,
      children,
      onClick,
      onKeyDown,
      ...props
    },
    ref,
  ) => {
    // State styles following design token patterns
    const stateStyles = disabled
      ? 'opacity-50 pointer-events-none text-muted-foreground'
      : selected
        ? 'bg-accent text-accent-foreground'
        : 'text-foreground hover:bg-accent hover:text-accent-foreground';

    // Focus styles for keyboard navigation

    // Motion with reduced motion support

    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      onClick?.(event);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        // Simulate click for keyboard activation
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
        });
        event.currentTarget.dispatchEvent(clickEvent);
      }
      onKeyDown?.(event);
    };

    const cls = classy(
      itemBaseClasses,
      itemSizeClasses[size] ?? itemSizeClasses.default,
      stateStyles,
      itemFocusClasses,
      itemMotionClasses,
      className,
    );

    return (
      <div
        ref={ref}
        role="option"
        tabIndex={disabled ? undefined : 0}
        aria-selected={selected}
        aria-disabled={disabled || undefined}
        data-selected={selected ? '' : undefined}
        data-disabled={disabled ? '' : undefined}
        className={cls}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {icon && (
          <span className={itemIconClasses} aria-hidden="true">
            {icon}
          </span>
        )}
        <span className={itemContentClasses}>
          <span className={itemLabelClasses}>{children}</span>
          {description && <span className={itemDescriptionClasses}>{description}</span>}
        </span>
      </div>
    );
  },
);

Item.displayName = 'Item';

export default Item;
