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
 * WHAT FORM THE ROWS CALL FOR. `fade + reveal (y)` over `opacity` +
 * `grid-rows / height` is a TRANSITION, not a keyframe (docs/MOTION.md: expand
 * and collapse animate `grid-template-rows` 0fr <-> 1fr on an element that
 * stays present). It is the same shape accordion and collapsible content carry:
 * `transition-[grid-template-rows,opacity]` with the closed state at
 * `grid-rows-[minmax(0,0fr)] opacity-0 duration-fast ease-exit` and the open
 * state at `grid-rows-[minmax(0,1fr)] opacity-100 duration-fast ease-enter`.
 * No `animate-*` cell exists for these rows on purpose -- design-tokens excludes
 * them as `carriedByExpandCollapse`, because a keyframe would double-drive the
 * opacity the transition already owns.
 *
 * WHY THAT FORM IS NOT WRITTEN HERE. The transition keys off a closed/open state
 * the message element can be in while mounted, and field has neither:
 *
 * 1. NO STATE TO KEY OFF. FieldState is empty and the score projects no
 *    `data-state` (or any error-presence attribute) onto the message or the
 *    container, so neither `data-[state=open]:` nor a `group-data-*` variant
 *    would match anything. The rule for `appear` and the rule for `disappear`
 *    have no selector to hang on, and they would read as consumed while doing
 *    nothing.
 *
 * 2. THE NODE UNMOUNTS. All three performances render the error only while there
 *    is one (field.tsx `hasError &&` and its Astro/WC equivalents), and the
 *    description only while there is none. A transition cannot run on a fresh
 *    mount, nothing holds the node while a disappear settles (the matrix names
 *    `use-presence` for that; field does not use it), and the matrix rules out
 *    leaning on `@starting-style`.
 *
 * Consuming these rows needs the message kept mounted with an open/closed state
 * projected onto it (or presence wiring) in the performances and the score --
 * neither is a classes-file change. Until then the message stays instant rather
 * than carrying timing classes that can never fire.
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
