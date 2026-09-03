import { describe, expect, it } from 'vitest';
import { toggle, type ToggleConfig } from '../../../src/components/toggle/toggle.behavior';
import { toggleClasses, toggleVariants } from '../../../src/components/toggle/toggle.classes';

const base: ToggleConfig = { variant: 'default', size: 'default', toggle: true };

function classesFor(config: ToggleConfig) {
  return toggleClasses(config, toggle.initialState(config));
}

describe('toggle classes', () => {
  it('projects variant and size classes', () => {
    const classes = classesFor({ ...base, variant: 'destructive', size: 'lg' });
    expect(classes.root).toContain('data-[state=on]:bg-destructive');
    expect(classes.root).toContain('h-11');
  });

  it('the pressed fill rides data-[state=on] (the state-swap motion axis)', () => {
    const classes = classesFor(base);
    expect(classes.root).toContain('data-[state=on]:bg-primary');
    expect(classes.root).toContain('bg-transparent');
  });

  const sizes: Array<[ToggleConfig['size'], string]> = [
    ['default', 'h-10'],
    ['sm', 'h-9'],
    ['lg', 'h-11'],
  ];
  for (const [size, heightClass] of sizes) {
    it(`${size}: ${heightClass}`, () => {
      expect(classesFor({ ...base, size }).root).toContain(heightClass);
    });
  }

  it('soft-disable dimming rides aria-disabled, not pointer-events removal', () => {
    const classes = classesFor(base);
    expect(classes.root).toContain('aria-disabled:opacity-50');
    expect(classes.root).not.toContain('pointer-events-none');
  });

  it('motion is the state row and the press row, composed as generics (#2309)', () => {
    const classes = classesFor(base);
    // root / off <-> on -- color -- duration-moderate, ease-standard
    expect(classes.root).toContain('transition-[color,background-color,border-color,scale]');
    expect(classes.root).toContain('duration-moderate');
    expect(classes.root).toContain('ease-standard');
    // root / press -- zoom + color -- duration-micro, ease-spring-snappy, extent-press
    expect(classes.root).toContain('active:extent-press');
    expect(classes.root).toContain('active:scale-(--rafters-consumed-extent)');
    expect(classes.root).toContain('active:duration-micro');
    expect(classes.root).toContain('active:ease-spring-snappy');
    // The reduced-motion law lives on the token leaves; a component-level escape
    // fights it, so there is no guard here to find.
    expect(classes.root).not.toContain('motion-reduce:');
  });

  it('toggleVariants matches the root projection', () => {
    expect(toggleVariants({ variant: 'destructive', size: 'lg' })).toBe(
      classesFor({ ...base, variant: 'destructive', size: 'lg' }).root,
    );
    expect(toggleVariants()).toBe(classesFor(base).root);
  });
});
