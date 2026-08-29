import { describe, expect, it } from 'vitest';
import { select } from '../../../src/components/select/select.behavior';
import { selectClasses } from '../../../src/components/select/select.classes';

const config = {};
const classes = selectClasses(config, select.initialState(config));

describe('select classes', () => {
  it('the listbox sits on the dropdown depth token', () => {
    expect(classes.content).toContain('z-depth-dropdown');
  });

  it('the trigger honors the touch floor and scales down via CQ', () => {
    expect(classes.trigger).toContain('h-11');
    expect(classes.trigger).toContain('@md:h-9');
    expect(classes.trigger).not.toContain('sm:');
  });

  it('state-dependent looks key off projected attributes', () => {
    expect(classes.chevron).toContain('group-data-[state=open]:rotate-180');
    expect(classes.content).toContain('data-[state=open]:animate-in');
    expect(classes.item).toContain('data-[highlighted]:bg-accent');
    expect(classes.value).toContain('data-[empty]:text-muted-foreground');
  });

  it('disabled looks key off the projected data-disabled and native disabled', () => {
    expect(classes.trigger).toContain('data-[disabled]:opacity-50');
    expect(classes.trigger).toContain('disabled:opacity-50');
    expect(classes.item).toContain('data-[disabled]:pointer-events-none');
  });

  it('motion respects reduced-motion everywhere it animates', () => {
    for (const value of [classes.trigger, classes.chevron]) {
      expect(value).toContain('motion-reduce:transition-none');
    }
  });
});
