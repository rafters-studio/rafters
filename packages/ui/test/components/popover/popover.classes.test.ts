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

  it('enter/exit runs through the semantic motion layer', () => {
    expect(classes.content).toContain('data-[state=open]:motion-dropdown-in');
    expect(classes.content).toContain('data-[state=closed]:motion-dropdown-out');
  });

  it('states both transition endpoints, since a transition has no implicit start frame', () => {
    expect(classes.content).toContain('data-[state=open]:opacity-100');
    expect(classes.content).toContain('data-[state=closed]:opacity-0');
  });

  it('references no animation utility this system does not define', () => {
    // The regression this file exists to stop. These were tailwindcss-animate
    // utilities, and that package is not a dependency of any workspace -- so the
    // panel had no transition at all while appearing to declare six of them.
    for (const dead of [
      'animate-in',
      'animate-out',
      'fade-in-0',
      'fade-out-0',
      'zoom-in-95',
      'zoom-out-95',
      'slide-in-from-top-2',
      'slide-in-from-bottom-2',
      'slide-in-from-left-2',
      'slide-in-from-right-2',
    ]) {
      expect(classes.content).not.toContain(dead);
    }
  });

  it('writes no raw duration, leaving the tier to the token layer', () => {
    for (const set of [classes.content, classes.close]) {
      expect(set).not.toMatch(/duration-\d/);
      expect(set).not.toMatch(/duration-\[/);
    }
  });

  it('leaves reduced motion to whichever layer actually owns it', () => {
    // motion-dropdown-in/-out carry their own prefers-reduced-motion block, so a
    // guard on the panel would fight them: the utility keeps a short opacity fade
    // where motion-reduce:transition-none would drop motion entirely.
    expect(classes.content).not.toContain('motion-reduce:transition-none');
    // The close control moves opacity, which no semantic utility covers, so it
    // still needs the guard -- nothing else would disable its fade.
    expect(classes.close).toContain('motion-reduce:transition-none');
  });

  it('the close control honors the touch floor and scales down via CQ', () => {
    expect(classes.close).toContain('h-11');
    expect(classes.close).toContain('@md:h-8');
    expect(classes.closeIcon).toContain('h-5');
    expect(classes.closeIcon).toContain('@md:h-4');
  });
});
