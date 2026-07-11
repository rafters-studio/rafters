import type { SpinnerConfig, SpinnerSize, SpinnerState, SpinnerVariant } from './spinner.behavior';

export interface SpinnerClassSet {
  root: string;
}

/**
 * Ring color per variant, ported verbatim from the oracle
 * (src/old/ui/spinner.classes.ts): semantic token classes, same family as
 * Button's `bg-primary` -- not the raw color utilities the discipline
 * forbids. No `bg-*-subtle` + `*-foreground` pairing here (the known
 * contrast-defect class) to repoint; the oracle never paired a background
 * with foreground text for this component.
 */
const variantClasses: Record<SpinnerVariant, string> = {
  default: 'border-primary border-r-transparent',
  primary: 'border-primary border-r-transparent',
  secondary: 'border-secondary border-r-transparent',
  destructive: 'border-destructive border-r-transparent',
  success: 'border-success border-r-transparent',
  warning: 'border-warning border-r-transparent',
  info: 'border-info border-r-transparent',
  accent: 'border-accent border-r-transparent',
  muted: 'border-muted-foreground border-r-transparent',
};

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4 border-2',
  default: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-3',
};

const baseClasses = 'inline-block rounded-full animate-spin motion-reduce:animate-none';

export function spinnerClasses(config: SpinnerConfig, _state: SpinnerState): SpinnerClassSet {
  const variant = config.variant ?? 'default';
  const size = config.size ?? 'default';
  return {
    root: `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`,
  };
}
