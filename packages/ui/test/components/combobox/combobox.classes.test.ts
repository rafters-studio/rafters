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

  it('reduced motion is the token sheet, never a component-level escape', () => {
    // INVERTED, not deleted. This once asserted input and chevron carried
    // `motion-reduce:transition-none`. They do not: the generated duration and
    // delay utilities zero themselves under prefers-reduced-motion
    // (REDUCED_MOTION_ZEROED), so a component-level media query is redundant --
    // tooltip.classes.ts states the rule.
    for (const value of Object.values(classes)) {
      expect(value).not.toContain('motion-reduce');
    }
  });

  it('content runs the two anchored-popup CELLS, keyed off data-state', () => {
    // motion.jsonl: combobox / content / closed -> open (moderate, enter,
    // extent pop) and open -> closed (fast, exit, extent pop). Content declared
    // no motion at all before this, on the stale claim that the semantic
    // dropdown tokens were "not yet generated"; those thirteen were deleted.
    expect(classes.content).toContain('data-[state=open]:animate-scale-in-moderate-enter');
    expect(classes.content).toContain('data-[state=closed]:animate-scale-out-fast-exit');
    expect(classes.content).not.toContain('motion-reduce:animate-none');
  });

  it('items carry the highlight-move row, and the selected check swaps on the indicator', () => {
    // highlight move: color, micro, standard (proposed).
    expect(classes.item).toContain('transition-colors');
    expect(classes.item).toContain('duration-micro');
    expect(classes.item).toContain('ease-standard');
    // selected check: swap, micro, standard (proposed). The check glyph mounts
    // and unmounts, so the swap rides the always-present indicator box, scoped
    // to the item's own named group rather than the root's bare one.
    expect(classes.item).toContain('group/item');
    expect(classes.itemIndicator).toContain('opacity-0');
    expect(classes.itemIndicator).toContain('group-data-[state=checked]/item:opacity-100');
    expect(classes.itemIndicator).toContain('duration-micro');
    expect(classes.itemIndicator).toContain('ease-standard');
  });

  it('the items enter row is selected on their container, not on the items', () => {
    // motion.jsonl: combobox / items / enter assigns `delay-stagger-step` per
    // POSITION; the content selects the generated `stagger-items` ladder
    // (#2189). The items carry no delay, so the highlight never waits (#2413).
    expect(classes.content.split(/\s+/)).toContain('stagger-items');
    expect(classes.item).not.toContain('delay-stagger-step');
  });

  it('selects the ladder, never constructs it (00-boundaries.md Sec 6)', () => {
    for (const value of Object.values(classes)) {
      expect(value).not.toContain('calc(');
      expect(value).not.toContain('nth-child');
      expect(value).not.toContain('[animation-delay');
    }
  });

  it('declares no raw numeric duration or hand-picked easing', () => {
    for (const value of Object.values(classes)) {
      expect(value).not.toMatch(/duration-\[?\d/);
      expect(value).not.toContain('ease-[');
      // tailwindcss-animate's vocabulary is not a dependency of this repo.
      expect(value).not.toContain('animate-in');
      expect(value).not.toContain('zoom-in');
    }
  });
});
