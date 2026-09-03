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

  it('items carry the highlight-move row: color, micro, standard', () => {
    // motion.jsonl: command / items / highlight move -- duration-micro,
    // ease-standard, marked proposed. `transition-colors` was already here with
    // no tier and no curve, so it ran on Tailwind's built-in 150ms.
    expect(classes.item).toContain('duration-micro');
    expect(classes.item).toContain('ease-standard');
  });

  it('the palette runs its two content CELLS -- fade alone, no zoom', () => {
    // motion.jsonl: command / content / closed -> open (moderate, enter) and
    // open -> closed (fast, exit). Command is the one anchored-popup row that
    // declares no extent-pop, so no scale utility belongs here.
    expect(classes.dialogContent).toContain('data-[state=open]:animate-fade-in-moderate-enter');
    expect(classes.dialogContent).toContain('data-[state=closed]:animate-fade-out-fast-exit');
    expect(classes.dialogContent).not.toContain('scale-');
    expect(classes.dialogContent).not.toContain('motion-reduce:animate-none');
    // The backdrop has no row of its own -- dialog, sheet and drawer each carry
    // an explicit overlay pair and command does not, so nothing is borrowed.
    expect(classes.dialogBackdrop).not.toContain('animate-');
  });

  it('items carry the enter row: the stagger delay, no duration, no curve', () => {
    // motion.jsonl: command / items / enter assigns `delay-stagger-step` with
    // `duration: {"kind":"none"}` -- no DURATION assigned, not no assignment.
    // The delay generic is the whole row, and it resolves to 0ms at the
    // efficient intent: that zero is the assignment rather than a gap.
    expect(classes.item).toContain('delay-stagger-step');
  });

  it('the items / filter change row is reported, never faked', () => {
    // The row wants a fade across a `hidden` toggle, which needs
    // @starting-style -- forbidden by the presence ruling -- and the matrix's
    // own input rule says a filter driven by the user's typing tracks instantly.
    for (const value of Object.values(classes)) {
      expect(value).not.toContain('starting:');
      expect(value).not.toContain('transition-discrete');
    }
  });

  it('declares no raw numeric duration or hand-picked easing', () => {
    for (const value of Object.values(classes)) {
      expect(value).not.toMatch(/\b(duration|delay)-\[?\d/);
      expect(value).not.toContain('ease-[');
      expect(value).not.toContain('animate-in');
    }
  });
});
