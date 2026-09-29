/**
 * date-picker's content motion (#2282) compiles, and compiles in an order that
 * keeps the rows' timing.
 *
 * `date-picker.classes.test.ts` pins the candidate strings; this points the
 * REAL Tailwind CLI at the REAL component directory (`component-sheet.ts`, the
 * harness `reveal-candidates.test.ts` also uses) and checks the emitted sheet. Two properties:
 *  1. every content candidate became a rule (Tailwind drops a malformed one
 *     silently);
 *  2. the bare `transition` utility sorts BEFORE `duration-fast` and
 *     `ease-exit`. `transition` re-states `transition-duration` and
 *     `transition-timing-function` from its `--tw-*` fallbacks, and this repo's
 *     generated `duration-*` / `ease-*` utilities set the longhands directly.
 *     Same specificity, so the later rule wins: were `transition` to sort after
 *     them, the exit row would collapse onto Tailwind's defaults with every
 *     string test still green.
 * It also pins that `transition` leaves `left`/`top` out: the shared placement
 * (`positionPopover` -> `placeFloating`, #2403) writes the popup's position
 * there, so the placement never animates with the zoom.
 */
import { describe, expect, it } from 'vitest';
import { datePicker } from '../../src/components/date-picker/date-picker.behavior';
import { datePickerClasses } from '../../src/components/date-picker/date-picker.classes';
import { componentSheet, escapeCandidate } from './component-sheet';

const config = { mode: 'single' } as const;
const CONTENT = datePickerClasses(config, datePicker.initialState(config)).content;

const sheet = (): Promise<string> => componentSheet('date-picker');

/** The body of the first rule whose selector is exactly `selector`. */
const ruleBody = (css: string, selector: string): string => {
  const at = css.indexOf(`${selector}{`);
  if (at < 0) return '';
  const start = css.indexOf('{', at);
  return css.slice(start + 1, css.indexOf('}', start));
};

describe('date-picker content motion compiles (#2282)', () => {
  it('every content candidate became a real rule', async () => {
    const css = await sheet();
    const missing = CONTENT.split(' ')
      .filter(Boolean)
      .filter((candidate) => !css.includes(escapeCandidate(candidate)));
    expect(missing, 'candidates Tailwind silently emitted nothing for').toEqual([]);
  }, 120_000);

  it('the zoom reads the extent-pop alias back', async () => {
    const css = await sheet();
    expect(css).toContain('.extent-pop{--rafters-consumed-extent:var(--rafters-extent-pop)}');
    expect(css).toContain('scale:var(--rafters-consumed-extent)');
  }, 120_000);

  it('the transition covers opacity and scale, never the left/top placement', async () => {
    const css = await sheet();
    const body = ruleBody(css, '.transition');
    const property = /transition-property:([^;]+)/.exec(body)?.[1] ?? '';
    const list = property.split(',').map((name) => name.trim());
    expect(list).toContain('opacity');
    expect(list).toContain('scale');
    expect(list).not.toContain('left');
    expect(list).not.toContain('top');
    expect(list).not.toContain('all');
  }, 120_000);

  it('the transition utility sorts before the timing it would otherwise override', async () => {
    const css = await sheet();
    const transitionAt = css.indexOf('.transition{');
    expect(transitionAt).toBeGreaterThanOrEqual(0);
    for (const timing of ['duration-fast', 'ease-exit']) {
      const at = css.indexOf(`${escapeCandidate(timing)}{`);
      expect(at, `${timing} rule missing`).toBeGreaterThanOrEqual(0);
      expect(transitionAt, `transition sorts after ${timing}`).toBeLessThan(at);
    }
  }, 120_000);
});
