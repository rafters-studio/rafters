import { describe, expect, it } from 'vitest';
import { hoverCard } from '../../../src/components/hover-card/hover-card.behavior';
import { hoverCardClasses } from '../../../src/components/hover-card/hover-card.classes';

const config = {};
const classes = hoverCardClasses(config, hoverCard.initialState(config));

describe('hover-card classes', () => {
  it('the panel sits on the popover depth token, never a raw z-index', () => {
    expect(classes.content).toContain('z-depth-popover');
    expect(classes.content).not.toMatch(/\bz-\d/);
  });

  it('fills with the popover surface tokens (fill, not background props)', () => {
    expect(classes.content).toContain('bg-popover');
    expect(classes.content).toContain('text-popover-foreground');
  });

  it('enters through the semantic motion layer', () => {
    expect(classes.content).toContain('data-[state=open]:motion-dropdown-in');
    expect(classes.content).toContain('data-[state=open]:opacity-100');
  });

  it('supplies a start frame, since the panel mounts on open', () => {
    // A transition has no implicit start value. This panel is created on open,
    // so without @starting-style it arrives already opaque and paints straight
    // through. An animation would not have needed this, which is why the old
    // (undefined) animate-in classes hid the problem.
    expect(classes.content).toContain('starting:opacity-0');
  });

  it('references no animation utility this system does not define', () => {
    for (const dead of [
      'animate-in',
      'fade-in-0',
      'zoom-in-95',
      'slide-in-from-top-2',
      'slide-in-from-bottom-2',
      'slide-in-from-left-2',
      'slide-in-from-right-2',
      'animate-none',
    ]) {
      expect(classes.content).not.toContain(dead);
    }
  });

  it('declares no transform endpoint -- placement owns transform inline', () => {
    // hover-card.behavior.ts:140 writes content.style.transform for placement,
    // and an inline style outranks a class-declared transform. A scale or slide
    // here would resolve and never move anything.
    expect(classes.content).not.toMatch(/\bscale-\d/);
    expect(classes.content).not.toMatch(/\btranslate-/);
  });

  it('ships enter-only: no exit utility while Presence is pending', () => {
    // Without usePresence the content unmounts the instant it closes, so a
    // closed-state utility would resolve and never run.
    expect(classes.content).not.toContain('data-[state=closed]:');
    expect(classes.content).not.toContain('motion-dropdown-out');
  });

  it('the trigger is a bare inline-flex anchor', () => {
    expect(classes.trigger).toBe('inline-flex');
  });
});
