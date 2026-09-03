/**
 * Classes parity test: the view is pure class strings keyed by config/state.
 * Asserts orientation drives the container layout, the item carries the base
 * radio classes plus the `group` marker, and the indicator dot hides while its
 * item is unchecked -- the same class contract all three performances paint.
 */
import { describe, expect, it } from 'vitest';
import {
  radioGroup,
  type RadioGroupConfig,
} from '../../../src/components/radio-group/radio-group.behavior';
import { radioGroupClasses } from '../../../src/components/radio-group/radio-group.classes';

function classesFor(config: RadioGroupConfig) {
  return radioGroupClasses(config, radioGroup.initialState(config));
}

describe('radio-group classes', () => {
  it('vertical orientation lays the group out as a grid', () => {
    expect(classesFor({ orientation: 'vertical' }).root).toBe('grid gap-2');
  });

  it('the default (no orientation) is vertical', () => {
    expect(classesFor({}).root).toBe('grid gap-2');
  });

  it('horizontal orientation lays the group out as a flex row', () => {
    expect(classesFor({ orientation: 'horizontal' }).root).toBe('flex gap-2');
  });

  it('the item carries the base radio classes and the group marker', () => {
    const item = classesFor({}).item;
    expect(item).toContain('rounded-full');
    expect(item).toContain('border-primary');
    expect(item).toContain('focus-visible:ring-ring');
    expect(item).toContain('disabled:opacity-50');
    // The `group` marker is what lets the indicator hide off the item's state.
    expect(item.split(/\s+/)).toContain('group');
  });

  it('the indicator is a filled dot that recedes while the item is unchecked', () => {
    const indicator = classesFor({}).indicator;
    expect(indicator).toContain('rounded-full');
    expect(indicator).toContain('bg-current');
    // Opacity + scale, never `hidden`: `display` cannot transition, and the
    // indicator row assigns a duration, a curve and an extent (#2297).
    expect(indicator).toContain('group-data-[state=unchecked]:opacity-0');
    expect(indicator.split(/\s+/)).not.toContain('group-data-[state=unchecked]:hidden');
  });

  it('the indicator consumes its swap row, extent on the ABSENT state (#2297)', () => {
    const indicator = classesFor({}).indicator;
    // indicator / unchecked <-> checked -- duration-fast, ease-standard, extent-pop
    expect(indicator).toContain('transition-[opacity,scale]');
    expect(indicator).toContain('duration-fast');
    expect(indicator).toContain('ease-standard');
    // `pop` is the scale a thing enters FROM, so it sits on unchecked.
    expect(indicator).toContain('group-data-[state=unchecked]:extent-pop');
    expect(indicator).toContain('group-data-[state=unchecked]:scale-(--rafters-consumed-extent)');
    expect(indicator).not.toContain('motion-reduce:');
  });

  it('the item consumes its colour row and claims no press moment (#2297)', () => {
    const item = classesFor({}).item;
    // item / unchecked <-> checked -- color -- duration-moderate, ease-standard
    expect(item).toContain('transition-colors');
    expect(item).toContain('duration-moderate');
    expect(item).toContain('ease-standard');
    expect(item).not.toContain('motion-reduce:');
    // radio-group has no press row, unlike checkbox/switch/toggle/toggle-group.
    expect(item).not.toContain('active:');
  });
});
