import { describe, expect, it } from 'vitest';
import { combobox } from '../../../src/components/combobox/combobox.behavior';
import { comboboxClasses } from '../../../src/components/combobox/combobox.classes';

const config = {};
const classes = comboboxClasses(config, combobox.initialState(config));

describe('combobox classes', () => {
  it('the listbox sits on the dropdown depth token', () => {
    expect(classes.content).toContain('z-depth-dropdown');
  });

  it('the input honors the touch floor and scales down via CQ', () => {
    expect(classes.input).toContain('h-11');
    expect(classes.input).toContain('@md:h-9');
    expect(classes.input).not.toContain('sm:');
  });

  it('state-dependent looks key off projected attributes', () => {
    expect(classes.chevron).toContain('group-data-[state=open]:rotate-180');
    expect(classes.item).toContain('data-[highlighted]:bg-accent');
    expect(classes.item).toContain('data-[disabled]:pointer-events-none');
  });

  it('disabled looks key off the projected data-disabled and native disabled', () => {
    expect(classes.input).toContain('data-[disabled]:opacity-50');
    expect(classes.input).toContain('disabled:opacity-50');
  });

  it('motion respects reduced-motion everywhere it animates', () => {
    for (const value of [classes.input, classes.chevron]) {
      expect(value).toContain('motion-reduce:transition-none');
    }
  });

  it('declares no raw numeric duration or hand-picked easing (motion token gap)', () => {
    for (const value of Object.values(classes)) {
      expect(value).not.toMatch(/duration-\[?\d/);
      expect(value).not.toContain('ease-[');
      // The dropdown enter/exit token is not generated yet; no animate-in guess.
      expect(value).not.toContain('animate-in');
    }
  });
});
