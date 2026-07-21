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
    expect(classes.label).toContain('text-label-medium');
  });

  it('enter/exit and interaction motion are left UNDECLARED (no hand-rolled animation or raw durations)', () => {
    // The semantic motion-dropdown-in/-out tokens are not yet emitted by the
    // token layer; the oracle's animate-in/zoom/fade/slide + duration-N string
    // is the prohibited hand-rolled form (05-authoring, MOTION.md). See the doc.
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
