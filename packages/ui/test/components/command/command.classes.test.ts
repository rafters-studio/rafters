import { describe, expect, it } from 'vitest';
import { command } from '../../../src/components/command/command.behavior';
import { commandClasses } from '../../../src/components/command/command.classes';

const config = {};
const classes = commandClasses(config, command.initialState(config));

describe('command classes', () => {
  it('the palette surface fills, never backgrounds, and clips its rounded corners', () => {
    expect(classes.root).toContain('bg-popover');
    expect(classes.root).toContain('overflow-hidden');
  });

  it('the active option keys off the projected data-selected attribute', () => {
    expect(classes.item).toContain('data-[selected]:bg-accent');
    expect(classes.item).toContain('data-[selected]:text-accent-foreground');
  });

  it('a disabled option keys off the projected data-disabled attribute', () => {
    expect(classes.item).toContain('data-[disabled]:pointer-events-none');
    expect(classes.item).toContain('data-[disabled]:opacity-50');
  });

  it('the input honors the touch floor and scales down via the container query', () => {
    expect(classes.input).toContain('h-11');
    expect(classes.input).toContain('@md:h-10');
    expect(classes.input).not.toContain('sm:');
  });

  it('the option color transition respects reduced motion', () => {
    expect(classes.item).toContain('transition-colors');
    expect(classes.item).toContain('motion-reduce:transition-none');
  });

  it('the dialog surfaces sit on the overlay and modal depth tokens', () => {
    expect(classes.dialogBackdrop).toContain('z-depth-overlay');
    expect(classes.dialogContent).toContain('z-depth-modal');
  });

  it('items consume the stagger-step delay generic (#2156, motion.jsonl:66)', () => {
    // delay-stagger-step is the generated consumption of the items/enter cell;
    // no nth-child multiplier is expressible in this file (see the itemClasses
    // comment) so it is applied once, flat, across the item collection.
    expect(classes.item).toContain('delay-stagger-step');
  });
});
