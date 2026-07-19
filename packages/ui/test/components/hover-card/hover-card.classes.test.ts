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

  it('carries the enter-only fade+zoom intent and respects reduced motion', () => {
    expect(classes.content).toContain('data-[state=open]:animate-in');
    expect(classes.content).toContain('data-[state=open]:fade-in-0');
    expect(classes.content).toContain('data-[state=open]:zoom-in-95');
    expect(classes.content).toContain('motion-reduce:animate-none');
  });

  it('ships enter-only: no exit (closed-state) animation while Presence is pending', () => {
    expect(classes.content).not.toContain('data-[state=closed]:animate-out');
    expect(classes.content).not.toContain('data-[state=closed]:fade-out-0');
    expect(classes.content).not.toContain('data-[state=closed]:zoom-out-95');
  });

  it('the trigger is a bare inline-flex anchor', () => {
    expect(classes.trigger).toBe('inline-flex');
  });
});
