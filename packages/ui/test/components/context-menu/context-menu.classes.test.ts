import { describe, expect, it } from 'vitest';
import { contextMenu } from '../../../src/components/context-menu/context-menu.behavior';
import { contextMenuClasses } from '../../../src/components/context-menu/context-menu.classes';

const config = {};
const classes = contextMenuClasses(config, contextMenu.initialState(config));

describe('context-menu classes', () => {
  it('content sits on the dropdown depth and popover surface tokens', () => {
    expect(classes.content).toContain('z-depth-dropdown');
    expect(classes.content).toContain('bg-popover');
    expect(classes.content).toContain('text-popover-foreground');
  });

  it('content enters on the semantic dropdown motion token, driven by data-state', () => {
    expect(classes.content).toContain('motion-dropdown-in');
    expect(classes.content).toContain('opacity-0');
    expect(classes.content).toContain('scale-95');
    expect(classes.content).toContain('data-[state=open]:opacity-100');
    expect(classes.content).toContain('data-[state=open]:scale-100');
  });

  it('items highlight on the semantic focus motion token', () => {
    expect(classes.item).toContain('motion-focus');
    expect(classes.item).toContain('focus:bg-accent');
    expect(classes.item).toContain('data-[disabled]:pointer-events-none');
    expect(classes.item).toContain('data-[disabled]:opacity-50');
  });

  it('checkbox and radio items reserve the indicator gutter', () => {
    expect(classes.checkboxItem).toContain('pl-8');
    expect(classes.radioItem).toContain('pl-8');
    expect(classes.itemIndicator).toContain('absolute');
    expect(classes.radioDot).toContain('rounded-full');
  });

  it('the sub-trigger highlights while its submenu is open', () => {
    expect(classes.subTrigger).toContain('motion-focus');
    expect(classes.subTrigger).toContain('data-[state=open]:bg-accent');
    expect(classes.subTriggerChevron).toContain('ml-auto');
  });

  it('separator, label, and shortcut carry their chrome', () => {
    expect(classes.separator).toContain('bg-muted');
    expect(classes.label).toContain('text-label-medium');
    expect(classes.shortcut).toContain('ml-auto');
  });

  it('declares no raw numeric durations or animate utilities (motion tokens only)', () => {
    for (const value of [classes.content, classes.item, classes.checkboxItem, classes.radioItem]) {
      expect(value).not.toMatch(/duration-\d/);
      expect(value).not.toContain('animate-in');
      expect(value).not.toContain('zoom-in');
    }
  });
});
