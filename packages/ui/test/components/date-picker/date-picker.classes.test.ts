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

  it('names no motion: date-picker motion is #2282', () => {
    for (const value of Object.values(classes)) {
      expect(value).not.toMatch(/\b(animate|transition|duration|delay|ease)-/);
      expect(value).not.toContain('motion-');
    }
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
