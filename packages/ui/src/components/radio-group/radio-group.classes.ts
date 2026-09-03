import type { RadioGroupConfig, RadioGroupState } from './radio-group.behavior';

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

// radio-group / item / unchecked <-> checked -- color -- duration-moderate,
// ease-standard.
//
// NO PRESS ROW. checkbox, switch, toggle and toggle-group each carry a
// `root|item / press` zoom cell; radio-group does not, so no `active:` scale is
// added here. A press moment the matrix does not claim is not ours to invent.
const itemBaseClasses =
  'inline-flex items-center justify-center ' +
  'aspect-square h-4 w-4 ' +
  'rounded-full ' +
  'border border-primary ' +
  'text-primary ' +
  'hover:border-input-hover ' +
  'transition-colors duration-moderate ease-standard ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

// The item button is marked `group`; the indicator's compound
// `group-data-[state=unchecked]` selector outranks its own base rule, so the dot
// recedes reliably when unchecked -- no conditional rendering, driven off the
// data-state the score projects onto the item.
const itemGroupClass = 'group';

// radio-group / indicator / unchecked <-> checked -- swap (dot scale) + fade
//   -- duration-fast, ease-standard, extent-pop
//
// The dot is PAINTED IN BOTH STATES and fades/scales between them. It used to be
// `group-data-[state=unchecked]:hidden`, and `display` cannot transition: the
// generics would have been dead classes on a glyph that snapped.
//
// EXTENT-POP SITS ON THE ABSENT STATE. `pop` is the scale a thing enters FROM
// (0.95 by default), so the unchecked dot rests at it and arrives at its natural
// size. Checkbox's `extent-draw` is the mirror case -- a COMPLETED fraction, so
// it sits on the present state.
const indicatorBaseClasses =
  'block h-2 w-2 rounded-full bg-current ' +
  'transition-[opacity,scale] duration-fast ease-standard';
const indicatorStateClasses =
  'group-data-[state=unchecked]:opacity-0 ' +
  'group-data-[state=unchecked]:extent-pop ' +
  'group-data-[state=unchecked]:scale-(--rafters-consumed-extent)';

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
