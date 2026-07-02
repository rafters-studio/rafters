import * as React from 'react';
import { useBehavior } from '../../hooks/use-behavior';
import classy from '../../primitives/classy';
import { button, type ButtonConfig, type ButtonSize, type ButtonVariant } from './button.behavior';
import { buttonClasses } from './button.classes';

export { buttonVariants } from './button.classes';
export type { ButtonSize, ButtonVariant };

type NonIconSize = 'default' | 'xs' | 'sm' | 'lg';
type IconSize = 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg';
type AccessibleName = { 'aria-label': string } | { 'aria-labelledby': string };

interface ButtonBaseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  softDisabled?: boolean;
  toggle?: boolean;
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  loadingAnnouncement?: string;
  loadedAnnouncement?: string;
}

export type ButtonProps = ButtonBaseProps &
  ({ size?: NonIconSize } | ({ size: IconSize } & AccessibleName));

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  const {
    className,
    variant = 'default',
    size = 'default',
    disabled = false,
    loading = false,
    softDisabled = false,
    toggle = false,
    pressed,
    defaultPressed = false,
    onPressedChange,
    loadingAnnouncement,
    loadedAnnouncement,
    onClick,
    children,
    type,
    ...rest
  } = props;

  const config: ButtonConfig = {
    variant,
    size,
    toggle,
    defaultPressed,
    loadingAnnouncement,
    loadedAnnouncement,
    disabled,
    softDisabled,
    loading,
  };

  const { state, ids, aria, request } = useBehavior(button, config, {
    onAccepted: (_action, _before, after) => {
      if (toggle) {
        onPressedChange?.(pressed === undefined ? after.pressed === true : !pressed);
      }
    },
  });
  const classes = buttonClasses(config, state);

  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      disabled={disabled}
      data-part="root"
      id={ids.root}
      className={classy(classes.root, className)}
      {...aria.root}
      onClick={(event) => {
        if (!request('press')) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onClick?.(event);
      }}
      {...rest}
    >
      {loading ? (
        <svg
          data-part="spinner"
          id={ids.spinner}
          className={classes.spinner}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          {...aria.spinner}
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      ) : null}
      <span data-part="label" id={ids.label}>
        {children}
      </span>
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
