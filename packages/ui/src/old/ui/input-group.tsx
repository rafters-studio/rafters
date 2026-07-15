/**
 * InputGroup combines an input with visual addons (icons, buttons, text) for enhanced form UX
 *
 * @cognitive-load 4/10 - Composite input control with clear addon boundaries and input focus
 * @attention-economics Visual hierarchy: addons=contextual, input=primary focus. Addons should clarify input purpose without competing for attention
 * @trust-building Clear boundaries between addons and input, consistent sizing, proper focus management across the group
 * @accessibility Focus ring wraps entire group, addons support aria-label for screen readers, keyboard navigation preserved
 * @semantic-meaning Start addons=prefixes (currency symbols, icons), end addons=suffixes (units, action buttons)
 *
 * @usage-patterns
 * DO: Use start addon for input type indicators (search icon, currency symbol)
 * DO: Use end addon for units, clear buttons, or submit actions
 * DO: Keep addons visually lightweight to not overshadow input
 * DO: Ensure addons have proper accessibility labels when using icons
 * NEVER: Use addons without semantic meaning
 * NEVER: Place primary actions in addons (use a separate button instead)
 * NEVER: Nest input groups
 *
 * @example
 * ```tsx
 * // Search input with icon
 * <InputGroup>
 *   <InputGroupAddon position="start">
 *     <SearchIcon aria-hidden />
 *   </InputGroupAddon>
 *   <Input placeholder="Search..." aria-label="Search" />
 * </InputGroup>
 *
 * // Price input with currency and unit
 * <InputGroup>
 *   <InputGroupAddon position="start">$</InputGroupAddon>
 *   <Input type="number" placeholder="0.00" />
 *   <InputGroupAddon position="end">USD</InputGroupAddon>
 * </InputGroup>
 *
 * // Input with button addon
 * <InputGroup>
 *   <Input placeholder="Enter code" />
 *   <InputGroupAddon position="end">
 *     <Button size="sm" variant="ghost">Apply</Button>
 *   </InputGroupAddon>
 * </InputGroup>
 * ```
 */
import * as React from 'react';
import classy from '../../primitives/classy';
import {
  inputGroupBaseClasses,
  inputGroupDisabledClasses,
  inputGroupSizeClasses,
} from './input-group.classes';

export interface InputGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Size variant matching Input component sizing
   */
  size?: 'default' | 'sm' | 'lg';
  /**
   * Disabled state for the entire group
   */
  disabled?: boolean;
}

export const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(
  ({ size = 'default', disabled, className, children, ...props }, ref) => {
    const cls = classy(
      inputGroupBaseClasses,
      inputGroupSizeClasses[size] ?? inputGroupSizeClasses.default,
      disabled && inputGroupDisabledClasses,
      className,
    );

    return (
      <div ref={ref} className={cls} data-disabled={disabled || undefined} {...props}>
        {children}
      </div>
    );
  },
);

InputGroup.displayName = 'InputGroup';

export interface InputGroupAddonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Position of the addon relative to the input
   */
  position: 'start' | 'end';
  /**
   * Addon variant affects background and border styling
   */
  variant?: 'default' | 'filled';
}

export const InputGroupAddon = React.forwardRef<HTMLDivElement, InputGroupAddonProps>(
  ({ position, variant = 'default', className, ...props }, ref) => {
    const base = 'flex items-center justify-center shrink-0 text-muted-foreground';

    const positionStyles = position === 'start' ? 'border-r border-input' : 'border-l border-input';

    const variantStyles = variant === 'filled' ? 'bg-muted px-3' : 'bg-transparent px-3';

    const cls = classy(base, positionStyles, variantStyles, className);

    return <div ref={ref} className={cls} data-position={position} {...props} />;
  },
);

InputGroupAddon.displayName = 'InputGroupAddon';

export interface InputGroupInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * Input element styled specifically for use within InputGroup.
 * Removes borders and focus ring since the group handles those.
 */
export const InputGroupInput = React.forwardRef<HTMLInputElement, InputGroupInputProps>(
  ({ className, type = 'text', disabled, ...props }, ref) => {
    const base =
      'flex-1 h-full w-full bg-transparent px-3 py-2 text-sm ' +
      'placeholder:text-muted-foreground ' +
      'focus:outline-none ' +
      'disabled:cursor-not-allowed disabled:opacity-50';

    // Remove border radius from internal input (group handles it)
    // First/last child handling done via CSS selectors would require runtime checks
    // Keep it simple: the input takes full internal width

    const cls = classy(base, className);

    return (
      <input
        type={type}
        className={cls}
        ref={ref}
        disabled={disabled}
        aria-disabled={disabled ? 'true' : undefined}
        {...props}
      />
    );
  },
);

InputGroupInput.displayName = 'InputGroupInput';

export default InputGroup;
