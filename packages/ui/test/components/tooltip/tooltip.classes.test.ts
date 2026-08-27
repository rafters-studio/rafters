import { describe, expect, it } from 'vitest';
import { tooltip } from '../../../src/components/tooltip/tooltip.behavior';
import { tooltipClasses } from '../../../src/components/tooltip/tooltip.classes';

const config = {};
const classes = tooltipClasses(config, tooltip.initialState(config));

/**
 * The CLASS-STRING half of the motion contract (#2148). This file pins the
 * candidates the stylesheet is compiled from; `test/motion/hover-reveal.e2e.ts`
 * pins the DESUGARED rules those candidates produce, driven with JavaScript
 * disabled in a real browser. Neither half proves the other -- Tailwind emits
 * nothing at all for a malformed candidate, silently -- so both are pinned and
 * they meet at the utility names below.
 */
describe('tooltip classes', () => {
  it('the tip sits on the tooltip depth token, never a raw z-index', () => {
    expect(classes.content).toContain('z-depth-tooltip');
    expect(classes.content).not.toMatch(/\bz-\d/);
  });

  it('fills with the inverted foreground surface (fill, not background props)', () => {
    expect(classes.content).toContain('bg-foreground');
    expect(classes.content).toContain('text-background');
  });

  it('is out of flow, so an always-rendered tip reserves no layout space', () => {
    // The content is no longer `hidden` and no longer conditionally mounted, so
    // in normal flow it would push the page around on a JS-off render.
    expect(classes.content).toContain('fixed');
  });

  it('closes on the fast/exit cell with NO delay reference of any kind', () => {
    // The base (unqualified) rule IS the open -> closed cell: motion.jsonl gives
    // tooltip's close `fast` + `exit` and an empty `delays` array.
    expect(classes.content).toContain('transition-opacity');
    expect(classes.content).toContain('opacity-0');
    expect(classes.content).toContain('pointer-events-none');
    expect(classes.content).toContain('duration-fast');
    expect(classes.content).toContain('ease-exit');
    // A tooltip does not linger. That generic belongs to hover-card's close.
    expect(classes.content).not.toContain('delay-linger');
    expect(classes.content).not.toContain('delay-skip');
  });

  it('opens on the moderate/enter cell with the hover-intent delay', () => {
    for (const utility of [
      'opacity-100',
      'pointer-events-auto',
      'duration-moderate',
      'ease-enter',
      'delay-hover-intent',
    ]) {
      // Once through the native hover/focus-visible reveal...
      expect(classes.content).toContain(
        `[:is([data-tooltip]:has(>[data-part=trigger]:is(:hover,:focus-visible)),[data-tooltip]:not([data-disable-hoverable-content=true]):hover)>&]:${utility}`,
      );
      // ...and once through the score-driven, controlled-open path.
      expect(classes.content).toContain(`data-[state=open]:${utility}`);
    }
  });

  it('an Escape dismissal force-hides the tip even while the pointer stays', () => {
    expect(classes.content).toContain('[[data-tooltip][data-dismissed=true]>&]:opacity-0!');
    expect(classes.content).toContain(
      '[[data-tooltip][data-dismissed=true]>&]:pointer-events-none!',
    );
  });

  it('states no timing as a literal and queries reduced motion nowhere', () => {
    // Every duration, curve, and delay is a token utility; the sheet zeroes the
    // duration/delay namespaces under prefers-reduced-motion itself.
    expect(classes.content).not.toMatch(/\b(duration|delay)-\d/);
    expect(classes.content).not.toContain('motion-reduce');
  });

  it('the trigger is a bare inline flex anchor', () => {
    expect(classes.trigger).toBe('inline-flex');
  });
});
