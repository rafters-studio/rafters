/**
 * Label -- decoration for the form-control label static score.
 *
 * No label.behavior.ts: the for/id association IS the contract, and it is
 * a native HTML attribute (label[for] naming an id) forwarded through
 * Props, not a synthesized ARIA projection -- there is nothing for a
 * BehaviorSpec.aria to project (container's precedent: `aria: () => ({
 * root: {} })` for "the association is native, the score projects
 * nothing" -- here there is no score left over once the native attribute
 * is accounted for). No state, no actions, no keymap, no effects. Only
 * class selection survives as decoration.
 */

export type LabelVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info'
  | 'muted'
  | 'accent';

export interface LabelConfig {
  variant?: LabelVariant | undefined;
}

export interface LabelClassSet {
  root: string;
}

const baseClasses =
  'text-label-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70';

const variantClasses: Record<LabelVariant, string> = {
  default: 'text-foreground',
  primary: 'text-primary',
  secondary: 'text-secondary',
  destructive: 'text-destructive',
  success: 'text-success',
  warning: 'text-warning',
  info: 'text-info',
  muted: 'text-muted-foreground',
  accent: 'text-accent',
};

export function labelClasses(config: LabelConfig): LabelClassSet {
  const variant = config.variant ?? 'default';
  return { root: `${baseClasses} ${variantClasses[variant]}` };
}
