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
    expect(classes.content).toContain('data-[state=open]:animate-scale-in-moderate-enter');
    expect(classes.item).toContain('data-[highlighted]:bg-accent');
    expect(classes.value).toContain('data-[empty]:text-muted-foreground');
  });

  it('content runs the two anchored-popup CELLS, not the tailwindcss-animate vocabulary', () => {
    // motion.jsonl: select / content / closed -> open (moderate, enter, extent
    // pop) and open -> closed (fast, exit, extent pop). `animate-in` /
    // `animate-out` / `fade-in-0` / `zoom-in-95` came from tailwindcss-animate,
    // which this repo does not ship, so they compiled to nothing at all.
    expect(classes.content).toContain('data-[state=closed]:animate-scale-out-fast-exit');
    for (const dead of ['animate-in', 'animate-out', 'fade-in-0', 'zoom-in-95', 'zoom-out-95']) {
      expect(classes.content).not.toContain(dead);
    }
    expect(classes.content).not.toContain('motion-reduce:animate-none');
  });

  it('the trigger carries the trigger/hover row: color, fast, standard', () => {
    // motion.jsonl: select / trigger / hover -- color, duration-fast,
    // ease-standard. box-shadow stays in the property list so the focus ring
    // keeps transitioning; `transition-duration` is per element, so both share
    // the one tier the matrix actually assigns.
    expect(classes.trigger).toContain(
      'transition-[box-shadow,color,background-color,border-color]',
    );
    expect(classes.trigger).toContain('duration-fast');
    expect(classes.trigger).toContain('ease-standard');
    expect(classes.trigger).toContain('hover:border-input-hover');
    // The ring's old `duration-micro` was an analogy borrowed from input /
    // root / focus, not an assignment, and it is gone on purpose. Restoring it
    // alongside duration-fast would put two duration longhands on one element
    // and silently retune the hover row the matrix does assign.
    expect(classes.trigger).not.toContain('duration-micro');
  });

  it('the chevron carries its rotate row: moderate, standard, structural 180deg', () => {
    expect(classes.chevron).toContain('transition-transform');
    expect(classes.chevron).toContain('duration-moderate');
    expect(classes.chevron).toContain('ease-standard');
  });

  it('items carry the highlight-move row, and the selected check swaps on the indicator', () => {
    // highlight move: color, micro, standard (proposed).
    expect(classes.item).toContain('transition-colors');
    expect(classes.item).toContain('duration-micro');
    expect(classes.item).toContain('ease-standard');
    // selected check: swap, micro, standard (proposed). The check glyph mounts
    // and unmounts, so the swap rides the always-present indicator box, scoped
    // to the item's own named group rather than the trigger's bare one.
    expect(classes.item).toContain('group/item');
    expect(classes.itemIndicator).toContain('opacity-0');
    expect(classes.itemIndicator).toContain('group-data-[state=checked]/item:opacity-100');
    expect(classes.itemIndicator).toContain('duration-micro');
    expect(classes.itemIndicator).toContain('ease-standard');
  });

  it('items carry the enter row: the stagger delay, no duration, no curve', () => {
    // motion.jsonl: select / items / enter assigns `delay-stagger-step` with
    // `duration: {"kind":"none"}` -- no DURATION assigned, not no assignment.
    // The delay generic is the whole row, and it resolves to 0ms at the
    // efficient intent: that zero is the assignment rather than a gap.
    expect(classes.item).toContain('delay-stagger-step');
  });

  it('no literal duration, delay or easing value appears anywhere', () => {
    for (const value of Object.values(classes)) {
      expect(value).not.toMatch(/\b(duration|delay)-\[?\d/);
      expect(value).not.toMatch(/\bease-(in|out|in-out|linear-\d)/);
    }
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
