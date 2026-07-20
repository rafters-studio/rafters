import { describe, expect, it } from 'vitest';
import { labelClasses } from '../../../src/components/label/label.classes';
import { fieldBehavior } from '../../../src/components/field/field.behavior';
import {
  composeFieldLabelClasses,
  fieldClassSet,
} from '../../../src/components/field/field.classes';

const classes = fieldClassSet({}, fieldBehavior.initialState({}));

describe('field classes', () => {
  it('stacks its parts with structural layout, never a page fill', () => {
    expect(classes.container).toContain('flex');
    expect(classes.container).toContain('flex-col');
    expect(classes.container).not.toContain('bg-background');
  });

  it('helper and error share the body-text role token, never a raw text size', () => {
    expect(classes.description).toContain('text-body-small');
    expect(classes.error).toContain('text-body-small');
    expect(classes.description).not.toContain('text-sm');
    expect(classes.error).not.toContain('text-sm');
  });

  it('colours helper and error off the frozen semantic tokens', () => {
    expect(classes.description).toContain('text-muted-foreground');
    expect(classes.error).toContain('text-destructive');
    expect(classes.requiredMarker).toContain('text-destructive');
  });

  it('reuses the Label score decoration for the label (never a parallel map)', () => {
    // The un-dimmed label IS the Label score's default decoration.
    expect(composeFieldLabelClasses(false)).toBe(labelClasses({}, {}).root);
  });

  it('adds the disabled dim only when disabled, and only as an opacity affordance', () => {
    const enabled = composeFieldLabelClasses(false);
    const disabled = composeFieldLabelClasses(true);
    expect(enabled).not.toContain('opacity-50');
    expect(disabled).toContain('opacity-50');
    expect(disabled.startsWith(enabled)).toBe(true);
  });
});
