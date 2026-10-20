/**
 * A top-level link matches the trigger beside it (#2659). The browser test page
 * loads no compiled Tailwind sheet, so the computed-style equality is proven
 * here against the REAL sheet compiled from the component directory: every
 * scoped candidate on the link compiled, it is scoped to a link directly in the
 * bar item (`li > a`), and its declarations equal the trigger's own utility.
 */
import { describe, expect, it } from 'vitest';
import { navigationMenu } from '../../../src/components/navigation-menu/navigation-menu.behavior';
import { navigationMenuClasses } from '../../../src/components/navigation-menu/navigation-menu.classes';
import { componentSheet, escapeCandidate } from '../../motion/component-sheet';

const classes = navigationMenuClasses({}, navigationMenu.initialState({}));

/** The trigger utilities the bar link must share: type role, height, alignment. */
const SHARED = [
  'inline-grid',
  'grid-flow-col',
  'items-center',
  'h-11',
  'px-4',
  'py-2',
  'text-label-medium',
  'ts-label-medium',
];

/** The body of the first rule whose selector starts with this selector text. */
const ruleBody = (css: string, selector: string): string => {
  const at = css.indexOf(`${selector}{`);
  if (at < 0) return '';
  const start = at + selector.length + 1;
  return css.slice(start, css.indexOf('}', start));
};

describe('navigation-menu bar link matches the trigger (#2659)', () => {
  it('the link carries every shared trigger utility, scoped to a link directly in the item', () => {
    const link = classes.link.split(/\s+/);
    const trigger = classes.trigger.split(/\s+/);
    for (const utility of SHARED) {
      expect(trigger).toContain(utility);
      expect(link).toContain(`[li>&]:${utility}`);
    }
    expect(trigger).toContain('@md:h-10');
    expect(link).toContain('@md:[li>&]:h-10');
  });

  it('a panel link keeps the stacked layout and no unscoped type role', () => {
    const link = classes.link.split(/\s+/);
    expect(link).toContain('block');
    expect(link).toContain('space-y-1');
    expect(link).not.toContain('text-label-medium');
    expect(link).not.toContain('ts-label-medium');
    expect(link).not.toContain('h-11');
  });

  it('each scoped candidate compiles to the trigger utility, scoped to li > a', async () => {
    const css = await componentSheet('navigation-menu');
    for (const utility of SHARED) {
      const scoped = ruleBody(css, `li>${escapeCandidate(`[li>&]:${utility}`)}`);
      expect(scoped, `[li>&]:${utility}`).not.toBe('');
      expect(scoped, `[li>&]:${utility}`).toBe(ruleBody(css, escapeCandidate(utility)));
    }
    expect(css).toContain(`li>${escapeCandidate('@md:[li>&]:h-10')}`);
  }, 120_000);
});
