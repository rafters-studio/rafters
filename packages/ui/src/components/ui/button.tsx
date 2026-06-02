/**
 * Interactive button component for user actions
 *
 * @cognitive-load 3/10 - Simple action trigger with clear visual hierarchy
 * @attention-economics Size hierarchy: sm=tertiary actions, default=secondary interactions, lg=primary calls-to-action. Primary variant commands highest attention - use sparingly (maximum 1 per section)
 * @trust-building Destructive actions require confirmation patterns. Loading states prevent double-submission. Visual feedback reinforces user actions.
 * @accessibility WCAG AAA compliant with 44px minimum touch targets, high contrast ratios, and screen reader optimization
 * @semantic-meaning Variant mapping: default=main actions, secondary=supporting actions, destructive=irreversible actions with safety patterns
 *
 * @usage-patterns
 * DO: Primary: Main user goal, maximum 1 per section
 * DO: Secondary: Alternative paths, supporting actions
 * DO: Destructive: Permanent actions, requires confirmation patterns
 * NEVER: Multiple primary buttons competing for attention
 *
 * @example
 * ```tsx
 * // Primary action - highest attention, use once per section
 * <Button variant="default">Save Changes</Button>
 *
 * // Destructive action - requires confirmation UX
 * <Button variant="destructive">Delete Account</Button>
 *
 * // Loading state - prevents double submission
 * <Button loading>Processing...</Button>
 * ```
 */
import * as React from 'react';
import classy from '../../primitives/classy';
import { mergeProps } from '../../primitives/slot';
import { buttonVariantClasses } from './button.classes';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?:
    | 'default'
    | 'primary'
    | 'secondary'
    | 'destructive'
    | 'success'
    | 'warning'
    | 'info'
    | 'muted'
    | 'accent'
    | 'outline'
    | 'ghost'
    | 'link';
  size?: 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg';
  loading?: boolean;
}

const sizeClasses: Record<string, string> = {
  default: 'h-10 px-4 py-2',
  xs: 'h-6 px-2 text-xs',
  sm: 'h-8 px-3 text-xs',
  lg: 'h-12 px-6 text-base',
  icon: 'h-10 w-10',
  'icon-xs': 'h-6 w-6',
  'icon-sm': 'h-8 w-8',
  'icon-lg': 'h-12 w-12',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      asChild,
      className,
      variant = 'default',
      size = 'default',
      disabled,
      loading,
      children,
      ...props
    },
    ref,
  ) => {
    const base =
      'inline-flex items-center justify-center gap-2 rounded-md font-medium cursor-pointer ' +
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
      'transition-colors';

    const disabledCls =
      disabled || loading ? 'opacity-50 pointer-events-none cursor-not-allowed' : '';

    const cls = classy(
      base,
      buttonVariantClasses[variant] ?? buttonVariantClasses.default,
      sizeClasses[size] ?? sizeClasses.default,
      disabledCls,
      className,
    );

    const content = (
      <button
        type={props.type ?? 'button'}
        aria-disabled={disabled || loading ? 'true' : undefined}
        aria-busy={loading ? 'true' : undefined}
        disabled={disabled || loading}
        ref={ref}
        className={cls}
        {...props}
      >
        {loading ? <span aria-hidden>Loading...</span> : children}
      </button>
    );

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<
        Record<string, unknown>,
        string | React.JSXElementConstructor<unknown>
      >;
      const childPropsTyped = child.props as Record<string, unknown>;

      // Build parent props to merge
      const parentProps = {
        ref,
        className: cls,
        'aria-disabled': disabled || loading ? 'true' : undefined,
        'aria-busy': loading ? 'true' : undefined,
        ...props,
      };

      // Use mergeProps for proper prop composition
      const mergedProps = mergeProps(
        parentProps as Parameters<typeof mergeProps>[0],
        childPropsTyped,
      );

      // Handle disabled state for non-button elements
      const tag = typeof child.type === 'string' ? child.type : null;
      const isNativeButton = tag === 'button';

      if (isNativeButton) {
        (mergedProps as Record<string, unknown>).disabled = disabled || loading;
      } else {
        // For non-button elements, add role="button" if not present
        if (!childPropsTyped.role) {
          (mergedProps as Record<string, unknown>).role = 'button';
        }

        // Intercept clicks when disabled
        const origOnClick = mergedProps.onClick as ((...args: unknown[]) => void) | undefined;
        (mergedProps as Record<string, unknown>).onClick = (e: React.MouseEvent) => {
          if (disabled || loading) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          origOnClick?.(e);
        };

        // Handle keyboard activation for non-button elements
        const origOnKeyDown = mergedProps.onKeyDown as
          | ((e: React.KeyboardEvent) => void)
          | undefined;
        (mergedProps as Record<string, unknown>).onKeyDown = (e: React.KeyboardEvent) => {
          if (disabled || loading) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            (e.currentTarget as HTMLElement).click();
          }
          origOnKeyDown?.(e);
        };
      }

      return React.cloneElement(child, mergedProps as Partial<Record<string, unknown>>);
    }

    return content;
  },
);

Button.displayName = 'Button';

export default Button;
