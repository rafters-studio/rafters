import { describe, expect, it } from 'vitest';
import { tooltip } from '../../../src/components/tooltip/tooltip.behavior';
import { tooltipClasses } from '../../../src/components/tooltip/tooltip.classes';

const config = {};
const classes = tooltipClasses(config, tooltip.initialState(config));

describe('tooltip classes', () => {
  it('the tip sits on the tooltip depth token, never a raw z-index', () => {
    expect(classes.content).toContain('z-depth-tooltip');
    expect(classes.content).not.toMatch(/\bz-\d/);
  });

  it('fills with the inverted foreground surface (fill, not background props)', () => {
    expect(classes.content).toContain('bg-foreground');
    expect(classes.content).toContain('text-background');
  });

  it('carries the fade intent and respects reduced motion', () => {
    expect(classes.content).toContain('transition-opacity');
    expect(classes.content).toContain('motion-reduce:transition-none');
    expect(classes.content).toContain('data-[state=open]:opacity-100');
    expect(classes.content).toContain('data-[state=closed]:opacity-0');
  });

  it('the trigger is a bare inline flex anchor', () => {
    expect(classes.trigger).toBe('inline-flex');
  });
});
