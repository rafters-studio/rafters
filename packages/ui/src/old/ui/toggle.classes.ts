/**
 * Shared toggle class definitions
 *
 * Imported by toggle.tsx (React) to keep inline strings
 * in a single source of truth.
 */

export const toggleBaseClasses =
  'inline-flex items-center justify-center ' +
  'rounded-md ' +
  'text-label-large ' +
  'transition-all duration-200 motion-reduce:transition-none ' +
  'active:scale-[0.98] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'disabled:pointer-events-none disabled:opacity-50';

export const toggleVariantClasses: Record<string, string> = {
  default:
    'bg-transparent data-[state=on]:bg-primary data-[state=on]:text-primary-foreground hover:bg-muted',
  primary:
    'bg-transparent data-[state=on]:bg-primary data-[state=on]:text-primary-foreground hover:bg-muted',
  secondary:
    'bg-transparent data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground hover:bg-muted',
  destructive:
    'bg-transparent data-[state=on]:bg-destructive data-[state=on]:text-destructive-foreground hover:bg-muted',
  success:
    'bg-transparent data-[state=on]:bg-success data-[state=on]:text-success-foreground hover:bg-muted',
  warning:
    'bg-transparent data-[state=on]:bg-warning data-[state=on]:text-warning-foreground hover:bg-muted',
  info: 'bg-transparent data-[state=on]:bg-info data-[state=on]:text-info-foreground hover:bg-muted',
  accent:
    'bg-transparent data-[state=on]:bg-accent data-[state=on]:text-accent-foreground hover:bg-muted',
  outline:
    'border border-input bg-transparent data-[state=on]:bg-accent data-[state=on]:text-accent-foreground hover:bg-muted',
  ghost:
    'bg-transparent data-[state=on]:bg-accent data-[state=on]:text-accent-foreground hover:bg-accent hover:text-accent-foreground',
};

export const toggleSizeClasses: Record<string, string> = {
  default: 'h-10 px-3',
  sm: 'h-9 px-2.5',
  lg: 'h-11 px-5',
};
