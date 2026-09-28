import { describe, expect, it } from 'vitest';
import { menubar } from '../../../src/components/menubar/menubar.behavior';
import { menubarClasses } from '../../../src/components/menubar/menubar.classes';

const config = {};
const classes = menubarClasses(config, menubar.initialState(config));

describe('menubar classes', () => {
  it('the bar fills background, not a raw color', () => {
    expect(classes.root).toContain('bg-background');
  });

  it('each menu sits on the dropdown depth token and fills popover, not a raw color', () => {
    expect(classes.content).toContain('z-depth-dropdown');
    expect(classes.content).toContain('bg-popover');
    expect(classes.content).toContain('text-popover-foreground');
  });

  it("the open menu's trigger keys its look off the projected data-state", () => {
    expect(classes.trigger).toContain('data-[state=open]:bg-accent');
    expect(classes.trigger).toContain('data-[state=open]:text-accent-foreground');
  });

  it('the active item look keys off :focus (roving-focus current item), not a data-highlighted axis', () => {
    expect(classes.item).toContain('focus:bg-accent');
    expect(classes.item).toContain('focus:text-accent-foreground');
    expect(classes.item).not.toContain('data-[highlighted]');
  });

  it('disabled looks key off the projected data-disabled', () => {
    for (const item of [classes.item, classes.checkboxItem, classes.radioItem]) {
      expect(item).toContain('data-[disabled]:pointer-events-none');
      expect(item).toContain('data-[disabled]:opacity-50');
    }
  });

  it('the separator fills muted, labels and shortcuts use semantic text tokens', () => {
    expect(classes.separator).toContain('bg-muted');
    expect(classes.label).toContain('ts-label-medium');
    expect(classes.shortcut).toContain('ts-shortcut');
  });

  it('names no motion: #2292 consumes the matrix rows after this port', () => {
    for (const value of Object.values(classes)) {
      for (const token of value.split(/\s+/)) {
        const utility = token.split(':').pop() ?? '';
        expect(utility, token).not.toMatch(/^(transition|duration-|ease-|delay-|animate-)/);
        expect(utility, token).not.toMatch(/^motion-/);
      }
    }
  });

  it('no arbitrary values (classy drops them)', () => {
    for (const value of Object.values(classes)) {
      expect(value).not.toMatch(/-\[[^\]]*\](\s|$)/);
    }
  });
});
