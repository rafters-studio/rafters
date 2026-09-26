import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  DEFAULT_ANIMATION_DEFINITIONS,
  DEFAULT_DELAY_NAMESPACE,
  DEFAULT_DURATION_DEFINITIONS,
  DEFAULT_EASING_DEFINITIONS,
  DEFAULT_EXTENT_NAMESPACE,
  DEFAULT_KEYFRAME_DEFINITIONS,
  DEFAULT_MOTION_CELL_ANIMATIONS,
  DEFAULT_MOTION_COMPOSITE_PRESETS,
  DEFAULT_MOTION_SEMANTIC_MAPPINGS,
  DEFAULT_PERIOD_NAMESPACE,
  type MotionCellAnimation,
} from '../src/generators/defaults.js';
import { generateMotionTokens } from '../src/generators/motion.js';
import type { ResolvedSystemConfig } from '../src/generators/types.js';

/**
 * THE TWO DURATION FORMS A MOTION CELL CAN TAKE (#2154).
 *
 * `motion.jsonl` states duration as a tagged union: a transition names a
 * perceptual TIER and runs once, a loop names a PERIOD and runs forever. Before
 * this issue the generator could only represent the first, so the four looping
 * cells -- skeleton waiting, spinner busy, progress indeterminate, input-otp
 * caret idle -- had no representation at all and no CSS to compile to.
 *
 * These are generator-layer assertions: the token spec, its dependency edges and
 * the reduced-motion metadata. The CSS proof is at the compiled layer in
 * `test/exporters/motion-utilities.test.ts`, because a generator-text proof does
 * not transfer (reflection 019fc544).
 */

const CONFIG = {
  baseTransitionDuration: 150,
  progressionRatio: 'minor-third',
} as unknown as ResolvedSystemConfig;

function emitMotion(cells: Record<string, MotionCellAnimation> = DEFAULT_MOTION_CELL_ANIMATIONS) {
  return generateMotionTokens(
    CONFIG,
    DEFAULT_DURATION_DEFINITIONS,
    DEFAULT_EASING_DEFINITIONS,
    DEFAULT_DELAY_NAMESPACE,
    DEFAULT_EXTENT_NAMESPACE,
    DEFAULT_PERIOD_NAMESPACE,
    DEFAULT_MOTION_SEMANTIC_MAPPINGS,
    DEFAULT_KEYFRAME_DEFINITIONS,
    DEFAULT_ANIMATION_DEFINITIONS,
    DEFAULT_MOTION_COMPOSITE_PRESETS,
    cells,
  );
}

function cellToken(name: string) {
  const token = emitMotion().tokens.find((t) => t.name === `motion-cell-${name}`);
  if (!token) throw new Error(`no motion-cell token named "${name}"`);
  return token;
}

/** The spec a cell token carries, as the exporter reads it. */
const CellSpecSchema = z.object({
  keyframe: z.string(),
  duration: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('tier'), tier: z.string() }),
    z.object({ kind: z.literal('period'), period: z.string() }),
  ]),
  curve: z.string().optional(),
});

function specOf(name: string): z.infer<typeof CellSpecSchema> {
  const value = cellToken(name).value;
  expect(typeof value).toBe('string');
  return CellSpecSchema.parse(JSON.parse(String(value)));
}

describe('motion cells: the period form (#2154)', () => {
  it('a looping cell carries a period, not a tier, and names no curve', () => {
    const spec = specOf('skeleton-root-waiting');
    expect(spec.duration).toEqual({ kind: 'period', period: 'shimmer' });
    // Every period row in the matrix declares curve {"kind":"none"}. A curve
    // here would be an assignment no cell made -- the class of error the
    // `scaleStart = 1/ratio^0.25` deletion is on record for.
    expect(spec.curve).toBeUndefined();
  });

  it('a looping cell depends on the period leaf and on no duration or ease leaf', () => {
    const token = cellToken('spinner-root-busy');
    expect(token.dependsOn).toEqual(['motion-keyframe-spin', 'rafters-period-spin']);
  });

  it('a looping cell is NOT reduced-motion aware -- loops slow, they never stop', () => {
    // The metadata has to agree with the CSS. The exporter reads this field to
    // decide whether the zeroing block is attached, including on a pinned cell
    // whose JSON spec has been overwritten with a shorthand.
    expect(cellToken('spinner-root-busy').reducedMotionAware).toBe(false);
    expect(cellToken('progress-root-indeterminate').reducedMotionAware).toBe(false);
    expect(cellToken('input-otp-caret-idle').reducedMotionAware).toBe(false);
    expect(cellToken('skeleton-root-waiting').reducedMotionAware).toBe(false);
  });

  it('a tier cell still carries its tier and curve, and stays reduced-motion aware', () => {
    const spec = specOf('dialog-content-open');
    expect(spec.duration).toEqual({ kind: 'tier', tier: 'normal' });
    expect(spec.curve).toBe('enter');
    expect(cellToken('dialog-content-open').reducedMotionAware).toBe(true);
    expect(cellToken('dialog-content-open').dependsOn).toEqual([
      'motion-keyframe-scale-in',
      'rafters-duration-normal',
      'rafters-ease-enter',
    ]);
  });
});

describe('motion cells: a cell that cannot be represented fails the build', () => {
  const base = DEFAULT_MOTION_CELL_ANIMATIONS['dialog-content-open'] as MotionCellAnimation;

  it('throws on an unrecognized duration.kind, naming the cell coordinates', () => {
    // Silent fallback to a default duration is the failure this guards: an
    // unrepresented cell would compile as if it had a value.
    const malformed = {
      ...base,
      duration: { kind: 'ratio', ratio: 1.2 },
    } as unknown as MotionCellAnimation;

    let message = '';
    try {
      emitMotion({ malformed });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toMatch(/duration\.kind/);
    expect(message).toContain('(dialog, content, closed -> open)');
    expect(message).toContain('period, tier');
  });

  it('throws on an unknown period member, the way an unknown tier already does', () => {
    const cells = {
      typo: {
        keyframe: 'spin',
        duration: { kind: 'period', period: 'shimmr' },
        cell: { component: 'spinner', part: 'root', transition: 'busy' },
        meaning: 'test',
        contexts: ['test'],
      },
    } satisfies Record<string, MotionCellAnimation>;
    expect(() => emitMotion(cells)).toThrowError(/unknown period "shimmr"/);
  });

  it('throws when a tier cell omits the curve -- only a loop may', () => {
    const cells = {
      curveless: {
        keyframe: 'fade-in',
        duration: { kind: 'tier', tier: 'fast' },
        // Deliberately not a real matrix row -- this fixture is about the
        // generator's refusal, not about any moment the matrix declares.
        cell: { component: 'test-component', part: 'root', transition: 'appear' },
        meaning: 'test',
        contexts: ['test'],
      },
    } satisfies Record<string, MotionCellAnimation>;
    expect(() => emitMotion(cells)).toThrowError(/tier-kind cell with no curve/);
  });
});

// ===========================================================================
// MATRIX CONFORMANCE. The cells consumed here are read against the cells
// ASSIGNED in motion.jsonl, which is the source of record and is never edited
// from this side.
// ===========================================================================

const MATRIX_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../ui/docs/spec/matrix/motion.jsonl',
);

/** Only the columns this conformance check reads. The full schema lives in ui. */
const MatrixRowSchema = z.object({
  component: z.string(),
  part: z.string(),
  transition: z.string(),
  duration: z.looseObject({
    kind: z.string(),
    tier: z.string().optional(),
    period: z.string().optional(),
  }),
  curve: z.looseObject({ kind: z.string(), role: z.string().optional() }),
});

function matrixRows(): z.infer<typeof MatrixRowSchema>[] {
  const text = readFileSync(MATRIX_PATH, 'utf8');
  return text
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line, index) => {
      const parsed: unknown = JSON.parse(line);
      const result = MatrixRowSchema.safeParse(parsed);
      if (!result.success) {
        throw new Error(`motion.jsonl line ${index + 1}: ${result.error.issues[0]?.message ?? ''}`);
      }
      return result.data;
    });
}

const rowKey = (row: { component: string; part: string; transition: string }) =>
  `${row.component} | ${row.part} | ${row.transition}`;

/**
 * Why a row that motion.jsonl assigns has no cell here. One of these six, and
 * the categories are the predicate written above DEFAULT_MOTION_CELL_ANIMATIONS
 * -- this is where the rows in each category are named.
 */
type ExclusionReason =
  /** duration.kind is pointer-rule / follows / none: the row assigns no animation. */
  | 'notAnimated'
  /** A state change on a part that stays mounted. `motion-semantic-*` owns it. */
  | 'notAPresenceChange'
  /** Declared properties intersect neither `opacity` nor `transform: scale`. */
  | 'noIntersectingProperty'
  /** Movement that needs a side or a DOM-relative distance no keyframe or extent names. */
  | 'noExistingShape'
  /** `opacity` + `grid-rows / height`: a cell would double-drive opacity against motion-expand/collapse. */
  | 'carriedByExpandCollapse'
  /** Opacity already transitions via a `motion-*-in`/`-out` semantic token; a keyframe cell would double-drive it and the animation would win. */
  | 'carriedBySemanticTransition'
  /** The matrix runs ahead of packages/ui/src/components -- there is no component to style. */
  | 'noComponentDirectory';

/**
 * EVERY ROW motion.jsonl ASSIGNS THAT THIS PACKAGE DOES NOT CONSUME, enumerated
 * rather than derived.
 *
 * Derived would be worse: a rule that recomputes "no intersecting property" from
 * the row would let a new matrix row classify itself and pass silently, which is
 * exactly the gate this list exists to hold. Enumerated, a new row fails CI until
 * somebody either writes a cell for it or writes it down here with a reason, and
 * a row that leaves the matrix fails until its line here goes too.
 */
const EXCLUDED_ROWS: Record<ExclusionReason, readonly string[]> = {
  notAnimated: [
    'drawer | content | dragging',
    'dropdown-menu | items | enter',
    'context-menu | items | enter',
    'select | items | enter',
    'combobox | items | enter',
    'command | items | enter',
    'checkbox | root/indicator | check sequence',
    'scroll-area | thumb | drag',
    'resizable | panels | dragging',
    'slider | thumb | dragging',
    'slider | range fill | follows thumb',
    'carousel | track | swipe',
  ],
  notAPresenceChange: [
    'dialog | close button | hover',
    'sheet | close button | hover',
    'drawer | close button | hover',
    'popover | close button | hover',
    // The four rows added when the sweep found these moments running on
    // Tailwind's stock 150ms with no row to assign them a tier. Every one is a
    // state change on a part that stays mounted -- a control recolouring, a dot
    // strip recolouring, a ring appearing on focus, a chevron rotating -- so
    // each is consumed as composed generics in its classes file and none names a
    // keyframe. Same ground as the close-button rows above.
    'carousel | control | hover',
    'carousel | indicator | active change',
    'combobox | input | focus',
    'combobox | chevron | open <-> closed',
    // The list container stays mounted; per-item entrance is the stagger axis (#2156).
    'command | items | filter change',
    'checkbox | indicator | unchecked <-> checked',
    'radio-group | indicator | unchecked <-> checked',
    'checkbox | root | press',
    'switch | root | press',
    'toggle | root | press',
    'toggle-group | item | press',
    'button | root | press',
    'button | content | idle <-> busy',
    'slider | thumb | grab',
    // #2152 (spec correction 2026-08-28): packages/design-tokens gains no
    // entry for these two rows, full stop -- the issue's spec correction rules
    // that the subcontent cells are consumed as transition tokens directly in
    // context-menu.classes.ts, not as named `DEFAULT_MOTION_CELL_ANIMATIONS`
    // entries; a branch that added them was told to remove them. That is the
    // exclusion's actual ground; it does not turn on presence.
    //
    // (For WC/Astro, subcontent does stay permanently mounted --
    // context-menu-sub.astro never sets `hidden` -- so open/close is a state
    // change on a mounted part there. React's ContextMenuSubContent diverges:
    // it unmounts via `usePresence` once the close transition ends, so for
    // that performance this IS a presence change, same as its sibling
    // anchored-popup cells (tooltip-content-open, popover-content-open, ...).
    // The exclusion holds regardless, per the spec correction above -- not
    // because the part is uniformly non-presence across all three
    // performances.) The reveal itself is a CSS `transition` with a
    // per-selector `transition-delay` scoped by `data-open-source` (pointer vs.
    // keyboard/click), which the cell vocabulary has no member for -- so it
    // rides the generic leaves directly (`duration-fast`/`ease-exit` closed,
    // `duration-moderate`/`ease-enter`/`delay-hover-intent`/`extent-pop` open).
    'context-menu | subcontent | closed -> open',
    'context-menu | subcontent | open -> closed',
    // #2228 ruling: chart-tooltip's content panel is consumed as
    // duration-*/ease-* transition generics directly via
    // tooltipContentSurfaceClasses (chart-tooltip.classes.ts reuses
    // tooltip.classes.ts's content-panel decoration verbatim -- see that
    // file's own doc comment), not as a named `DEFAULT_MOTION_CELL_ANIMATIONS`
    // entry -- same ground as the context-menu subcontent exclusion above,
    // not this file inventing a new reason. chart-tooltip.test.ts:237 asserts
    // no `animate-*` keyframe class appears on the content panel; a branch
    // that added `chart-tooltip-content-open`/`-close` cells here was
    // producing two dead `animate-chart-tooltip-content-*` utilities nothing
    // consumes, corrected by this exclusion instead.
    'chart-tooltip | content | closed -> open',
    'chart-tooltip | content | open -> closed',
  ],
  noIntersectingProperty: [
    'accordion | chevron | open <-> closed',
    'dropdown-menu | items | highlight move',
    'context-menu | items | highlight move',
    // Declares no properties at all, so there is nothing to intersect.
    'navigation-menu | panel | open -> open (item change)',
    'select | items | highlight move',
    'select | items | selected check',
    'select | chevron | open <-> closed',
    'combobox | items | highlight move',
    'combobox | items | selected check',
    'command | items | highlight move',
    'checkbox | root | unchecked <-> checked',
    'radio-group | item | unchecked <-> checked',
    'switch | track | off <-> on',
    'toggle | root | off <-> on',
    'toggle-group | item | off <-> on',
    'button | root | hover',
    'pagination | link | current change',
    'sidebar | item | active change',
    'breadcrumb | link | hover',
    'pagination | link | hover',
    'item | root | hover',
    'table | row | hover',
    'table | row | selected <-> unselected',
    'card | root | hover (when interactive)',
    'scroll-area | scrollbar | hover',
    'resizable | handle | hover / active',
    'accordion | trigger | hover',
    'collapsible | trigger | hover',
    'tabs | trigger | hover',
    'select | trigger | hover',
    'navigation-menu | trigger | hover',
    'sidebar | item | hover',
    'slider | thumb | hover',
    // Declares ['background, text, border'] only, same as navigation-menu trigger hover above.
    'badge | root | hover',
    'input | root | focus',
    'input | root | valid <-> invalid',
    'textarea | root | focus',
    'textarea | root | valid <-> invalid',
    'input-group | root | focus',
    'input-otp | slot | focus',
    'input-otp | active slot | advance',
    'progress | fill | value change',
    'calendar | day cell | hover',
    'calendar | day cell | selected <-> unselected',
    'calendar | range | range change',
    'avatar | image -> fallback | error',
  ],
  noExistingShape: [
    'tabs | indicator | active change',
    'drawer | content | closed -> open',
    'drawer | content | open -> closed',
    'drawer | content | settle on release',
    'switch | thumb | off <-> on',
    'resizable | panels | keyboard step',
    'slider | thumb | keyboard step',
    'carousel | track | index change',
    'carousel | track | settle on release',
    'sidebar | root | expand',
    'sidebar | root | collapse',
  ],
  // These six declare ['opacity', 'grid-rows / height']. No keyframe expresses
  // grid-template-rows, so the moment runs as a transition, and
  // motion-expand/motion-collapse already transition BOTH properties. A cell for
  // the opacity half would put an animation and a transition on one property at
  // once, and the animation wins. Not a claim about overlapping property lists
  // generally -- modal-in overlaps dialog-content-open and that row is covered,
  // because its other half is a shape.
  carriedByExpandCollapse: [
    'accordion | content | closed -> open',
    'accordion | content | open -> closed',
    'collapsible | content | closed -> open',
    'collapsible | content | open -> closed',
    'field | message | appear',
    'field | message | disappear',
  ],
  // Declares ['opacity'] only, but color-picker.classes.ts already transitions
  // it via the motion-dropdown-in/motion-dropdown-out semantic token
  // (opacity-0 <-> data-[state=open]:opacity-100, with starting:opacity-0 for
  // the mount case). A keyframe cell here would put an animation and a
  // transition on the same property at once, and the animation wins -- the
  // same double-drive carriedByExpandCollapse guards against, on a different
  // mechanism. command | content | closed -> open is the same shape (fade,
  // opacity, tier moderate, curve enter) and IS a cell, because command does
  // not carry its fade via a semantic transition token.
  carriedBySemanticTransition: [
    'color-picker | root | closed -> open',
    'color-picker | root | open -> closed',
  ],
  // Verified against packages/ui/src/components: no menubar, no date-picker.
  noComponentDirectory: [
    'menubar | content | closed -> open',
    'menubar | content | open -> closed',
    'menubar | items | enter',
    'menubar | items | highlight move',
    'menubar | trigger | hover',
    'date-picker | content | closed -> open',
    'date-picker | content | open -> closed',
  ],
};

describe('motion cells: matrix conformance', () => {
  it('every consumed cell names a row that exists in motion.jsonl', () => {
    // The direction that catches a transcription error: a cell invented here,
    // or one whose transition string drifted from the matrix's wording, would
    // emit a utility for a moment no component has.
    const assigned = new Set(matrixRows().map(rowKey));
    const orphans = Object.entries(DEFAULT_MOTION_CELL_ANIMATIONS)
      .filter(([, cell]) => !assigned.has(rowKey(cell.cell)))
      .map(([name]) => name);
    expect(orphans).toEqual([]);
  });

  it('every period-kind row in motion.jsonl is consumed', () => {
    // The loop set on its own: four rows, four cells. The exclusion allowlist
    // below closes the same direction for every other row, but a loop with no
    // cell has no compiled CSS at all, so it gets its own named failure.
    const consumed = new Set(
      Object.values(DEFAULT_MOTION_CELL_ANIMATIONS).map((cell) => rowKey(cell.cell)),
    );
    const missing = matrixRows()
      .filter((row) => row.duration.kind === 'period')
      .map(rowKey)
      .filter((key) => !consumed.has(key));
    expect(missing).toEqual([]);
  });

  it('the rows left uncovered are EXACTLY the enumerated exclusions', () => {
    // The tier direction of the both-directions diff, closed in code rather than
    // left to the doc comment. Both failure modes land here: a matrix row with
    // neither a cell nor a written reason, and an exclusion line that outlived
    // the row or the cell it was written for.
    const consumed = new Set(
      Object.values(DEFAULT_MOTION_CELL_ANIMATIONS)
        .map((cell) => cell.cell)
        .map(rowKey),
    );
    const uncovered = matrixRows()
      .map(rowKey)
      .filter((key) => !consumed.has(key))
      .sort();
    const excluded = Object.values(EXCLUDED_ROWS).flat().toSorted();
    expect(uncovered).toEqual(excluded);
  });

  it('no row is written down twice, in one reason or across two', () => {
    // A duplicate would make the set-equality above pass or fail for the wrong
    // reason, and two reasons for one row is two stories.
    const excluded = Object.values(EXCLUDED_ROWS).flat();
    const duplicates = excluded.filter((key, index) => excluded.indexOf(key) !== index);
    expect(duplicates).toEqual([]);
  });

  it('every consumed cell carries the assignment its row declares, member for member', () => {
    // Reading the assignment off the row rather than trusting the entry. A
    // period row transcribed as a tier would run once and stop; a tier or curve
    // that drifted from the row is the #2012 defect returning by hand.
    const byKey = new Map(matrixRows().map((row) => [rowKey(row), row] as const));
    for (const [name, cell] of Object.entries(DEFAULT_MOTION_CELL_ANIMATIONS)) {
      const row = byKey.get(rowKey(cell.cell));
      expect(row, `${name} names no matrix row`).toBeDefined();
      if (!row) continue;
      expect(cell.duration.kind, `${name} disagrees with its row on duration kind`).toBe(
        row.duration.kind,
      );
      if (cell.duration.kind === 'tier') {
        expect(cell.duration.tier, `${name} is not on its assigned tier`).toBe(row.duration.tier);
        expect(cell.curve, `${name} is not on its assigned curve`).toBe(row.curve.role);
      } else {
        expect(cell.duration.period, `${name} is not on its assigned period`).toBe(
          row.duration.period,
        );
        // The row declares curve {"kind":"none"}, so there is nothing to name.
        expect(row.curve.kind, `${name}'s row declares a curve after all`).toBe('none');
        expect(cell.curve, `${name} invented a curve its row does not assign`).toBeUndefined();
      }
    }
  });
});
