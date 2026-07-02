import { describe, expect, it } from 'vitest';
import { navigationMenu } from '../../../src/components/navigation-menu/navigation-menu.behavior';
import { navigationMenuClasses } from '../../../src/components/navigation-menu/navigation-menu.classes';

const config = {};
const classes = navigationMenuClasses(config, navigationMenu.initialState(config));

describe('navigation-menu classes', () => {
  it('trigger honors the touch floor and scales down via CQ', () => {
    expect(classes.trigger).toContain('h-11');
    expect(classes.trigger).toContain('@md:h-10');
  });

  it('state-dependent looks key off projected attributes', () => {
    expect(classes.trigger).toContain('data-[state=open]:bg-accent-subtle');
    expect(classes.triggerChevron).toContain('group-data-[state=open]:rotate-180');
    expect(classes.link).toContain('data-[active]:bg-accent-subtle');
  });

  it('motion respects reduced-motion everywhere it animates', () => {
    for (const value of [classes.trigger, classes.triggerChevron, classes.link]) {
      expect(value).toContain('motion-reduce:transition-none');
    }
  });
});
