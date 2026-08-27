import { describe, expect, it } from 'vitest';
import { hoverCard } from '../../../src/components/hover-card/hover-card.behavior';
import { hoverCardClasses } from '../../../src/components/hover-card/hover-card.classes';

const config = {};
const classes = hoverCardClasses(config, hoverCard.initialState(config));

/**
 * The CLASS-STRING half of the motion contract (#2148). This file pins the
 * candidates the stylesheet is compiled from; `test/motion/hover-reveal.e2e.ts`
 * pins the DESUGARED rules those candidates produce, driven with JavaScript
 * disabled in a real browser. Neither half proves the other -- Tailwind emits
 * nothing at all for a malformed candidate, silently -- so both are pinned and
 * they meet at the utility names below.
 */
describe('hover-card classes', () => {
  it('the panel sits on the popover depth token, never a raw z-index', () => {
    expect(classes.content).toContain('z-depth-popover');
    expect(classes.content).not.toMatch(/\bz-\d/);
  });

  it('fills with the popover surface tokens (fill, not background props)', () => {
    expect(classes.content).toContain('bg-popover');
    expect(classes.content).toContain('text-popover-foreground');
  });

  it('is out of flow, so an always-rendered preview reserves no layout space', () => {
    expect(classes.content).toContain('fixed');
  });

  it('is the ONE of the three whose close carries a linger', () => {
    // motion.jsonl gives hover-card / content / "open -> closed" fast + exit
    // PLUS the `linger` delay generic. Tooltip's and navigation-menu's close
    // cells carry no delay at all; this one does, and that asymmetry is the
    // matrix's judgement, not this file's.
    expect(classes.content).toContain('transition-opacity');
    expect(classes.content).toContain('opacity-0');
    expect(classes.content).toContain('pointer-events-none');
    expect(classes.content).toContain('duration-fast');
    expect(classes.content).toContain('ease-exit');
    expect(classes.content).toContain('delay-linger');
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
        `[:is([data-hover-card]:has(>[data-part=trigger]:is(:hover,:focus-visible)),[data-hover-card]:not([data-disable-hoverable-content=true]):hover)>&]:${utility}`,
      );
      // ...and once through the score-driven, controlled-open path.
      expect(classes.content).toContain(`data-[state=open]:${utility}`);
    }
  });

  it('an Escape dismissal force-hides the preview even while the pointer stays', () => {
    expect(classes.content).toContain('[[data-hover-card][data-dismissed=true]>&]:opacity-0!');
    expect(classes.content).toContain(
      '[[data-hover-card][data-dismissed=true]>&]:pointer-events-none!',
    );
  });

  it('drops the tailwindcss-animate vocabulary this repo does not ship', () => {
    for (const dead of [
      'animate-in',
      'animate-out',
      'fade-in-0',
      'zoom-in-95',
      'slide-in-from-top-2',
    ]) {
      expect(classes.content).not.toContain(dead);
    }
  });

  it('states no timing as a literal and queries reduced motion nowhere', () => {
    expect(classes.content).not.toMatch(/\b(duration|delay)-\d/);
    expect(classes.content).not.toContain('motion-reduce');
  });

  it('the trigger is a bare inline-flex anchor', () => {
    expect(classes.trigger).toBe('inline-flex');
  });
});
