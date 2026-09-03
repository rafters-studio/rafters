import { describe, expect, it } from 'vitest';
import { popover } from '../../../src/components/popover/popover.behavior';
import { popoverClasses } from '../../../src/components/popover/popover.classes';

const config = {};
const classes = popoverClasses(config, popover.initialState(config));

describe('popover classes', () => {
  it('the panel sits on the popover depth token and fills with popover surface tokens', () => {
    expect(classes.content).toContain('z-depth-popover');
    expect(classes.content).toContain('bg-popover');
    expect(classes.content).toContain('text-popover-foreground');
  });

  it('enter/exit are the popover CELLS, keyed off data-state (#1996 / #2017)', () => {
    // The cell is the spec: popover / content / closed -> open and open ->
    // closed, each with its own tier and curve. A shared animate-scale-in here
    // was the #2012 defect -- three distinct cells collapsed into one.
    expect(classes.content).toContain('data-[state=open]:animate-scale-in-moderate-enter');
    expect(classes.content).toContain('data-[state=closed]:animate-scale-out-fast-exit');
    expect(classes.content.split(/[\s:]+/)).not.toContain('animate-scale-in');
    expect(classes.content.split(/[\s:]+/)).not.toContain('animate-scale-out');
  });

  it('uses no @starting-style and no tailwindcss-animate vocabulary', () => {
    // Presence animates a node that MOUNTS with its keyframe, so the
    // transitions-on-mount hack is unnecessary; the ruling forbids it outright.
    expect(classes.content).not.toContain('starting-style');
    expect(classes.content).not.toContain('transition-behavior');
    expect(classes.content).not.toContain('animate-in');
    expect(classes.content).not.toContain('animate-out');
    expect(classes.content).not.toContain('zoom-in-95');
  });

  it('motion respects reduced-motion, and does NOT do it with animate-none', () => {
    // Mechanism B (#2017): the generated cell utility zeroes animation-duration
    // under the media query. `motion-reduce:animate-none` must NOT appear here
    // -- `animation: none` resets the shorthand, so wherever it wins it discards
    // the zeroed duration, and it removes the animation rather than completing
    // it, so the keyframe's end state is never reached.
    expect(classes.content).not.toContain('motion-reduce:animate-none');
    // The close control is a TRANSITION, not a keyframe, and transition-none is
    // still its correct reduced-motion path.
    expect(classes.close).toContain('motion-reduce:transition-none');
  });

  it('the close control carries its hover row: fast, standard', () => {
    // motion.jsonl: popover / close button / hover -- fade + color,
    // duration-fast, ease-standard. The tier was already named; the curve is
    // what this fix adds. The row's COLOR half has no moment on this control --
    // the hover moves opacity alone -- and inventing a hover colour to fill it
    // would be a design decision, so the gap is reported in the source instead.
    expect(classes.close).toContain('transition-opacity');
    expect(classes.close).toContain('duration-fast');
    expect(classes.close).toContain('ease-standard');
    expect(classes.close).toContain('hover:opacity-100');
  });

  it('no literal duration, delay or easing value appears anywhere', () => {
    for (const value of Object.values(classes)) {
      expect(value).not.toMatch(/\b(duration|delay)-\[?\d/);
      expect(value).not.toContain('ease-[');
    }
  });

  it('the close control honors the touch floor and scales down via CQ', () => {
    expect(classes.close).toContain('h-11');
    expect(classes.close).toContain('@md:h-8');
    expect(classes.closeIcon).toContain('h-5');
    expect(classes.closeIcon).toContain('@md:h-4');
  });
});
