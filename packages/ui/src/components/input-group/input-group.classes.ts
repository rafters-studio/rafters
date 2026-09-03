import type {
  InputGroupAddonPosition,
  InputGroupConfig,
  InputGroupSize,
  InputGroupState,
} from './input-group.behavior';

/**
 * InputGroup decoration. The group draws the whole control's chrome -- the
 * border, the radius, and the single focus ring that lights up when focus lands
 * ANYWHERE inside it -- while the contained control draws nothing. That
 * inversion is the point of the component: one box, several occupants.
 *
 * Token and semantic classes only. Heights come from the shared size
 * vocabulary, type from the `text-body-small ts-body-small` role token (never a raw
 * `text-sm`), colours from the frozen semantic tokens.
 */

/** Addon fill treatment. Purely decorative -- it carries no behavior, so unlike
 *  position it never reaches the score. */
export type InputGroupAddonVariant = 'default' | 'filled';

export interface InputGroupClassSet {
  root: string;
  control: string;
  /** The addon class WITHOUT position/variant; use `composeInputGroupAddonClasses`
   *  for the resolved string the decorators paint. */
  addon: string;
}

/**
 * The box: a flex row that owns the border, the radius, and -- via
 * `focus-within` -- the one focus ring for the whole assembly. `bg-transparent`,
 * never `bg-background`: the control inherits the surface it sits on (the
 * fill-never-background rule, the same correction the standalone input made).
 * Validity is styled off the projected `data-state`, so light-DOM markup, the
 * Web Component, and React all pick up the destructive border with no extra
 * class; the dim keys off the authored `data-disabled` host signal.
 */
const rootClasses =
  'flex items-center w-full rounded-md border border-input bg-transparent ' +
  'ring-offset-background ' +
  'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ' +
  // input-group / root / focus -- ring -- duration-micro, ease-linear. The only
  // row this component has, and `transition-shadow` is exactly the ring's
  // property, so the list stays as narrow as the row.
  //
  // `data-[state=invalid]:border-destructive` IS A MOMENT WITH NO ROW. input and
  // textarea each carry a `valid <-> invalid` colour cell; input-group does not,
  // so `border-color` is deliberately left out of the transition list and the
  // invalid border snaps. Reported rather than given an invented cell.
  'transition-shadow duration-micro ease-linear ' +
  'data-[state=invalid]:border-destructive data-[state=invalid]:focus-within:ring-destructive-ring ' +
  'data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed';

/** Per-size heights, ported from the oracle. `text-sm` becomes the
 *  `text-body-small ts-body-small` typography role token. */
const sizeClasses: Record<InputGroupSize, string> = {
  sm: 'h-9 text-body-small ts-body-small',
  default: 'h-10',
  lg: 'h-11',
};

/**
 * The contained control: it fills the remaining width and deliberately renders
 * NO border, radius, or focus ring -- the root owns all three, which is what
 * makes the group read as one control rather than a box around a box.
 */
const controlClasses =
  'flex-1 h-full w-full min-w-0 bg-transparent px-3 py-2 text-body-small ts-body-small ' +
  'text-foreground placeholder:text-muted-foreground ' +
  'border-0 rounded-[inherit] ' +
  'focus:outline-none focus-visible:outline-none ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

/** Affix chrome: never grows, never competes with the control for width. */
const addonBaseClasses = 'flex items-center justify-center shrink-0 text-muted-foreground px-3';

/** The divider sits on the side facing the control, so the affix reads as
 *  attached to it rather than floating in the box. */
const addonPositionClasses: Record<InputGroupAddonPosition, string> = {
  start: 'border-r border-input',
  end: 'border-l border-input',
};

const addonVariantClasses: Record<InputGroupAddonVariant, string> = {
  default: 'bg-transparent',
  filled: 'bg-muted',
};

/**
 * Compose an addon's resolved class string. Exported so all three performances
 * paint the identical composition -- the parity guarantee the oracle's
 * `composeInputGroupAddonClasses` established, kept.
 */
export function composeInputGroupAddonClasses(
  position: InputGroupAddonPosition,
  variant: InputGroupAddonVariant = 'default',
): string {
  return [
    addonBaseClasses,
    addonPositionClasses[position] ?? addonPositionClasses.start,
    addonVariantClasses[variant] ?? addonVariantClasses.default,
  ].join(' ');
}

export function inputGroupClassSet(
  config: InputGroupConfig,
  _state: InputGroupState,
): InputGroupClassSet {
  const size = config.size ?? 'default';
  return {
    root: `${rootClasses} ${sizeClasses[size] ?? sizeClasses.default}`,
    control: controlClasses,
    addon: addonBaseClasses,
  };
}
