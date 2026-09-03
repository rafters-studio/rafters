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

  it('state-swap: each glyph recedes until its data-state (only one shows at a time)', () => {
    const classes = classesFor({});
    // Opacity + scale, never `hidden`/`block`: `display` cannot transition, and
    // the indicator row assigns a duration, a curve and an extent (#2276).
    for (const glyph of [classes.check, classes.dash]) {
      expect(glyph).toContain('opacity-0');
      expect(glyph).toContain('scale-0');
      expect(glyph.split(/\s+/)).not.toContain('hidden');
    }
    expect(classes.check).toContain('group-data-[state=checked]:opacity-100');
    expect(classes.dash).toContain('group-data-[state=indeterminate]:opacity-100');
    // Stacked in one grid cell, so both being painted costs no layout.
    expect(classes.check).toContain('col-start-1 row-start-1');
    expect(classes.dash).toContain('col-start-1 row-start-1');
    expect(classesFor({}).root).toContain('inline-grid');
  });

  it('the root consumes its colour row and its press row (#2276)', () => {
    const root = classesFor({}).root;
    // root / unchecked <-> checked -- color -- duration-moderate, ease-standard
    expect(root).toContain('duration-moderate');
    expect(root).toContain('ease-standard');
    // root / press -- zoom + color -- duration-micro, ease-spring-snappy, extent-press
    expect(root).toContain('active:extent-press');
    expect(root).toContain('active:scale-(--rafters-consumed-extent)');
    expect(root).toContain('active:duration-micro');
    expect(root).toContain('active:ease-spring-snappy');
    // `scale` and not `transform`: Tailwind v4 writes the individual property.
    expect(root).toContain('transition-[color,background-color,border-color,scale]');
    // The law lives on the token leaves; a component-level escape fights it.
    expect(root).not.toContain('motion-reduce:');
  });

  it('the indicator consumes its swap row and the check-sequence delay (#2276)', () => {
    const classes = classesFor({});
    for (const glyph of [classes.check, classes.dash]) {
      // indicator / unchecked <-> checked -- duration-fast, ease-standard, extent-draw
      expect(glyph).toContain('transition-[opacity,scale]');
      expect(glyph).toContain('duration-fast');
      expect(glyph).toContain('ease-standard');
      expect(glyph).toContain('extent-draw');
      expect(glyph).toContain('scale-(--rafters-consumed-extent)');
      // root/indicator / check sequence -- delay-choreo-step, on the way IN only.
      expect(glyph).toContain('delay-choreo-step');
      expect(glyph).not.toContain('motion-reduce:');
    }
  });
});
