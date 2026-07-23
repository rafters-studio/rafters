import type { RadioGroupConfig, RadioGroupState } from '@/components/ui/radio-group.behavior';

export interface RadioGroupClassSet {
  /** The [role="radiogroup"] container: orientation-driven layout. */
  root: string;
  /** Each [role="radio"] item button (carries the `group` marker for the dot). */
  item: string;
  /** The indicator dot: shown only while its item is data-state=checked. */
  indicator: string;
}

const horizontalClasses = 'flex gap-2';
const verticalClasses = 'grid gap-2';

const itemBaseClasses =
  'inline-flex items-center justify-center ' +
  'aspect-square h-4 w-4 ' +
  'rounded-full ' +
  'border border-primary ' +
  'text-primary ' +
  'hover:border-input-hover ' +
  'transition-colors duration-150 motion-reduce:transition-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

// The item button is marked `group`; the indicator's compound
// `group-data-[state=unchecked]` selector outranks its own `block`, so the dot
// hides reliably when unchecked -- no conditional rendering, driven off the
// data-state the score projects onto the item.
const itemGroupClass = 'group';

const indicatorBaseClasses = 'block h-2 w-2 rounded-full bg-current';
const indicatorStateClasses = 'group-data-[state=unchecked]:hidden';

/** The view: class strings keyed by config/state. No logic. */
export function radioGroupClasses(
  config: RadioGroupConfig,
  _state: RadioGroupState,
): RadioGroupClassSet {
  return {
    root: config.orientation === 'horizontal' ? horizontalClasses : verticalClasses,
    item: `${itemBaseClasses} ${itemGroupClass}`,
    indicator: `${indicatorBaseClasses} ${indicatorStateClasses}`,
  };
}
