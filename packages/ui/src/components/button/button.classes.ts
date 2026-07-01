/**
 * button.classes.ts -- presentation projection (Spec 01).
 *
 * Every class string in this file is a LITERAL: the function selects among
 * literals, never constructs them (Tailwind's scanner must see each class
 * verbatim in source). Semantic tokens only. State-dependent styling keys
 * off the projected ARIA/data attributes via Tailwind variants
 * (disabled:, aria-disabled:, aria-busy:), so the DOM contract -- not a
 * parallel class computation -- is the single source of styling truth.
 *
 * Oracle corrections (do not port): no pointer-events-none on disabled
 * (hides the control from discovery); soft-disabled styling arrives via the
 * aria-disabled: variant instead.
 */
import type { ButtonConfig, ButtonState } from './button.behavior';

export const buttonVariantClasses: Record<ButtonConfig['variant'], string> = {
  default:
    'bg-primary text-primary-foreground ' +
    'hover:bg-primary-hover active:bg-primary-active ' +
    'focus-visible:ring-2 focus-visible:ring-primary-ring',
  primary:
    'bg-primary text-primary-foreground ' +
    'hover:bg-primary-hover active:bg-primary-active ' +
    'focus-visible:ring-2 focus-visible:ring-primary-ring',
  secondary:
    'bg-secondary text-secondary-foreground ' +
    'hover:bg-secondary-hover active:bg-secondary-active ' +
    'focus-visible:ring-2 focus-visible:ring-secondary-ring',
  destructive:
    'bg-destructive text-destructive-foreground ' +
    'hover:bg-destructive-hover active:bg-destructive-active ' +
    'focus-visible:ring-2 focus-visible:ring-destructive-ring',
  success:
    'bg-success text-success-foreground ' +
    'hover:bg-success-hover active:bg-success-active ' +
    'focus-visible:ring-2 focus-visible:ring-success-ring',
  warning:
    'bg-warning text-warning-foreground ' +
    'hover:bg-warning-hover active:bg-warning-active ' +
    'focus-visible:ring-2 focus-visible:ring-warning-ring',
  info:
    'bg-info text-info-foreground ' +
    'hover:bg-info-hover active:bg-info-active ' +
    'focus-visible:ring-2 focus-visible:ring-info-ring',
  muted:
    'bg-muted text-muted-foreground ' +
    'hover:bg-muted-hover active:bg-muted-active ' +
    'focus-visible:ring-2 focus-visible:ring-ring',
  accent:
    'bg-accent text-accent-foreground ' +
    'hover:bg-accent-hover active:bg-accent-active ' +
    'focus-visible:ring-2 focus-visible:ring-accent-ring',
  outline:
    'border border-input bg-transparent text-foreground ' +
    'hover:bg-accent hover:text-accent-foreground ' +
    'focus-visible:ring-2 focus-visible:ring-ring',
  ghost:
    'bg-transparent text-foreground ' +
    'hover:bg-accent hover:text-accent-foreground ' +
    'focus-visible:ring-2 focus-visible:ring-ring',
  link:
    'text-primary underline-offset-4 ' +
    'hover:underline ' +
    'focus-visible:ring-2 focus-visible:ring-ring',
};

export const buttonSizeClasses: Record<ButtonConfig['size'], string> = {
  default: 'h-10 px-4 py-2',
  xs: 'h-6 px-2 text-label-small',
  sm: 'h-8 px-3 text-label-small',
  lg: 'h-12 px-6 text-label-large',
  icon: 'h-10 w-10',
  'icon-xs': 'h-6 w-6',
  'icon-sm': 'h-8 w-8',
  'icon-lg': 'h-12 w-12',
};

export const buttonBaseClasses =
  'inline-flex items-center justify-center gap-2 rounded-md text-label-large cursor-pointer ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
  'transition-colors duration-150 motion-reduce:transition-none ' +
  'disabled:opacity-50 disabled:cursor-not-allowed ' +
  'aria-disabled:opacity-50 aria-disabled:cursor-not-allowed ' +
  'aria-busy:cursor-progress';

export const buttonSpinnerClasses = 'h-4 w-4 animate-spin motion-reduce:animate-none';

export interface ButtonClassSet {
  root: string;
  spinner: string;
}

/**
 * The classes projection. State-dependent looks route through ARIA/data
 * attributes (see file header), so the projection is config-driven; the
 * state parameter is part of the Spec 01 signature and stays for uniformity.
 */
export function buttonClasses(config: ButtonConfig, _state?: ButtonState): ButtonClassSet {
  return {
    root: `${buttonBaseClasses} ${buttonVariantClasses[config.variant]} ${buttonSizeClasses[config.size]}`,
    spinner: buttonSpinnerClasses,
  };
}

/**
 * shadcn-compatible export: consumers do
 * `import { buttonVariants } from './button'` to style links as buttons.
 * A thin view over buttonClasses at default state -- one source of truth.
 */
export function buttonVariants(
  options: { variant?: ButtonConfig['variant']; size?: ButtonConfig['size'] } = {},
): string {
  return buttonClasses({
    variant: options.variant ?? 'default',
    size: options.size ?? 'default',
  }).root;
}
