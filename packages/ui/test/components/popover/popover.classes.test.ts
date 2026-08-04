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

  it('enter/exit are keyframes keyed off data-state (the presence contract)', () => {
    expect(classes.content).toContain('data-[state=open]:animate-scale-in');
    expect(classes.content).toContain('data-[state=closed]:animate-scale-out');
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

  it('motion respects reduced-motion', () => {
    // animate-none, not a zeroed duration: the duration-* utilities set
    // transition-duration and cannot zero a keyframe animation.
    expect(classes.content).toContain('motion-reduce:animate-none');
    expect(classes.close).toContain('motion-reduce:transition-none');
  });

  it('the close control honors the touch floor and scales down via CQ', () => {
    expect(classes.close).toContain('h-11');
    expect(classes.close).toContain('@md:h-8');
    expect(classes.closeIcon).toContain('h-5');
    expect(classes.closeIcon).toContain('@md:h-4');
  });
});
