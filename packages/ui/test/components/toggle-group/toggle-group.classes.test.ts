/**
 * Classes parity test: the view is pure class strings keyed by config/state.
 * Asserts orientation drives the container layout, the default variant carries
 * the muted chrome, and each item carries the base + size + variant classes with
 * data-[state=on] pressed styling -- the same class contract all three
 * performances paint.
 */
import { describe, expect, it } from 'vitest';
import {
  toggleGroup,
  type ToggleGroupConfig,
} from '../../../src/components/toggle-group/toggle-group.behavior';
import { toggleGroupClasses } from '../../../src/components/toggle-group/toggle-group.classes';

function classesFor(config: ToggleGroupConfig) {
  return toggleGroupClasses(config, toggleGroup.initialState(config));
}

describe('toggle-group root classes', () => {
  it('the default variant carries the muted group chrome', () => {
    const root = classesFor({}).root;
    expect(root).toContain('inline-flex');
    expect(root).toContain('rounded-lg');
    expect(root).toContain('bg-muted');
    expect(root).toContain('p-1');
  });

  it('the outline variant drops the muted chrome', () => {
    const root = classesFor({ variant: 'outline' }).root;
    expect(root).not.toContain('bg-muted');
  });

  it('vertical orientation stacks the group as a column', () => {
    expect(classesFor({ orientation: 'vertical' }).root.split(/\s+/)).toContain('flex-col');
  });

  it('horizontal orientation (default) does not stack', () => {
    expect(classesFor({}).root.split(/\s+/)).not.toContain('flex-col');
  });
});

describe('toggle-group item classes', () => {
  it('the item carries the base toggle classes and the focus ring', () => {
    const item = classesFor({}).item;
    expect(item).toContain('rounded-md');
    expect(item).toContain('focus-visible:ring-ring');
    expect(item).toContain('disabled:opacity-50');
  });

  it('the default size is h-9 px-3; sm and lg override it', () => {
    expect(classesFor({}).item).toContain('h-9 px-3');
    expect(classesFor({ size: 'sm' }).item).toContain('h-8 px-2');
    expect(classesFor({ size: 'lg' }).item).toContain('h-10 px-4');
  });

  it('the default variant drives pressed styling off data-[state=on]', () => {
    const item = classesFor({}).item;
    expect(item).toContain('data-[state=on]:bg-background');
    expect(item).toContain('data-[state=on]:text-foreground');
  });

  it('the outline variant is bordered and presses to the accent', () => {
    const item = classesFor({ variant: 'outline' }).item;
    expect(item).toContain('border-input');
    expect(item).toContain('data-[state=on]:bg-accent');
    expect(item).toContain('data-[state=on]:text-accent-foreground');
  });
});
