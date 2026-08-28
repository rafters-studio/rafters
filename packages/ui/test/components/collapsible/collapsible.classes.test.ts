import { describe, expect, it } from 'vitest';
import { collapsible } from '../../../src/components/collapsible/collapsible.behavior';
import { collapsibleClasses } from '../../../src/components/collapsible/collapsible.classes';

const config = {};
const classes = collapsibleClasses(config, collapsible.initialState(config));

describe('collapsible classes', () => {
  it('the trigger has hover feedback and a token focus ring', () => {
    expect(classes.trigger).toContain('hover:bg-muted');
    expect(classes.trigger).toContain('focus-visible:ring-ring');
    expect(classes.trigger).toContain('ring-offset-background');
  });

  it('the trigger dims and blocks interaction while disabled', () => {
    expect(classes.trigger).toContain('disabled:opacity-50');
    expect(classes.trigger).toContain('disabled:cursor-not-allowed');
    expect(classes.trigger).toContain('disabled:pointer-events-none');
  });

  it('the content clips its region and declares the height-axis motion intent', () => {
    expect(classes.content).toContain('overflow-hidden');
    expect(classes.content).toContain('transition-all');
    expect(classes.content).toContain('duration-moderate');
  });

  it('motion respects reduced-motion on both the trigger and the content', () => {
    expect(classes.trigger).toContain('motion-reduce:transition-none');
    expect(classes.content).toContain('motion-reduce:transition-none');
  });

  it('carries no raw color, spacing or z-index utilities', () => {
    for (const value of Object.values(classes)) {
      expect(value).not.toMatch(/\bz-\d/);
      expect(value).not.toMatch(/\bbg-\[/);
      expect(value).not.toMatch(/\btext-\[/);
    }
  });
});
