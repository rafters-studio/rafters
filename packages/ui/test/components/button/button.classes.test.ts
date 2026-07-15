import { describe, expect, it } from 'vitest';
import { button, type ButtonConfig } from '../../../src/components/button/button.behavior';
import { buttonClasses, buttonVariants } from '../../../src/components/button/button.classes';

const base: ButtonConfig = { variant: 'default', size: 'default' };

function classesFor(config: ButtonConfig) {
  return buttonClasses(config, button.initialState(config));
}

describe('button classes', () => {
  it('projects variant and size classes', () => {
    const classes = classesFor({ variant: 'destructive', size: 'lg' });
    expect(classes.root).toContain('bg-destructive');
    expect(classes.root).toContain('h-12');
  });

  const cqSizes: Array<[ButtonConfig['size'], string, string]> = [
    ['default', 'h-11', '@md:h-10'],
    ['xs', 'h-11', '@md:h-6'],
    ['sm', 'h-11', '@md:h-8'],
    ['icon', 'h-11', '@md:h-10'],
    ['icon-xs', 'h-11', '@md:h-6'],
    ['icon-sm', 'h-11', '@md:h-8'],
  ];
  for (const [size, touchClass, desktopClass] of cqSizes) {
    it(`${size}: touch-first ${touchClass}, desktop ${desktopClass}`, () => {
      const classes = classesFor({ ...base, size });
      expect(classes.root).toContain(touchClass);
      expect(classes.root).toContain(desktopClass);
    });
  }

  it('lg and icon-lg skip CQ override -- already above touch floor', () => {
    for (const size of ['lg', 'icon-lg'] as const) {
      expect(classesFor({ ...base, size }).root).not.toContain('@md:h-');
    }
  });

  it('spinner scales with CQ', () => {
    const classes = classesFor({ ...base, loading: true });
    expect(classes.spinner).toContain('h-5');
    expect(classes.spinner).toContain('@md:h-4');
  });

  it('buttonVariants matches the root projection', () => {
    expect(buttonVariants({ variant: 'destructive', size: 'lg' })).toBe(
      classesFor({ variant: 'destructive', size: 'lg' }).root,
    );
    expect(buttonVariants()).toBe(classesFor(base).root);
  });
});
