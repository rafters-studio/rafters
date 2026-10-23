import classy from '../../primitives/classy';
import type { BadgeConfig, BadgeSize, BadgeState, BadgeVariant } from './badge.behavior';

export interface BadgeClassSet {
  root: string;
  startIcon: string;
  endIcon: string;
}

/**
 * Variant classes, ported verbatim from the oracle:
 * semantic token pairs (bg-X text-X-foreground) for the fill-family variants,
 * plus the shadcn structural variants (outline/ghost/link) that carry no fill.
 */
const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-primary text-primary-foreground',
  primary: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning text-warning-foreground',
  info: 'bg-info text-info-foreground',
  muted: 'bg-muted text-muted-foreground',
  accent: 'bg-accent text-accent-foreground',
  outline: 'bg-transparent border-input text-foreground',
  ghost: 'hover:bg-muted hover:text-muted-foreground',
  link: 'text-primary',
};

/** What a variant carries besides its surface; it stays when a fill wins. */
const variantStructureClasses: Partial<Record<BadgeVariant, string>> = {
  outline: 'border',
  link: 'underline-offset-4 hover:underline',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-label-small ts-label-small has-data-[icon=inline-start]:ps-1.5 has-data-[icon=inline-end]:pe-1.5',
  default:
    'px-2.5 py-0.5 text-label-small ts-label-small has-data-[icon=inline-start]:ps-2 has-data-[icon=inline-end]:pe-2',
  lg: 'px-3 py-1 text-label-medium ts-label-medium has-data-[icon=inline-start]:ps-2.5 has-data-[icon=inline-end]:pe-2.5',
};

// Padding tightens on the icon's own side only, in logical edges so the start
// icon sits on the right of the label on a dir="rtl" page. The wrapper only
// places and hides: the brand brings its icons, sizing included.
const iconClasses = 'inline-grid place-items-center';

/**
 * `badge / root / hover` in `packages/ui/docs/spec/matrix/motion.jsonl` assigns
 * tier `fast` and curve role `standard` to a colour change (`background, text,
 * border`) on a part that stays put -- a TRANSITION, named as composed
 * generics, not a keyframe. `duration-fast ease-standard` is that row and
 * nothing else; the literal 150ms duration this replaces was a literal wearing a
 * token's name, which is the defect docs/MOTION.md names outright.
 *
 * NO component-level reduced-motion escape. The generated `duration-*` and
 * `delay-*` utilities zero themselves under `prefers-reduced-motion` (the
 * exporter's `REDUCED_MOTION_ZEROED` set), so reduced motion is the token
 * sheet's responsibility and never a component-level media query. The
 * reduced-motion transition escape this drops was redundant with that law.
 *
 * The row's provenance is `baseline`.
 */
const baseClasses =
  'inline-grid grid-flow-col w-fit items-center justify-center gap-1 rounded-full transition-colors duration-fast ease-standard';

export function badgeClasses(config: BadgeConfig, _state: BadgeState): BadgeClassSet {
  const variant = config.variant ?? 'default';
  const size = config.size ?? 'default';
  return {
    root: `${baseClasses} ${classy.fill(config.fill, variantClasses[variant])} ${variantStructureClasses[variant] ?? ''} ${sizeClasses[size]}`,
    startIcon: iconClasses,
    endIcon: iconClasses,
  };
}

/** The shadcn drop-in surface exports `badgeVariants` for styling non-span
 *  elements (`<a className={badgeVariants({...})}>`), the standard reach
 *  while `asChild` is deferred. Mirrors `buttonVariants`. */
export function badgeVariants(options: { variant?: BadgeVariant; size?: BadgeSize } = {}): string {
  const variant = options.variant ?? 'default';
  return `${baseClasses} ${variantClasses[variant]} ${variantStructureClasses[variant] ?? ''} ${sizeClasses[options.size ?? 'default']}`;
}
