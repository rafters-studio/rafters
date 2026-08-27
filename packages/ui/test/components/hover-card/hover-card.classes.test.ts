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
    expect(classes.content).toContain('opacity-0');
    expect(classes.content).toContain('pointer-events-none');
    expect(classes.content).toContain('duration-fast');
    expect(classes.content).toContain('ease-exit');
    // Scoped away from a forced-open card on purpose: the linger is the CLOSE
    // cell's, and the data-state path carries no delay of its own, so an
    // unscoped `delay-linger` would become the delay a controlled open waits
    // out -- 300ms, slower than the hover-intent it replaced.
    expect(classes.content).toContain('[&:not([data-state=open])]:delay-linger');
  });

  it('pointer-events rides the transition, so the linger is not click-through', () => {
    // A reveal rule that owns pointer-events makes the panel inert the instant
    // `:hover` drops -- for hover-card that is the whole 300ms linger, fully
    // opaque and fully un-enterable, which defeats the only reason the linger
    // exists. On a discrete transition it flips at the fade's halfway point.
    expect(classes.content).toContain('transition-[opacity,pointer-events]');
    expect(classes.content).toContain('transition-discrete');
    expect(classes.content).toContain(
      '[:is([data-hover-card]:has(>[data-part=trigger]:is(:hover,:focus-visible)),[data-hover-card]:not([data-disable-hoverable-content=true]):hover)>&]:transition-opacity',
    );
    expect(classes.content).toContain('data-[state=open]:transition-opacity');
  });

  it('opens on the moderate/enter cell with the hover-intent delay', () => {
    for (const utility of [
      'opacity-100',
      'pointer-events-auto',
      'duration-moderate',
      'ease-enter',
      'delay-hover-intent',
    ]) {
      expect(classes.content).toContain(
        `[:is([data-hover-card]:has(>[data-part=trigger]:is(:hover,:focus-visible)),[data-hover-card]:not([data-disable-hoverable-content=true]):hover)>&]:${utility}`,
      );
    }
  });

  it('a forced-open card reveals on the same cell but WITHOUT a delay', () => {
    // Same reading as tooltip's: the data-state path is a consumer forcing
    // `open` true, which is intent already declared -- there is nothing for
    // hover-intent to filter. The hover path keeps its delay regardless, at
    // (0,4,0) against this rule's (0,2,0).
    for (const utility of ['opacity-100', 'pointer-events-auto', 'duration-moderate', 'ease-enter'])
      expect(classes.content).toContain(`data-[state=open]:${utility}`);
    expect(classes.content).not.toContain('data-[state=open]:delay-hover-intent');
    expect(classes.content).not.toContain('data-[state=open]:delay-linger');
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
