import type {
  ToggleGroupConfig,
  ToggleGroupSize,
  ToggleGroupState,
  ToggleGroupVariant,
} from '@/components/ui/toggle-group.behavior';

export interface ToggleGroupClassSet {
  /** The role="group" container: orientation-driven layout + variant chrome. */
  root: string;
  /** Each toggle item button: base + size + variant, pressed driven by data-state. */
  item: string;
}

const rootBaseClasses = 'inline-flex items-center justify-center gap-1 rounded-lg';
const rootDefaultVariantClasses = 'bg-muted p-1';
const rootVerticalClasses = 'flex-col';

// Two rows on one element, carrying different tiers, so the press row rides
// `active:` variants over the state row's base assignment.
//   toggle-group / item / off <-> on -- color -- duration-moderate, ease-standard
//   toggle-group / item / press -- zoom + color -- duration-micro,
//     ease-spring-snappy, extent-press
//
// `active:scale-[0.98]` is gone: the press extent is `extent-press`, a token
// leaf Studio retunes, not a number typed here.
//
// BOX-SHADOW IS DELIBERATELY OUT OF THE TRANSITION LIST. The default variant's
// `data-[state=on]:shadow-sm` is an elevation change, and toggle-group has no
// elevation row in the matrix -- only button and card do. `transition-all` used
// to time it by accident; naming the properties makes the shadow snap, which is
// what a moment with no row is supposed to do. Reported rather than faked.
const itemBaseClasses =
  'inline-flex items-center justify-center ' +
  'rounded-md ' +
  'text-label-large ts-label-large ' +
  'transition-[color,background-color,border-color,scale] duration-moderate ease-standard ' +
  'active:extent-press active:scale-(--rafters-consumed-extent) ' +
  'active:duration-micro active:ease-spring-snappy ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'disabled:pointer-events-none disabled:opacity-50 ' +
  'hover:bg-muted hover:text-muted-foreground';

const itemSizeClasses: Record<ToggleGroupSize, string> = {
  default: 'h-9 px-3',
  sm: 'h-8 px-2',
  lg: 'h-10 px-4',
};

// Pressed styling is data-state driven: the score projects data-state=on|off on
// each item, so the same class string works for all three performances with no
// conditional application.
const itemDefaultVariantClasses =
  'bg-transparent data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm';

const itemOutlineVariantClasses =
  'border border-input bg-transparent data-[state=on]:bg-accent data-[state=on]:text-accent-foreground';

function rootClasses(variant: ToggleGroupVariant, orientation: 'horizontal' | 'vertical'): string {
  const parts = [rootBaseClasses];
  if (orientation === 'vertical') parts.push(rootVerticalClasses);
  if (variant === 'default') parts.push(rootDefaultVariantClasses);
  return parts.join(' ');
}

function itemClasses(variant: ToggleGroupVariant, size: ToggleGroupSize): string {
  const variantClasses =
    variant === 'outline' ? itemOutlineVariantClasses : itemDefaultVariantClasses;
  return `${itemBaseClasses} ${itemSizeClasses[size]} ${variantClasses}`;
}

/** The view: class strings keyed by config/state. No logic. */
export function toggleGroupClasses(
  config: ToggleGroupConfig,
  _state: ToggleGroupState,
): ToggleGroupClassSet {
  const variant = config.variant ?? 'default';
  const size = config.size ?? 'default';
  const orientation = config.orientation ?? 'horizontal';
  return {
    root: rootClasses(variant, orientation),
    item: itemClasses(variant, size),
  };
}
