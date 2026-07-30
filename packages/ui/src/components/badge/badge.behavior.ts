import type { BehaviorSpec } from '../../lib/contract';

/**
 * Badge: a small label chip, inline. A static score -- no state, no
 * actions, no keymap, no effects. The oracle's variant vocabulary
 * (semantic fills plus the shadcn structural variants) and size scale are
 * config; the score projects nothing because a `<span>` carrying visible
 * text needs no ARIA role of its own -- the text IS the accessible name,
 * read in flow by any assistive technology that reaches it.
 */

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info'
  | 'muted'
  | 'accent'
  | 'outline'
  | 'ghost'
  | 'link';

export type BadgeSize = 'sm' | 'default' | 'lg';

export interface BadgeConfig {
  variant?: BadgeVariant | undefined;
  size?: BadgeSize | undefined;
}

/**
 * The variant and size vocabularies, enumerated once so the DOM-native
 * performances can narrow a `string | null` attribute without re-listing the
 * union (the same shape Avatar uses). Attribute narrowing is a parse, not a
 * decision: an unrecognised value narrows to `undefined` and `badgeClasses`
 * applies the single `default` fallback -- the performances never name it.
 */
export const BADGE_VARIANTS: ReadonlyArray<BadgeVariant> = [
  'default',
  'primary',
  'secondary',
  'destructive',
  'success',
  'warning',
  'info',
  'muted',
  'accent',
  'outline',
  'ghost',
  'link',
];

export const BADGE_SIZES: ReadonlyArray<BadgeSize> = ['sm', 'default', 'lg'];

export function isBadgeVariant(value: string | null | undefined): value is BadgeVariant {
  return value != null && (BADGE_VARIANTS as ReadonlyArray<string>).includes(value);
}

export function isBadgeSize(value: string | null | undefined): value is BadgeSize {
  return value != null && (BADGE_SIZES as ReadonlyArray<string>).includes(value);
}

export type BadgeState = Record<never, never>;
export type BadgeActions = Record<never, never>;
export type BadgePart = 'root';

export const badge: BehaviorSpec<BadgeConfig, BadgeState, BadgeActions, BadgePart> = {
  name: 'badge',
  parts: { root: {} },
  initialState: () => ({}),
  actions: {},
  canDispatch: () => true,
  // No role: the label text is the entire accessible payload; a decorative
  // inline chip projects nothing for the harness to assert beyond presence.
  aria: () => ({ root: {} }),
  keymap: () => null,
};
