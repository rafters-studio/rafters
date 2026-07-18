import { describe, expect, it } from 'vitest';
import { checkbox, type CheckboxConfig } from '../../../src/components/checkbox/checkbox.behavior';
import { checkboxClasses } from '../../../src/components/checkbox/checkbox.classes';

function classesFor(config: CheckboxConfig) {
  return checkboxClasses(config, checkbox.initialState(config));
}

describe('checkbox classes', () => {
  it('projects variant fill for both the checked and indeterminate states', () => {
    const classes = classesFor({ variant: 'destructive' });
    expect(classes.root).toContain('data-[state=checked]:bg-destructive');
    expect(classes.root).toContain('data-[state=indeterminate]:bg-destructive');
    expect(classes.root).toContain('border-destructive');
    expect(classes.root).toContain('focus-visible:ring-destructive-ring');
  });

  it('defaults to the primary/default variant', () => {
    expect(classesFor({}).root).toContain('border-primary');
    expect(classesFor({}).root).toContain('data-[state=checked]:bg-primary');
  });

  const sizes: Array<[CheckboxConfig['size'], string, string]> = [
    ['sm', 'h-3.5 w-3.5', 'h-2.5 w-2.5'],
    ['default', 'h-4 w-4', 'h-3 w-3'],
    ['lg', 'h-5 w-5', 'h-4 w-4'],
  ];
  for (const [size, box, icon] of sizes) {
    it(`${size}: box ${box}, icon ${icon}`, () => {
      const classes = classesFor({ size });
      expect(classes.root).toContain(box);
      expect(classes.check).toContain(icon);
      expect(classes.dash).toContain(icon);
    });
  }

  it('the box carries a group hook and the disabled dimming for both disabled axes', () => {
    const root = classesFor({}).root;
    expect(root).toContain('group');
    expect(root).toContain('disabled:opacity-50');
    expect(root).toContain('data-[disabled]:opacity-50');
  });

  it('state-swap: each glyph is hidden until its data-state (only one shows at a time)', () => {
    const classes = classesFor({});
    expect(classes.check).toContain('hidden');
    expect(classes.check).toContain('group-data-[state=checked]:block');
    expect(classes.dash).toContain('hidden');
    expect(classes.dash).toContain('group-data-[state=indeterminate]:block');
  });
});
