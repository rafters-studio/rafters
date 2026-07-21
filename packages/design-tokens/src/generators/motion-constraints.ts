/**
 * Motion combination constraints
 *
 * The duration scale, easing curves, and semantic motion tokens are VALUES --
 * they live in tokens (see `motion.ts`). Combination constraints are RULES about
 * how animation parameters may be combined, and a cross-parameter rule has no
 * home in any single token. They exist because the number of possible parameter
 * combinations is larger than intuition can navigate, which is the same argument
 * for encoding designer judgment as queryable data rather than prose: an agent
 * composing motion should be told "rotation is isolated" before it writes the
 * wrong thing.
 *
 * This module is the single decision point for "is this combination legal". It
 * is pure and dependency-free (no token imports, no node:fs), so it is
 * browser-safe and exhaustively unit-testable in isolation, and it is exported
 * from `@rafters/design-tokens` as importable, queryable metadata.
 *
 * Two deliberate splits govern the design:
 *
 * 1. Permission vs prohibition. Only three of the five constraints have teeth
 *    (Direction, Rotation, Timing). Scaling and Opacity are PERMISSIONS -- they
 *    bless combinations (`scale + move`, `fade + slide` are the standard
 *    enter/exit). The validator therefore never rejects a scale/opacity combo;
 *    rejecting "any two parameters combined" would contradict the spec.
 *
 * 2. Mechanical vs advisory, for the governing rule. "Motion that answers no
 *    question does not move" is mechanically checkable only as "an answer was
 *    declared"; whether the declared answer is TRUE is a human/agent judgment
 *    and stays advisory.
 *
 * Parameters are keyed on their KIND (translate axis, scale-present,
 * opacity-present, rotate-present, element-size, timing), never on token names.
 * Token names for durations and curves are being rebuilt; keying on kinds keeps
 * this module stable across that churn.
 */

/** Axis of translation. Diagonal (both at once) is the prohibited case. */
export type MotionAxis = 'horizontal' | 'vertical';

/** The animation parameters a composition can engage. */
export type MotionParameter = 'translate' | 'scale' | 'opacity' | 'rotate';

/** Size class of the animated element. Rotation is permitted on small only. */
export type MotionElementSize = 'small' | 'large';

/**
 * The three questions motion may answer. The governing rule requires at least
 * one to be declared.
 */
export type MotionQuestion = 'what-happened' | 'where-am-i' | 'what-next';

/**
 * A proposed animation, described by the parameters it engages rather than by
 * the tokens it references. This is the input an author or agent hands the
 * validator before committing to an animation.
 */
export interface MotionComposition {
  /** Translation axes engaged. Empty/omitted means no spatial movement. */
  translate?: MotionAxis[];
  /** Whether the animation scales the element. */
  scale?: boolean;
  /** Whether the animation changes opacity. */
  opacity?: boolean;
  /** Whether the animation rotates the element. */
  rotate?: boolean;
  /** Size class of the animated element (rotation is small-only). */
  elementSize?: MotionElementSize;
  /**
   * How co-occurring animated elements are timed. `sequential` staggers them
   * into a narrative; `simultaneous` animates them together and reads as noise.
   * Omitted means a single element, which is trivially sequential.
   */
  timing?: 'sequential' | 'simultaneous';
  /**
   * Which question(s) the motion answers. Mechanically, the governing rule only
   * checks that this is non-empty; the TRUTH of the claim is advisory.
   */
  answers?: MotionQuestion[];
}

/** Stable identifiers for the five combination constraints. */
export type MotionConstraintId = 'direction' | 'scaling' | 'opacity' | 'rotation' | 'timing';

/**
 * A single combination constraint as queryable metadata.
 *
 * `kind` distinguishes the two enforcement postures: a `prohibition` is
 * mechanically rejectable by {@link validateMotionComposition}; a `permission`
 * exists to record that a combination is explicitly blessed (so tooling does
 * not wrongly flag it) and is never a source of violations.
 */
export interface MotionConstraint {
  id: MotionConstraintId;
  /** Human-facing parameter label. */
  parameter: string;
  kind: 'prohibition' | 'permission';
  /** The rule, in the designer's words. */
  rule: string;
  /** Why the rule exists. */
  rationale: string;
}

/**
 * The five combination constraints, as structured data. Ordered to match the
 * table in `docs/MOTION.md`.
 */
export const MOTION_COMBINATION_CONSTRAINTS: readonly MotionConstraint[] = [
  {
    id: 'direction',
    parameter: 'Direction',
    kind: 'prohibition',
    rule: 'Horizontal or vertical. Never diagonal.',
    rationale: 'The eye tracks one axis at a time. Axis-aligned movement creates order.',
  },
  {
    id: 'scaling',
    parameter: 'Scaling',
    kind: 'permission',
    rule: 'May combine with movement.',
    rationale:
      'Scale changes state, movement changes position; together they read as arriving at a new size.',
  },
  {
    id: 'opacity',
    parameter: 'Opacity',
    kind: 'permission',
    rule: 'May combine with movement.',
    rationale:
      'Fade plus slide is the standard enter/exit. Fade alone is for elements that do not move.',
  },
  {
    id: 'rotation',
    parameter: 'Rotation',
    kind: 'prohibition',
    rule: 'Small elements only. Never combined with another parameter.',
    rationale:
      'Rotation is visually dominant; combined with translation it is chaos. Isolated, it reads as processing.',
  },
  {
    id: 'timing',
    parameter: 'Timing',
    kind: 'prohibition',
    rule: 'Sequential, not simultaneous.',
    rationale: 'Staggered sequences create narrative. Simultaneous animation is noise.',
  },
] as const;

/**
 * The governing rule, as metadata. `enforcement` records the mechanical/advisory
 * split explicitly: presence of a declared answer is checked mechanically;
 * whether the answer is true is left to human/agent judgment.
 */
export interface MotionGoverningRule {
  statement: string;
  rationale: string;
  /** The questions a motion may answer; at least one must be declared. */
  questions: readonly MotionQuestion[];
  enforcement: 'mechanical-presence-advisory-truth';
}

export const MOTION_GOVERNING_RULE: MotionGoverningRule = {
  statement: 'Motion that answers no question does not move.',
  rationale:
    'If an animation does not tell the user what happened, where they are, or what to expect next, it is decorative -- and decorative animation measurably impairs recall (Stokes 2020). It is not neutral.',
  questions: ['what-happened', 'where-am-i', 'what-next'],
  enforcement: 'mechanical-presence-advisory-truth',
};

/** A single rule violation found in a proposed composition. */
export interface MotionViolation {
  /** Which constraint was violated (or the governing rule). */
  constraint: MotionConstraintId | 'governing-rule';
  /** Whether enforcement of this rule is mechanical or advisory. */
  enforcement: 'mechanical' | 'advisory';
  /** Human-facing explanation of the violation and the fix. */
  message: string;
}

/**
 * Validate a proposed motion composition against the combination constraints.
 *
 * Returns the list of violations; an empty list means the composition is legal.
 * Only the three prohibitions (Direction, Rotation, Timing) and the presence
 * half of the governing rule can produce a MECHANICAL violation. The two
 * permissions (Scaling, Opacity) never reject -- a scale+move or fade+slide
 * composition passes by design.
 */
export function validateMotionComposition(composition: MotionComposition): MotionViolation[] {
  const violations: MotionViolation[] = [];

  const axes = composition.translate ?? [];
  const hasHorizontal = axes.includes('horizontal');
  const hasVertical = axes.includes('vertical');
  const hasTranslate = hasHorizontal || hasVertical;
  const hasScale = composition.scale === true;
  const hasOpacity = composition.opacity === true;
  const hasRotate = composition.rotate === true;

  // Direction (prohibition): a single axis is order; both at once is diagonal.
  if (hasHorizontal && hasVertical) {
    violations.push({
      constraint: 'direction',
      enforcement: 'mechanical',
      message:
        'Movement combines horizontal and vertical translation (diagonal). The eye tracks one axis at a time -- move on a single axis.',
    });
  }

  // Rotation (prohibition): isolated, and small elements only.
  if (hasRotate) {
    const combinedWith = [
      hasTranslate ? 'translation' : null,
      hasScale ? 'scale' : null,
      hasOpacity ? 'opacity' : null,
    ].filter((entry): entry is string => entry !== null);

    if (combinedWith.length > 0) {
      violations.push({
        constraint: 'rotation',
        enforcement: 'mechanical',
        message: `Rotation is combined with ${combinedWith.join(
          ', ',
        )}. Rotation is visually dominant and must be isolated -- animate it on its own.`,
      });
    }

    if (composition.elementSize === 'large') {
      violations.push({
        constraint: 'rotation',
        enforcement: 'mechanical',
        message:
          'Rotation is applied to a large element. Rotation is for small elements only (icons, spinners, chevrons).',
      });
    }
  }

  // Timing (prohibition): co-occurring elements stagger, never fire together.
  if (composition.timing === 'simultaneous') {
    violations.push({
      constraint: 'timing',
      enforcement: 'mechanical',
      message:
        'Multiple elements animate simultaneously. Stagger them into a sequence -- the eye can track only one moving element.',
    });
  }

  // Governing rule: presence is mechanical, truth is advisory.
  if (!composition.answers || composition.answers.length === 0) {
    violations.push({
      constraint: 'governing-rule',
      enforcement: 'mechanical',
      message:
        'Motion answers no question (what happened / where am I / what next). Motion that answers no question does not move.',
    });
  }

  return violations;
}

/**
 * Convenience predicate: `true` when a composition has no violations. Thin
 * wrapper over {@link validateMotionComposition} for call sites that only need
 * a yes/no gate.
 */
export function isLegalMotionComposition(composition: MotionComposition): boolean {
  return validateMotionComposition(composition).length === 0;
}
