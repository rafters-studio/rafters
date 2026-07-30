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
    expect(classes.content).toContain('data-[state=open]:motion-dropdown-in');
    expect(classes.item).toContain('data-[highlighted]:bg-accent');
    expect(classes.value).toContain('data-[empty]:text-muted-foreground');
  });

  it('disabled looks key off the projected data-disabled and native disabled', () => {
    expect(classes.trigger).toContain('data-[disabled]:opacity-50');
    expect(classes.trigger).toContain('disabled:opacity-50');
    expect(classes.item).toContain('data-[disabled]:pointer-events-none');
  });

  it('enter and exit run through the semantic motion layer', () => {
    expect(classes.content).toContain('data-[state=open]:motion-dropdown-in');
    expect(classes.content).toContain('data-[state=closed]:motion-dropdown-out');
    expect(classes.trigger).toContain('motion-focus');
    expect(classes.chevron).toContain('motion-toggle');
  });

  it('states both transition endpoints, including the start frame', () => {
    // A transition has no implicit start. The listbox is present-but-hidden and
    // comes back out of display:none with the open state already applied, so
    // without @starting-style there is nothing to interpolate from.
    expect(classes.content).toContain('starting:opacity-0');
    expect(classes.content).toContain('starting:scale-95');
    expect(classes.content).toContain('data-[state=open]:opacity-100');
    expect(classes.content).toContain('data-[state=closed]:opacity-0');
    expect(classes.content).toContain('data-[state=open]:scale-100');
  });

  it('references no animation utility this system does not define', () => {
    for (const dead of [
      'animate-in',
      'animate-out',
      'fade-in-0',
      'fade-out-0',
      'zoom-in-95',
      'zoom-out-95',
    ]) {
      expect(classes.content).not.toContain(dead);
    }
  });

  it('writes no raw duration anywhere', () => {
    for (const value of Object.values(classes)) {
      expect(value).not.toMatch(/duration-\d/);
      expect(value).not.toMatch(/duration-\[\d/);
    }
  });

  it('leaves reduced motion to whichever layer owns each element', () => {
    // motion-focus carries no prefers-reduced-motion block, so the trigger still
    // needs the guard. motion-toggle carries one that drops transform while
    // keeping colour, so a guard on the chevron would override it with nothing.
    expect(classes.trigger).toContain('motion-reduce:transition-none');
    expect(classes.chevron).not.toContain('motion-reduce:transition-none');
  });
});
