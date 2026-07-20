import { describe, expect, it } from 'vitest';
import {
  sliderBehavior,
  type SliderConfig,
  type SliderSize,
} from '../../../src/components/slider/slider.behavior';
import { sliderClasses, sliderVariants } from '../../../src/components/slider/slider.classes';

const base: SliderConfig = {
  variant: 'default',
  size: 'default',
  min: 0,
  max: 100,
  step: 1,
  orientation: 'horizontal',
};

function classesFor(config: SliderConfig) {
  return sliderClasses(config, sliderBehavior.initialState(config));
}

describe('slider classes', () => {
  it('root carries the flex shape and the data-disabled dimming baseline', () => {
    const { root } = classesFor(base);
    expect(root).toContain('relative');
    expect(root).toContain('flex');
    expect(root).toContain('data-[disabled]:opacity-50');
    expect(root).toContain('w-full');
  });

  it('vertical root stacks the column', () => {
    expect(classesFor({ ...base, orientation: 'vertical' }).root).toContain('flex-col');
  });

  it('track carries the rail shape and clips the range fill', () => {
    const { track } = classesFor(base);
    expect(track).toContain('rounded-full');
    expect(track).toContain('overflow-hidden');
    expect(track).toContain('bg-muted');
  });

  const trackSizes: Array<[SliderSize, string]> = [
    ['sm', 'data-[orientation=horizontal]:h-1'],
    ['default', 'data-[orientation=horizontal]:h-2'],
    ['lg', 'data-[orientation=horizontal]:h-3'],
  ];
  for (const [size, cls] of trackSizes) {
    it(`${size}: track height ${cls}`, () => {
      expect(classesFor({ ...base, size }).track).toContain(cls);
    });
  }

  it('range fill tracks the variant', () => {
    expect(classesFor(base).range).toContain('bg-primary');
    expect(classesFor({ ...base, variant: 'destructive' }).range).toContain('bg-destructive');
    expect(classesFor({ ...base, variant: 'success' }).range).toContain('bg-success');
  });

  it('thumb carries border, ring, and motion; border + ring track the variant', () => {
    const { thumb } = classesFor({ ...base, variant: 'destructive' });
    expect(thumb).toContain('rounded-full');
    expect(thumb).toContain('border-2');
    expect(thumb).toContain('transition-all');
    expect(thumb).toContain('motion-reduce:transition-none');
    expect(thumb).toContain('border-destructive');
    expect(thumb).toContain('focus-visible:ring-destructive-ring');
  });

  const thumbSizes: Array<[SliderSize, string]> = [
    ['sm', 'h-4 w-4'],
    ['default', 'h-5 w-5'],
    ['lg', 'h-6 w-6'],
  ];
  for (const [size, dims] of thumbSizes) {
    it(`${size}: thumb dimensions ${dims}`, () => {
      expect(classesFor({ ...base, size }).thumb).toContain(dims);
    });
  }

  it('sliderVariants matches the thumb projection', () => {
    expect(sliderVariants({ variant: 'destructive', size: 'lg' })).toBe(
      classesFor({ ...base, variant: 'destructive', size: 'lg' }).thumb,
    );
    expect(sliderVariants()).toBe(classesFor(base).thumb);
  });
});
