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
    expect(thumb).toContain('transition-[left,bottom,background-color,border-color,scale]');
    expect(thumb).toContain('border-destructive');
    expect(thumb).toContain('focus-visible:ring-destructive-ring');
  });

  it('THE POINTER RULE: a dragged thumb is untimed, a stepped one is not (#2304)', () => {
    const { thumb, root, range } = classesFor(base);
    // thumb / keyboard step -- travel -- duration-fast, ease-standard.
    expect(thumb).toContain('duration-fast');
    expect(thumb).toContain('ease-standard');
    // thumb / dragging -- duration {"kind":"pointer-rule"}: while the pointer
    // drives it the thumb tracks the pointer EXACTLY, so the POSITION leaves the
    // transition list -- not the duration, which the grab zoom still needs.
    expect(thumb).toContain(
      'group-data-[dragging=true]:transition-[background-color,border-color,scale]',
    );
    // The flag lives on the root, which must therefore carry the group marker.
    expect(root.split(/\s+/)).toContain('group');
    // range fill / follows thumb -- the row is {"kind":"follows","source":"thumb"},
    // so the fill takes the thumb's tier and the same drag exemption.
    expect(range).toContain('duration-fast');
    expect(range).toContain('ease-standard');
    expect(range).toContain('group-data-[dragging=true]:transition-none');
  });

  it('the grab row replaces the hand-typed press scale (#2304)', () => {
    const { thumb } = classesFor(base);
    // thumb / grab -- zoom -- duration-micro, ease-spring-snappy, extent-press.
    expect(thumb).toContain('active:extent-press');
    expect(thumb).toContain('active:scale-(--rafters-consumed-extent)');
    expect(thumb).toContain('active:duration-micro');
    expect(thumb).toContain('active:ease-spring-snappy');
    expect(thumb).not.toContain('active:scale-105');
    // `hover:scale-110` is a moment the matrix has no row for (its hover row is
    // colour only). Kept as it stands and reported, never given an invented cell.
    expect(thumb).toContain('hover:scale-110');
    expect(thumb).not.toContain('motion-reduce:');
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
