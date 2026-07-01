/**
 * button.tsx -- React binding. Wiring only (Spec 01): renders the declared
 * parts, holds the behavior instance, projects classes, spreads aria, maps
 * events to actions. Suppression decisions live in the behavior's
 * canDispatch, never here.
 *
 * shadcn compatibility: prop surface is a strict superset of shadcn/ui
 * Button (plus the oracle's additions); buttonVariants is re-exported with
 * a cva-compatible signature. Documented divergence: className merges via
 * classy, which does not resolve utility conflicts (constitution ruling).
 */
import * as React from 'react';
import { useMemory } from '../../hooks/use-memory';
import classy from '../../primitives/classy';
import { mergeProps } from '../../primitives/slot';
import { runEffects } from '../../behavior/effects';
import type { KeyInput, PartIds } from '../../behavior/contract';
import {
  buttonBehavior,
  createButtonBehavior,
  type ButtonConfig,
  type ButtonPart,
  type ButtonSize,
  type ButtonVariant,
} from './button.behavior';
import { buttonClasses } from './button.classes';

export { buttonVariants } from './button.classes';
export type { ButtonSize, ButtonVariant };

type NonIconSize = 'default' | 'xs' | 'sm' | 'lg';
type IconSize = 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg';

/** Icon-only buttons must carry an accessible name (WCAG 4.1.2), enforced
 *  at the type level: an icon size without aria-label/aria-labelledby is a
 *  compile error. */
type AccessibleName = { 'aria-label': string } | { 'aria-labelledby': string };

interface ButtonBaseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: ButtonVariant;
  loading?: boolean;
  /** aria-disabled + focusable + no-op: discoverable disabling. */
  softDisabled?: boolean;
  /** aria-pressed toggle mode. */
  toggle?: boolean;
  /** Controlled pressed state (toggle mode). */
  pressed?: boolean;
  /** Uncontrolled initial pressed state (toggle mode). */
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  loadingAnnouncement?: string;
  loadedAnnouncement?: string;
}

export type ButtonProps = ButtonBaseProps &
  ({ size?: NonIconSize } | ({ size: IconSize } & AccessibleName));

function toKeyInput(event: React.KeyboardEvent): KeyInput {
  return {
    key: event.key,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    metaKey: event.metaKey,
  };
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  const {
    asChild,
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
    loadingAnnouncement,
    loadedAnnouncement,
    disabled,
    softDisabled,
    loading,
    pressed: pressed ?? defaultPressed,
  };

  const [behavior] = React.useState(() => createButtonBehavior(config));
  const state = useMemory(behavior.memory);

  React.useEffect(() => {
    behavior.dispatch('setDisabled', disabled);
  }, [behavior, disabled]);
  React.useEffect(() => {
    behavior.dispatch('setSoftDisabled', softDisabled);
  }, [behavior, softDisabled]);
  React.useEffect(() => {
    behavior.dispatch('setLoading', loading);
  }, [behavior, loading]);
  React.useEffect(() => {
    if (pressed !== undefined) behavior.dispatch('setPressed', pressed);
  }, [behavior, pressed]);
  React.useEffect(() => runEffects(behavior), [behavior]);

  const uid = React.useId();
  const ids: PartIds<ButtonPart> = {
    root: uid,
    label: `${uid}-label`,
    spinner: `${uid}-spinner`,
  };

  // Pure spec-level projection of the subscribed state -- render stays pure.
  const aria = buttonBehavior.aria(state, config, ids);
  const classes = buttonClasses(config, state);
  const cls = classy(classes.root, className);

  const activate = (event: React.MouseEvent<HTMLButtonElement>): void => {
    if (!behavior.dispatch('press')) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (toggle) {
      const next = pressed === undefined ? behavior.memory.get().pressed === true : !pressed;
      onPressedChange?.(next);
    }
    onClick?.(event);
  };

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>;
    const childProps = child.props as Record<string, unknown>;

    const parentProps: Record<string, unknown> = {
      ref,
      className: cls,
      'data-part': 'root',
      ...aria.root,
      onClick: activate,
      ...rest,
    };

    const merged = mergeProps(
      parentProps as Parameters<typeof mergeProps>[0],
      childProps,
    ) as Record<string, unknown>;

    const tag = typeof child.type === 'string' ? child.type : null;
    if (tag === 'button') {
      merged.disabled = disabled;
    } else {
      if (!childProps.role) merged.role = 'button';
      if (!('tabIndex' in childProps)) merged.tabIndex = disabled ? -1 : 0;
      const origOnKeyDown = merged.onKeyDown as ((event: React.KeyboardEvent) => void) | undefined;
      merged.onKeyDown = (event: React.KeyboardEvent) => {
        const action = behavior.keymap(toKeyInput(event), 'root');
        if (action !== null) {
          event.preventDefault();
          (event.currentTarget as HTMLElement).click();
        }
        origOnKeyDown?.(event);
      };
    }

    return React.cloneElement(child, merged);
  }

  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      disabled={disabled}
      data-part="root"
      className={cls}
      {...aria.root}
      onClick={activate}
      {...rest}
    >
      {state.loading ? (
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
