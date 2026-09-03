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
    expect(classes.description).toContain('ts-body-small');
    expect(classes.error).toContain('ts-body-small');
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

  it('the message rows stay UNCONSUMED, and the gap is the finding (#2286)', () => {
    // field / message / appear|disappear want `fade + reveal (y)` keyframes at
    // fast/enter and fast/exit. Three things block them, all recorded in
    // field.classes.ts: `animate-fade-in-fast-enter` is not in the emitted set,
    // no reveal shape exists in any tier or curve, and the message node unmounts
    // with no presence wiring, so an exit keyframe could never play.
    //
    // This pins the ABSENCE. A future edit that reaches for the nearest existing
    // name -- `animate-fade-in-fast-standard`, whose curve the row does not
    // assign -- fails here rather than shipping an invented assignment.
    for (const part of [classes.container, classes.description, classes.error]) {
      expect(part).not.toContain('animate-');
      expect(part).not.toContain('duration-');
      expect(part).not.toContain('motion-reduce:');
    }
  });
});
