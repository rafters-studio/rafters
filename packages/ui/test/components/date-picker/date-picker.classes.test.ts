import { describe, expect, it } from 'vitest';
import { datePicker } from '../../../src/components/date-picker/date-picker.behavior';
import { datePickerClasses } from '../../../src/components/date-picker/date-picker.classes';

const config = { mode: 'single' } as const;
const classes = datePickerClasses(config, datePicker.initialState(config));

describe('date-picker classes', () => {
  it('parity: the same class set for every mode and state (selection, not construction)', () => {
    const range = { mode: 'range', disabled: true, defaultOpen: true } as const;
    expect(datePickerClasses(range, datePicker.initialState(range))).toEqual(classes);
  });

  it('the popup sits on the popover depth token and fills with popover surface tokens', () => {
    expect(classes.content).toContain('z-depth-popover');
    expect(classes.content).toContain('bg-popover');
    expect(classes.content).toContain('text-popover-foreground');
    expect(classes.content).toContain('p-0');
  });

  it('the trigger honors the touch floor, scaling down through the container query', () => {
    expect(classes.trigger).toContain('h-11');
    expect(classes.trigger).toContain('@md:h-9');
  });

  it('state looks key off the projected attributes', () => {
    expect(classes.value).toContain('data-[empty]:text-muted-foreground');
    expect(classes.trigger).toContain('disabled:opacity-50');
    expect(classes.trigger).toContain('data-[disabled]:opacity-50');
    expect(classes.trigger).toContain('focus-visible:ring-ring');
  });

  it('the content fades and zooms on the generics its rows assign, keyed off data-state (#2282)', () => {
    // motion.jsonl: date-picker / content / closed -> open is moderate + enter,
    // open -> closed is fast + exit, both fade + zoom with extent pop. The
    // closed pose is the base (the exit row); the open pose owns the enter row.
    const content = classes.content.split(' ');
    for (const closed of [
      'opacity-0',
      'pointer-events-none',
      'extent-pop',
      'scale-(--rafters-consumed-extent)',
      'transition',
      'duration-fast',
      'ease-exit',
    ]) {
      expect(content).toContain(closed);
    }
    for (const open of [
      'data-[state=open]:opacity-100',
      'data-[state=open]:scale-100',
      'data-[state=open]:pointer-events-auto',
      'data-[state=open]:duration-moderate',
      'data-[state=open]:ease-enter',
    ]) {
      expect(content).toContain(open);
    }
    // Out of flow while closed: the part stays present, so it must not hold
    // layout under the trigger before the first open positions it.
    expect(content).toContain('fixed');
  });

  it('names only the generics the rows assign: no literals, keyframes or bracketed lists', () => {
    for (const value of Object.values(classes)) {
      expect(value).not.toContain('animate-');
      expect(value).not.toContain('transition-[');
      expect(value).not.toContain('transition-all');
      expect(value).not.toMatch(/\b(duration|delay)-\d/);
      expect(value).not.toContain('ease-[');
      expect(value).not.toContain('motion-');
      expect(value).not.toContain('motion-reduce:');
      expect(value).not.toMatch(/\bdelay-/);
    }
    // The trigger has no row: its hover border and focus ring stay instant.
    expect(classes.trigger).not.toMatch(
      /\b(transition|duration|ease)\b|\b(transition|duration|ease)-/,
    );
  });

  it('semantic tokens only: no arbitrary values, no named colors, no raw z-index', () => {
    for (const value of Object.values(classes)) {
      // Attribute variants (data-[empty]:) are selectors; an arbitrary VALUE is
      // a bracket after a utility dash (w-[..], bg-[..]) or a var().
      expect(value.replace(/data-\[[^\]]+\]:/g, '')).not.toContain('[');
      expect(value).not.toContain('var(');
      expect(value).not.toMatch(/\bz-\d/);
      expect(value).not.toMatch(/-(red|blue|green|gray|slate|zinc|neutral|white|black)\b/);
    }
  });
});
