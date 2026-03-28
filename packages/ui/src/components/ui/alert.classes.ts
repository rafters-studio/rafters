/**
 * Shared class definitions for Alert component
 * Used by both alert.tsx (React) and alert.astro (Astro)
 */

export const alertBaseClasses =
  'relative w-full rounded-lg border p-4 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg+div]:-translate-y-0.5 [&:has(svg)]:pl-11';

export const alertVariantClasses: Record<string, string> = {
  default: 'bg-primary-subtle text-primary-foreground border-primary-border',
  primary: 'bg-primary-subtle text-primary-foreground border-primary-border',
  secondary: 'bg-secondary-subtle text-secondary-foreground border-secondary-border',
  destructive: 'bg-destructive-subtle text-destructive-foreground border-destructive-border',
  success: 'bg-success-subtle text-success-foreground border-success-border',
  warning: 'bg-warning-subtle text-warning-foreground border-warning-border',
  info: 'bg-info-subtle text-info-foreground border-info-border',
  muted: 'bg-muted text-muted-foreground border-border',
  accent: 'bg-accent-subtle text-accent-foreground border-accent-border',
};

export const alertTitleClasses = 'mb-1 font-medium leading-none tracking-tight';

export const alertDescriptionClasses = 'text-sm [&_p]:leading-relaxed';

export const alertActionClasses = 'ml-auto shrink-0';
