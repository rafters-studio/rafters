import { labelClasses } from '../label/label.classes';
import type { FieldConfig, FieldState } from './field.behavior';

/**
 * Field decoration. The field is a layout-composition wrapper: the container
 * stacks label + control + helper/error with consistent spacing; the helper and
 * error share the small body-text role token and flip only their semantic
 * colour. Token/semantic classes only -- `text-body-small ts-body-small` is the typography
 * role token (never a raw `text-sm`), colours are the frozen semantic tokens.
 */
export interface FieldClassSet {
  container: string;
  /** The label class WITHOUT the disabled dim; use `labelClass(disabled)` for
   *  the resolved string the decorators paint. */
  label: string;
  requiredMarker: string;
  description: string;
  error: string;
}

/**
 * THE TWO MESSAGE ROWS ARE NOT CONSUMED, AND THE REASON IS A GAP, NOT A CHOICE.
 *
 * The matrix assigns field two cells (#2286):
 *   field / message / appear -- fade + reveal (y) -- duration-fast, ease-enter
 *   field / message / disappear -- fade + reveal (y) -- duration-fast, ease-exit
 * Both are marked `proposed` -- a starting position, never reviewed.
 *
 * Three things block them, all reported rather than papered over:
 *
 * 1. NO CLASS NAME EXISTS. A message appearing and disappearing is a presence
 *    change, so it wants keyframes. The emitted `--animate-*` set (built from
 *    DEFAULT_MOTION_CELL_ANIMATIONS, one key per distinct shape/tier/curve) has
 *    no `animate-fade-in-fast-enter`. `animate-fade-in-fast-standard` exists and
 *    is NOT a substitute: the row assigns `enter`, and swapping the curve would
 *    invent an assignment. `animate-fade-out-fast-exit` does exist, so only the
 *    disappear half has a name -- half a pair is worse than neither.
 *
 * 2. NO REVEAL SHAPE EXISTS AT ALL. The `reveal (y)` half of both rows is a
 *    grid-rows movement (docs/MOTION.md: `0fr` <-> `1fr`, never `height`), and
 *    the keyframe vocabulary has no reveal shape in any tier or curve.
 *
 * 3. THE NODE UNMOUNTS WITH NO PRESENCE WIRING. All three performances render
 *    the error only while there is one (field.tsx:159 and its Astro/WC
 *    equivalents), and nothing holds the node while an exit animation settles --
 *    the matrix's presence note names `use-presence` as that mechanism, and
 *    field does not use it. An exit keyframe could never play, and a CSS
 *    transition cannot run on a fresh mount either; the matrix rules out leaning
 *    on `@starting-style`.
 *
 * Consuming these rows needs a keyframe pair added upstream and presence wiring
 * added in the performances -- neither is a classes-file change.
 */
const fieldContainerClasses = 'flex flex-col gap-2';
const fieldLabelDisabledClasses = 'opacity-50';
const fieldRequiredMarkerClasses = 'text-destructive ml-1';
const fieldDescriptionClasses = 'text-body-small ts-body-small text-muted-foreground';
const fieldErrorClasses = 'text-body-small ts-body-small text-destructive';

/**
 * Compose the label's class string. Reuses the Label score's own decoration
 * (never a parallel hand-written map) plus the field's disabled dim, exactly as
 * the React performance composes via the `<Label>` component.
 */
export function composeFieldLabelClasses(disabled: boolean): string {
  const base = labelClasses({}, {}).root;
  return disabled ? `${base} ${fieldLabelDisabledClasses}` : base;
}

export function fieldClassSet(_config: FieldConfig, _state: FieldState): FieldClassSet {
  return {
    container: fieldContainerClasses,
    label: composeFieldLabelClasses(false),
    requiredMarker: fieldRequiredMarkerClasses,
    description: fieldDescriptionClasses,
    error: fieldErrorClasses,
  };
}
