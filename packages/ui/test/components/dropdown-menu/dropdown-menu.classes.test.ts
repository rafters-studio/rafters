import { describe, expect, it } from 'vitest';
import { dropdownMenu } from '../../../src/components/dropdown-menu/dropdown-menu.behavior';
import { dropdownMenuClasses } from '../../../src/components/dropdown-menu/dropdown-menu.classes';

const config = {};
const classes = dropdownMenuClasses(config, dropdownMenu.initialState(config));

describe('dropdown-menu classes', () => {
  it('the menu sits on the dropdown depth token and fills popover, not a raw color', () => {
    expect(classes.content).toContain('z-depth-dropdown');
    expect(classes.content).toContain('bg-popover');
    expect(classes.content).toContain('text-popover-foreground');
  });

  it('the active item look keys off :focus (roving-focus current item), not a data-highlighted axis', () => {
    expect(classes.item).toContain('focus:bg-accent');
    expect(classes.item).toContain('focus:text-accent-foreground');
    expect(classes.item).not.toContain('data-[highlighted]');
  });

  it('disabled looks key off the projected data-disabled', () => {
    expect(classes.item).toContain('data-[disabled]:pointer-events-none');
    expect(classes.item).toContain('data-[disabled]:opacity-50');
  });

  it('the separator fills muted, the label uses a semantic text token', () => {
    expect(classes.separator).toContain('bg-muted');
    expect(classes.label).toContain('ts-label-medium');
  });

  it('enter/exit are the dropdown-menu CELLS, keyed off data-state (#1996 / #2017)', () => {
    // motion.jsonl: dropdown-menu / content / closed -> open is moderate +
    // enter, open -> closed is fast + exit. The assignments match popover's
    // today and the cells stay SEPARATE anyway -- the matrix declares two
    // moments, and a shared name would drag one when the other is retuned.
    expect(classes.content).toContain('data-[state=open]:animate-dropdown-menu-content-open');
    expect(classes.content).toContain('data-[state=closed]:animate-dropdown-menu-content-close');
    expect(classes.content).not.toContain('animate-scale-in');
    expect(classes.content).not.toContain('animate-scale-out');
  });

  it('motion respects reduced-motion, and does NOT do it with animate-none', () => {
    // Mechanism B (#2017): zeroed inside the generated utility. animate-none
    // would reset the shorthand, discard the zeroed duration, and leave the
    // element short of the keyframe's end state.
    expect(classes.content).not.toContain('motion-reduce:animate-none');
  });

  it('no hand-rolled animation vocabulary and no raw durations', () => {
    // The oracle's animate-in/zoom/fade/slide + duration-N string is the
    // prohibited hand-rolled form (05-authoring, MOTION.md). See the doc.
    for (const value of Object.values(classes)) {
      expect(value).not.toContain('animate-in');
      expect(value).not.toContain('animate-out');
      expect(value).not.toContain('zoom-in');
      expect(value).not.toContain('fade-in');
      expect(value).not.toContain('slide-in');
      expect(value).not.toMatch(/duration-\d/);
    }
  });
});
