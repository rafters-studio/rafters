/**
 * Item -- a generic list row for menus, lists, and selection surfaces. Lays
 * out an optional leading icon, the label + optional description, as a single
 * `role="option"` row. Selection and disabled state are props; the row
 * projects the matching option semantics and styles them by variant.
 *
 * @cognitive-load 3/10 - decision 1, information 1, interaction 0, disruption
 * 0, learning 1. A familiar list pattern: recognisable at a glance, its
 * selected/disabled states read without instruction.
 * @attention-economics Secondary selection. The selected row draws the eye
 * (accent surface), a disabled row recedes (dimmed, muted). The leading icon
 * is a visual anchor for fast scanning -- reserve it for rows that benefit
 * from one, or the column of glyphs becomes noise.
 * @trust-building Consistent hover / focus-visible / selected surfaces make
 * the interaction predictable; a clearly dimmed, non-interactive disabled row
 * prevents the confusion of a control that looks live but does nothing.
 * @accessibility Projects role="option", aria-selected (always, so the
 * selection state is announced either way), aria-disabled when disabled, and a
 * tabindex that drops a disabled row from the tab order. An option must live
 * inside a listbox/menu that owns roving focus and activation -- Item supplies
 * the row semantics, not a standalone control's keyboard contract.
 * @semantic-meaning Building block for menu items, list items, and selection
 * options -- never a primary action (use Button) and never a standalone
 * control outside a list container.
 *
 * A static score with a config-driven projection needs no client: the aria is
 * read synchronously in render (no useMemory, no bind), config in, classes and
 * option semantics out, slots through. The row's wrappers are `div`s (the new
 * tree has no Typography component yet -- the card/alert disposition); under
 * the flex row/column they lay out identically to the oracle's spans.
 *
 * @example
 * ```tsx
 * <div role="listbox" aria-label="Settings">
 *   <Item icon={<HomeIcon />} selected>Dashboard</Item>
 *   <Item description="Manage your account">Profile</Item>
 *   <Item disabled>Admin Panel</Item>
 * </div>
 * ```
 */
import * as React from 'react';
import classy from '../../primitives/classy';
import { item, type ItemConfig, type ItemSize } from './item.behavior';
import {
  itemClasses,
  itemContentClasses,
  itemDescriptionClasses,
  itemIconClasses,
  itemLabelClasses,
} from './item.classes';

export interface ItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Icon element displayed before the item content. */
  icon?: React.ReactNode;
  /** Secondary description text displayed below the main content. */
  description?: React.ReactNode;
  /** Whether the item is in a selected/active state. */
  selected?: boolean;
  /** Whether the item is disabled and non-interactive. */
  disabled?: boolean;
  /** Visual size variant. */
  size?: ItemSize;
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
      ...props
    },
    ref,
  ) => {
    const config: ItemConfig = { size, selected, disabled };
    const classes = itemClasses(config, {});
    // The score decides the option semantics; the performance only applies
    // them. Spread before `props` so a consumer edge-case can still override,
    // matching the Grid performance's order.
    const aria = item.aria({}, config, { root: '' }).root ?? {};

    return (
      <div
        ref={ref}
        data-part="root"
        className={classy(classes.root, className)}
        {...aria}
        {...props}
      >
        {icon && (
          <div className={itemIconClasses} aria-hidden="true">
            {icon}
          </div>
        )}
        <div className={itemContentClasses}>
          <div className={itemLabelClasses}>{children}</div>
          {description && <div className={itemDescriptionClasses}>{description}</div>}
        </div>
      </div>
    );
  },
);

Item.displayName = 'Item';

export default Item;
