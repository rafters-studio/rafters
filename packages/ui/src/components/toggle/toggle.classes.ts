import type { ToggleConfig, ToggleSize, ToggleState, ToggleVariant } from './toggle.behavior';

export interface ToggleClassSet {
  root: string;
}

const variantClasses: Record<ToggleVariant, string> = {
  default:
    'bg-transparent hover:bg-muted ' +
    'data-[state=on]:bg-primary data-[state=on]:text-primary-foreground',
  primary:
    'bg-transparent hover:bg-muted ' +
    'data-[state=on]:bg-primary data-[state=on]:text-primary-foreground',
  secondary:
    'bg-transparent hover:bg-muted ' +
    'data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground',
  destructive:
    'bg-transparent hover:bg-muted ' +
    'data-[state=on]:bg-destructive data-[state=on]:text-destructive-foreground',
  success:
    'bg-transparent hover:bg-muted ' +
    'data-[state=on]:bg-success data-[state=on]:text-success-foreground',
  warning:
    'bg-transparent hover:bg-muted ' +
    'data-[state=on]:bg-warning data-[state=on]:text-warning-foreground',
  info:
    'bg-transparent hover:bg-muted ' +
    'data-[state=on]:bg-info data-[state=on]:text-info-foreground',
  accent:
    'bg-transparent hover:bg-muted ' +
    'data-[state=on]:bg-accent data-[state=on]:text-accent-foreground',
  outline:
    'border border-input bg-transparent hover:bg-muted ' +
    'data-[state=on]:bg-accent data-[state=on]:text-accent-foreground',
  ghost:
    'bg-transparent hover:bg-accent hover:text-accent-foreground ' +
    'data-[state=on]:bg-accent data-[state=on]:text-accent-foreground',
};

const sizeClasses: Record<ToggleSize, string> = {
  default: 'h-10 px-3',
  sm: 'h-9 px-2.5',
  lg: 'h-11 px-5',
};

const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-md text-label-large ts-label-large cursor-pointer ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'transition-colors duration-150 motion-reduce:transition-none ' +
  'disabled:opacity-50 disabled:cursor-not-allowed ' +
  'aria-disabled:opacity-50 aria-disabled:cursor-not-allowed';

export function toggleClasses(config: ToggleConfig, _state: ToggleState): ToggleClassSet {
  return {
    root: `${baseClasses} ${variantClasses[config.variant]} ${sizeClasses[config.size]}`,
  };
}

export function toggleVariants(
  options: { variant?: ToggleVariant; size?: ToggleSize } = {},
): string {
  return `${baseClasses} ${variantClasses[options.variant ?? 'default']} ${sizeClasses[options.size ?? 'default']}`;
}
